'use strict';

const { createHash } = require('node:crypto');

const CHSLR_TABLES = new Set([
  'profiles',
  'chslr_items',
  'chslr_log',
  'chslr_mesin',
  'chslr_result'
]);
const FILTER_OPERATORS = new Set(['eq', 'neq', 'is', 'ilike']);
const SESSION_COOKIE = 'mtc_session';
const SIGNATURE_BUCKET = 'signatures';
const MAX_SIGNATURE_BYTES = 1024 * 1024;
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(req, name) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;

  for (const part of cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator >= 0 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

function response(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body === null ? undefined : JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_REQUEST_BYTES) {
      const error = new Error('Request too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function parseJson(buffer) {
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }
}

async function authenticatedProfile(pool, req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;

  const result = await pool.query(
    `SELECT p.id, p.full_name, p.divisi, p.jabatan
     FROM public.app_sessions s
     JOIN public.app_users u ON u.profile_id = s.profile_id
     JOIN public.profiles p ON p.id = s.profile_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND u.email_verified_at IS NOT NULL
     LIMIT 1`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
}

function quoteIdentifier(identifier) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error('Invalid database identifier');
  }
  return `"${identifier}"`;
}

async function getColumns(pool, table) {
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Set(result.rows.map((row) => row.column_name));
}

function addFilters(searchParams, columns, values) {
  const clauses = [];
  for (const [key, value] of searchParams) {
    const match = /^(eq|neq|is|ilike)\[([a-z_][a-z0-9_]*)\]$/i.exec(key);
    if (!match) continue;

    const [, operator, column] = match;
    if (!FILTER_OPERATORS.has(operator.toLowerCase()) || !columns.has(column) ||
        (operator.toLowerCase() === 'is' && value !== 'null')) {
      const error = new Error('Unsupported filter');
      error.status = 400;
      throw error;
    }
    if ((operator.toLowerCase() === 'is' || operator.toLowerCase() === 'neq') &&
        value === 'null') {
      clauses.push(`${quoteIdentifier(column)} IS ${operator.toLowerCase() === 'neq' ? 'NOT ' : ''}NULL`);
    } else {
      values.push(value);
      const sqlOperator = { eq: '=', neq: '<>', is: 'IS', ilike: 'ILIKE' }[operator.toLowerCase()];
      clauses.push(`${quoteIdentifier(column)} ${sqlOperator} $${values.length}`);
    }
  }
  return clauses;
}

function parseSelection(value, columns) {
  if (!value || value === '*') return '*';
  const selected = value.split(',').map((column) => column.trim());
  if (selected.some((column) => !columns.has(column))) {
    const error = new Error('Unsupported selected column');
    error.status = 400;
    throw error;
  }
  return selected.map(quoteIdentifier).join(', ');
}

async function handleTableRequest(req, res, pool, url, profile, table) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    response(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH, DELETE' });
    return;
  }

  const role = String(profile.jabatan || '').toUpperCase().trim();
  if (!role || role === 'ADMIN') {
    response(res, 403, { data: null, error: { message: 'This account cannot access CHSLR data' } });
    return;
  }

  const columns = await getColumns(pool, table);
  if (columns.size === 0) {
    response(res, 503, { error: 'CHSLR database table is unavailable' });
    return;
  }

  const values = [];
  const filters = addFilters(url.searchParams, columns, values);
  if (table === 'profiles') {
    if (url.searchParams.has('eq[id]') &&
        url.searchParams.get('eq[id]') !== profile.id) {
      response(res, 403, { data: null, error: { message: 'Profile access denied' } });
      return;
    }
    values.push(profile.id);
    filters.push(`"id" = $${values.length}`);
  }
  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  let result;

  if (req.method === 'GET') {
    const selection = parseSelection(url.searchParams.get('select'), columns);
    let order = '';
    const orderValue = url.searchParams.get('order');
    if (orderValue) {
      const [column, direction = 'asc'] = orderValue.split('.');
      if (!columns.has(column) || !['asc', 'desc'].includes(direction.toLowerCase())) {
        response(res, 400, { error: 'Unsupported ordering' });
        return;
      }
      order = ` ORDER BY ${quoteIdentifier(column)} ${direction.toUpperCase()}`;
    }
    const limitValue = url.searchParams.get('limit');
    let limit = '';
    if (limitValue !== null) {
      const count = Number(limitValue);
      if (!Number.isInteger(count) || count < 0 || count > 1000) {
        response(res, 400, { error: 'Limit must be an integer from 0 to 1000' });
        return;
      }
      values.push(count);
      limit = ` LIMIT $${values.length}`;
    }
    result = await pool.query(
      `SELECT ${selection} FROM public.${quoteIdentifier(table)}${where}${order}${limit}`,
      values
    );
    response(res, 200, { data: result.rows, error: null });
    return;
  }

  if (req.method === 'POST') {
    const body = parseJson(await readBody(req));
    const rows = Array.isArray(body) ? body : [body];
    if (rows.length === 0 || rows.length > 200 ||
        rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
      response(res, 400, { data: null, error: { message: 'Invalid insert payload' } });
      return;
    }

    const rowColumns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    if (rowColumns.length === 0 || rowColumns.some((column) => !columns.has(column))) {
      response(res, 400, { data: null, error: { message: 'Unsupported insert column' } });
      return;
    }
    if (rows.some((row) => {
      const currentColumns = Object.keys(row);
      return currentColumns.length !== rowColumns.length ||
        rowColumns.some((column) => !Object.hasOwn(row, column));
    })) {
      response(res, 400, { data: null, error: { message: 'Insert rows must use the same columns' } });
      return;
    }
    const allowedInsertColumns = table === 'chslr_log' && role.includes('OPERATOR')
      ? new Set(['mesin_id', 'bulan', 'tahun', 'pelaksana_names', 'catatan_pelaksana'])
      : table === 'chslr_result' && role.includes('OPERATOR')
        ? new Set(['log_id', 'item_id', 'tanggal', 'status', 'input_value', 'keterangan', 'signature'])
        : null;
    if (!allowedInsertColumns || rowColumns.some((column) => !allowedInsertColumns.has(column))) {
      response(res, 403, { data: null, error: { message: 'This role cannot insert these CHSLR fields' } });
      return;
    }
    const insertValues = [];
    const placeholders = rows.map((row) => {
      const rowPlaceholders = rowColumns.map((column) => {
        insertValues.push(row[column]);
        return `$${insertValues.length}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    });
    result = await pool.query(
      `INSERT INTO public.${quoteIdentifier(table)} (${rowColumns.map(quoteIdentifier).join(', ')})
       VALUES ${placeholders.join(', ')}
       RETURNING *`,
      insertValues
    );
    response(res, 201, { data: result.rows, error: null });
    return;
  }

  if (req.method === 'PATCH') {
    const body = parseJson(await readBody(req));
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      response(res, 400, { data: null, error: { message: 'Invalid update payload' } });
      return;
    }
    const patchColumns = Object.keys(body);
    if (patchColumns.length === 0 || patchColumns.some((column) => !columns.has(column)) ||
        filters.length === 0) {
      response(res, 400, { data: null, error: { message: 'Update requires valid columns and filters' } });
      return;
    }
    const allowedPatchColumns = table === 'chslr_log' && role.includes('OPERATOR')
      ? new Set(['pelaksana_names', 'catatan_pelaksana'])
      : table === 'chslr_log' && role.includes('SUPERVISOR')
        ? new Set(['koordinator_nama', 'signature_koordinator', 'status_verifikasi', 'remark_koordinator'])
        : table === 'chslr_log' && role.includes('SUPERINTENDENT')
          ? new Set(['superintendent_nama', 'remark_superintendent', 'signature_superintendent', 'status_final'])
          : null;
    if (!allowedPatchColumns || patchColumns.some((column) => !allowedPatchColumns.has(column))) {
      response(res, 403, { data: null, error: { message: 'This role cannot update these CHSLR fields' } });
      return;
    }
    const assignments = patchColumns.map((column) => {
      values.push(body[column]);
      return `${quoteIdentifier(column)} = $${values.length}`;
    });
    result = await pool.query(
      `UPDATE public.${quoteIdentifier(table)}
       SET ${assignments.join(', ')}${where}
       RETURNING *`,
      values
    );
    response(res, 200, { data: result.rows, error: null });
    return;
  }

  if (req.method === 'DELETE') {
    if (table !== 'chslr_result' || !role.includes('OPERATOR')) {
      response(res, 403, { data: null, error: { message: 'This role cannot delete CHSLR records' } });
      return;
    }
    if (filters.length === 0) {
      response(res, 400, { data: null, error: { message: 'Delete requires filters' } });
      return;
    }
    result = await pool.query(
      `DELETE FROM public.${quoteIdentifier(table)}${where} RETURNING *`,
      values
    );
    response(res, 200, { data: result.rows, error: null });
    return;
  }

  response(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH, DELETE' });
}

async function handleSignatureRequest(req, res, pool, profile, url, key) {
  if (req.method === 'GET') {
    const result = await pool.query(
      `SELECT content_type, file_data
       FROM public.app_signature_files
       WHERE bucket = $1 AND object_key = $2
       LIMIT 1`,
      [SIGNATURE_BUCKET, key]
    );
    const file = result.rows[0];
    if (!file) {
      response(res, 404, { error: 'Signature not found' });
      return;
    }
    const data = Buffer.isBuffer(file.file_data) ? file.file_data : Buffer.from(file.file_data);
    res.writeHead(200, {
      'Content-Type': file.content_type,
      'Content-Length': data.length,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(data);
    return;
  }

  if (req.method === 'POST') {
    if (req.headers['content-type'] !== 'image/png') {
      response(res, 415, { error: 'Only PNG signatures are accepted' });
      return;
    }
    const data = await readBody(req);
    if (data.length < 8 || data.length > MAX_SIGNATURE_BYTES ||
        !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      response(res, 400, { error: 'Invalid or oversized PNG signature' });
      return;
    }
    const result = await pool.query(
      `INSERT INTO public.app_signature_files
         (bucket, object_key, profile_id, content_type, file_data)
       VALUES ($1, $2, $3, 'image/png', $4)
       ON CONFLICT (bucket, object_key) DO NOTHING
       RETURNING object_key`,
      [SIGNATURE_BUCKET, key, profile.id, data]
    );
    if (result.rows.length === 0) {
      response(res, 409, { error: 'Signature already exists' });
      return;
    }
    response(res, 201, { data: { path: key }, error: null });
    return;
  }

  response(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
}

async function handleChslrRequest(req, res, pool) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/data/') && !url.pathname.startsWith('/api/storage/')) {
    return false;
  }

  let profile;
  try {
    profile = await authenticatedProfile(pool, req);
  } catch (error) {
    console.error('CHSLR session lookup failed:', error.message);
    response(res, 503, { error: 'Session check is temporarily unavailable' });
    return true;
  }
  if (!profile) {
    response(res, 401, { error: 'Not authenticated' });
    return true;
  }

  try {
    if (url.pathname.startsWith('/api/data/')) {
      const table = decodeURIComponent(url.pathname.slice('/api/data/'.length));
      if (!CHSLR_TABLES.has(table)) {
        response(res, 404, { data: null, error: { message: 'Table is not available in the CHSLR API' } });
        return true;
      }
      await handleTableRequest(req, res, pool, url, profile, table);
      return true;
    }

    const match = /^\/api\/storage\/([^/]+)\/([^/]+)$/.exec(url.pathname);
    if (!match || match[1] !== SIGNATURE_BUCKET || !/^[A-Za-z0-9._-]{1,120}$/.test(match[2])) {
      response(res, 404, { error: 'Not found' });
      return true;
    }
    await handleSignatureRequest(req, res, pool, profile, url, match[2]);
    return true;
  } catch (error) {
    if (error.status) {
      response(res, error.status, { data: null, error: { message: error.message } });
      return true;
    }
    console.error('CHSLR PostgreSQL request failed:', error.message);
    response(res, 503, { data: null, error: { message: 'Database request failed' } });
    return true;
  }
}

module.exports = { handleChslrRequest };
