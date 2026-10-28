'use strict';

const { createHash } = require('node:crypto');

const DATA_TABLES = new Set([
  'profiles',
  'chslr_items',
  'chslr_log',
  'chslr_mesin',
  'chslr_result',
  'clhmi',
  'clhmi_machine',
  'clhmi_items',
  'clhmi_results',
  'clpm_items',
  'clpm_log',
  'clpm_result',
  'jpdo_approval',
  'jpdo_approval_manager',
  'jpdo_approval_ppc',
  'jpdo_approval_produksi',
  'jpdo_log',
  'jpdo_result',
  'kartu_riwayat_items',
  'Lkmr_result',
  'lkmr_repair',
  'pmi_header',
  'pmi_item_fields',
  'pmi_items',
  'pmi_machines',
  'pmi_results',
  'pmw_log',
  'pmw_reports',
  'pohm_items',
  'pohm_log',
  'pohm_machine',
  'ppw_log',
  'prslb_items',
  'prslb_log',
  'prslb_mesin',
  'prslb_result'
]);
const FILTER_OPERATORS = new Set(['eq', 'neq', 'is', 'ilike', 'gte', 'lte', 'lt', 'gt', 'in']);
const RELATIONS = {
  clhmi: {
    clhmi_machine: {
      foreignKey: 'machine_id',
      referencedKey: 'id',
      cardinality: 'one'
    }
  },
  clhmi_machine: {
    clhmi: {
      foreignKey: 'id',
      referencedKey: 'machine_id',
      cardinality: 'many'
    }
  },
  clhmi_items: {
    clhmi_results: {
      foreignKey: 'id',
      referencedKey: 'item_id',
      cardinality: 'many'
    }
  },
  clhmi_results: {
    clhmi_items: {
      foreignKey: 'item_id',
      referencedKey: 'id',
      cardinality: 'one'
    }
  },
  clpm_log: {
    clpm_result: {
      foreignKey: 'id',
      referencedKey: 'log_id',
      cardinality: 'many'
    }
  },
  clpm_result: {
    clpm_log: {
      foreignKey: 'log_id',
      referencedKey: 'id',
      cardinality: 'one'
    }
  },
  jpdo_log: {
    jpdo_result: {
      foreignKey: 'id',
      referencedKey: 'log_id',
      cardinality: 'many'
    }
  },
  jpdo_result: {
    jpdo_log: {
      foreignKey: 'log_id',
      referencedKey: 'id',
      cardinality: 'one'
    }
  },
  pmi_header: {
    pmi_machines: {
      foreignKey: 'machine_id',
      referencedKey: 'id',
      cardinality: 'one'
    },
    pmi_results: {
      foreignKey: 'id',
      referencedKey: 'pmi_header_id',
      cardinality: 'many'
    }
  },
  pmi_machines: {
    pmi_header: {
      foreignKey: 'id',
      referencedKey: 'machine_id',
      cardinality: 'many'
    }
  },
  pmi_items: {
    pmi_item_fields: {
      foreignKey: 'id',
      referencedKey: 'pmi_item_id',
      cardinality: 'many'
    },
    pmi_results: {
      foreignKey: 'id',
      referencedKey: 'pmi_item_id',
      cardinality: 'many'
    }
  },
  pmi_item_fields: {
    pmi_items: {
      foreignKey: 'pmi_item_id',
      referencedKey: 'id',
      cardinality: 'one'
    },
    pmi_results: {
      foreignKey: 'id',
      referencedKey: 'pmi_item_field_id',
      cardinality: 'many'
    }
  },
  pmi_results: {
    pmi_header: {
      foreignKey: 'pmi_header_id',
      referencedKey: 'id',
      cardinality: 'one'
    },
    pmi_items: {
      foreignKey: 'pmi_item_id',
      referencedKey: 'id',
      cardinality: 'one'
    },
    pmi_item_fields: {
      foreignKey: 'pmi_item_field_id',
      referencedKey: 'id',
      cardinality: 'one'
    }
  },
  pohm_items: {
    pohm_log: {
      foreignKey: 'id',
      referencedKey: 'item_id',
      cardinality: 'many'
    }
  },
  pohm_log: {
    pohm_items: {
      foreignKey: 'item_id',
      referencedKey: 'id',
      cardinality: 'one'
    }
  },
  prslb_mesin: {
    prslb_log: {
      foreignKey: 'nama_mesin',
      referencedKey: 'mesin_id',
      cardinality: 'many'
    }
  },
  prslb_log: {
    prslb_mesin: {
      foreignKey: 'mesin_id',
      referencedKey: 'nama_mesin',
      cardinality: 'one'
    },
    prslb_result: {
      foreignKey: 'id',
      referencedKey: 'log_id',
      cardinality: 'many'
    }
  },
  prslb_result: {
    prslb_log: {
      foreignKey: 'log_id',
      referencedKey: 'id',
      cardinality: 'one'
    },
    prslb_items: {
      foreignKey: 'item_id',
      referencedKey: 'id',
      cardinality: 'one'
    }
  },
  prslb_items: {
    prslb_result: {
      foreignKey: 'id',
      referencedKey: 'item_id',
      cardinality: 'many'
    }
  }
};
const WRITE_POLICIES = {
  chslr_log: {
    POST: [{ roles: ['OPERATOR'], columns: ['mesin_id', 'bulan', 'tahun', 'pelaksana_names', 'catatan_pelaksana'] }],
    PATCH: [
      { roles: ['OPERATOR'], columns: ['pelaksana_names', 'catatan_pelaksana'] },
      { roles: ['SUPERVISOR'], columns: ['koordinator_nama', 'signature_koordinator', 'status_verifikasi', 'remark_koordinator'] },
      { roles: ['SUPERINTENDENT'], columns: ['superintendent_nama', 'remark_superintendent', 'signature_superintendent', 'status_final'] }
    ]
  },
  chslr_result: {
    POST: [{ roles: ['OPERATOR'], columns: ['log_id', 'item_id', 'tanggal', 'status', 'input_value', 'keterangan', 'signature'] }],
    DELETE: [{ roles: ['OPERATOR'], columns: [] }]
  },
  clhmi: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['machine_id', 'merk_mesin', 'serial_no', 'pelaksana', 'paraf', 'status_form', 'tanggal_isi', 'bulan', 'tahun', 'catatan_pelaksana', 'tonage']
    }],
    PATCH: [
      { roles: ['SUPERVISOR', 'KOORDINATOR'], columns: ['paraf_coord', 'status_form', 'catatan_umum'] },
      { roles: ['SUPERINTENDENT'], columns: ['status_form', 'verified_by', 'catatan_super', 'paraf_super'] }
    ]
  },
  clhmi_results: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['clhmi_id', 'item_id', 'item_kode', 'status', 'value', 'temperature_oli', 'catatan_item', 'pelaksana']
    }]
  },
  clpm_log: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['kode_mold', 'tanggal_perawatan', 'produk', 'material_mold', 'type_mold', 'tanggal_akhir_shot', 'pic_perawatan', 'paraf_operator']
    }],
    PATCH: [
      { roles: ['SUPERVISOR'], columns: ['nama_spv', 'catatan_spv', 'paraf_spv', 'tanggal_validasi_spv'] },
      { roles: ['SUPERINTENDENT'], columns: ['nama_superintendent', 'catatan_superintendent', 'paraf_superintendent', 'tanggal_validasi_superintendent'] }
    ]
  },
  clpm_result: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['log_id', 'no_item', 'item_check', 'standart', 'kondisi', 'catatan', 'catatan_kondisi_mould']
    }]
  },
  jpdo_log: {
    POST: [{
      roles: ['SUPERVISOR'],
      columns: ['tanggal', 'status_hari', 'nama_supervisor', 'nama_mesin', 'nama_pic', 'tanda_tangan']
    }]
  },
  jpdo_result: {
    POST: [{ roles: ['SUPERVISOR'], columns: ['log_id', 'plan_status', 'actual_status'] }]
  },
  jpdo_approval: {
    POST: [{ roles: ['SUPERINTENDENT'], columns: ['bulan', 'nama_superintendent', 'catatan_superintendent', 'tanda_tangan_superintendent'] }]
  },
  jpdo_approval_manager: {
    POST: [{ roles: ['MANAGER'], columns: ['bulan', 'nama_manager', 'catatan_manager', 'tanda_tangan_manager'] }]
  },
  jpdo_approval_ppc: {
    POST: [{ roles: ['PPC'], columns: ['bulan', 'nama_ppc', 'catatan_ppc', 'tanda_tangan_ppc'] }]
  },
  jpdo_approval_produksi: {
    POST: [{ roles: ['PRODUKSI'], columns: ['bulan', 'nama_produksi', 'catatan_produksi', 'tanda_tangan_produksi'] }]
  },
  kartu_riwayat_items: {
    POST: [{
      roles: ['PIC', 'OPERATOR'],
      columns: ['no_mesin', 'lokasi_mesin', 'tahun_pembuatan', 'machine_name', 'entry_date', 'problem_desc', 'action_taken', 'spare_parts', 'remarks', 'pic_name', 'pic_signature']
    }],
    PATCH: [
      { roles: ['SUPERVISOR'], columns: ['spv_name', 'spv_signature', 'spv_note'] },
      { roles: ['SUPERINTENDENT'], columns: ['superintendent_name', 'superintendent_signature', 'superintendent_note'] }
    ]
  },
  Lkmr_result: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['tanggal', 'bulan', 'shift', 'pic', 'jenis_problem', 'deskripsi_masalah', 'waktu_mulai', 'waktu_selesai', 'target_waktu_pm', 'nama_mesin']
    }],
    PATCH: [{ roles: ['SUPERINTENDENT'], columns: ['feedback', 'superintendent_name', 'status'] }]
  },
  lkmr_repair: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['tanggal', 'shift', 'pic', 'nama_mold', 'code_mold', 'tipe_mold', 'jenis_problem', 'deskripsi_masalah', 'waktu_mulai', 'waktu_selesai', 'target_waktu_pm']
    }],
    PATCH: [{ roles: ['SUPERINTENDENT'], columns: ['feedback', 'superintendent_name', 'status'] }]
  },
  pmi_header: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['machine_id', 'nama_pelaksana', 'tanggal', 'tahun', 'target_selesai', 'start_jam', 'finish_jam', 'running_hours', 'signature_pelaksana', 'status_verifikasi']
    }],
    PATCH: [
      { roles: ['SUPERVISOR', 'KOORDINATOR'], columns: ['nama_koordinator', 'catatan_koordinator', 'signature_koordinator', 'status_verifikasi', 'verified_at'] },
      { roles: ['SUPERINTENDENT'], columns: ['nama_superintendent', 'signature_superintendent', 'catatan_superintendent', 'status_verifikasi'] }
    ]
  },
  pmi_results: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['pmi_header_id', 'pmi_item_id', 'pmi_item_field_id', 'status', 'nilai_aktual', 'keterangan']
    }]
  },
  pmw_log: {
    POST: [{ roles: ['OPERATOR'], columns: ['tanggal', 'mesin', 'pic', 'ttd_operator'] }],
    PATCH: [
      { roles: ['SUPERVISOR'], columns: ['spv_name', 'ttd_spv'] },
      { roles: ['SUPERINTENDENT'], columns: ['supt_name', 'ttd_supt'] }
    ]
  },
  pmw_reports: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['catatan', 'mesin', 'dept', 'tanggal', 'prosedur_preventive', 'standart', 'kondisi', 'action_text']
    }]
  },
  pohm_items: {
    POST: [{
      roles: ['ENGINEER'],
      columns: ['machine_name', 'work_type', 'start_time', 'end_time', 'problem_desc', 'action_taken', 'spare_parts', 'recommendations', 'engineer_name', 'engineer_signature']
    }],
    PATCH: [
      { roles: ['SUPERVISOR', 'SUPERINTENDENT'], columns: ['spv_name', 'spv_signature'] },
      { roles: ['MANAGER'], columns: ['manager_name', 'manager_signature'] }
    ]
  },
  pohm_log: {
    POST: [{ roles: ['ENGINEER'], columns: ['item_id', 'engineer_status', 'engineer_note'] }],
    PATCH: [
      { roles: ['SUPERVISOR', 'SUPERINTENDENT'], columns: ['spv_status', 'spv_note', 'manager_status'] },
      { roles: ['MANAGER'], columns: ['manager_status', 'manager_note'] }
    ]
  },
  ppw_log: {
    POST: [{
      roles: ['SUPERVISOR'],
      columns: [
        'nama_operator', 'status_hasil', 'qc_check', 'keterangan', 'nama_spv',
        'catatan_akhir', 'ttd_spv', 'bagian', 'tanggal', 'nama_part', 'job_desc',
        'estimasi_waktu'
      ]
    }],
    PATCH: [
      { roles: ['OPERATOR'], columns: ['waktu_mulai', 'waktu_selesai', 'nama_operator', 'keterangan', 'status_hasil'] },
      { roles: ['SUPERINTENDENT'], columns: ['nama_superintendent', 'catatan_superintendent', 'ttd_superintendent', 'status_approval'] }
    ]
  },
  prslb_log: {
    POST: [{
      roles: ['OPERATOR'],
      columns: ['mesin_id', 'pelaksana_nama', 'signature_pelaksana', 'start_jam', 'finish_jam', 'running_hours', 'target_selesai']
    }],
    PATCH: [
      { roles: ['SUPERVISOR', 'KOORDINATOR'], columns: ['koordinator_nama', 'koordinator_note', 'status_verifikasi', 'signature_koordinator'] },
      { roles: ['SUPERINTENDENT'], columns: ['superintendent_nama', 'superintendent_note', 'status_final', 'signature_superintendent', 'updated_at'] }
    ]
  },
  prslb_result: {
    POST: [{ roles: ['OPERATOR'], columns: ['log_id', 'item_id', 'status', 'keterangan'] }],
    PATCH: [{ roles: ['SUPERVISOR', 'KOORDINATOR'], columns: ['status_koordinator', 'keterangan_koordinator'] }]
  }
};
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

function qualifiedColumn(table, column) {
  return `${quoteIdentifier(table)}.${quoteIdentifier(column)}`;
}

function addFilters(searchParams, table, columns, values) {
  const clauses = [];
  for (const [key, value] of searchParams) {
    const match = /^(eq|neq|is|ilike|gte|lte|lt|gt|in)\[([a-z_][a-z0-9_]*)\]$/i.exec(key);
    if (!match) {
      if (key === 'or') {
        clauses.push(addOrFilter(value, table, columns, values));
      }
      continue;
    }

    const [, operator, column] = match;
    if (!FILTER_OPERATORS.has(operator.toLowerCase()) || !columns.has(column) ||
        (operator.toLowerCase() === 'is' && value !== 'null')) {
      const error = new Error('Unsupported filter');
      error.status = 400;
      throw error;
    }
    if (operator.toLowerCase() === 'in') {
      const entries = /^\((.*)\)$/.exec(value)?.[1]
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (!entries || entries.length === 0 || entries.length > 200) {
        const error = new Error('Invalid in-filter');
        error.status = 400;
        throw error;
      }
      const placeholders = entries.map((entry) => {
        values.push(entry);
        return `$${values.length}`;
      });
      clauses.push(`${qualifiedColumn(table, column)} IN (${placeholders.join(', ')})`);
    } else if ((operator.toLowerCase() === 'is' || operator.toLowerCase() === 'neq') &&
        value === 'null') {
      clauses.push(`${qualifiedColumn(table, column)} IS ${operator.toLowerCase() === 'neq' ? 'NOT ' : ''}NULL`);
    } else {
      values.push(value);
      const sqlOperator = {
        eq: '=', neq: '<>', is: 'IS', ilike: 'ILIKE',
        gte: '>=', lte: '<=', lt: '<', gt: '>'
      }[operator.toLowerCase()];
      clauses.push(`${qualifiedColumn(table, column)} ${sqlOperator} $${values.length}`);
    }
  }
  return clauses;
}

function addOrFilter(value, table, columns, values) {
  const terms = splitTopLevel(value);
  if (!terms || terms.length < 1 || terms.length > 20) {
    const error = new Error('Invalid OR filter');
    error.status = 400;
    throw error;
  }
  let conditionCount = 0;
  const expression = `(${terms.map((term) =>
    parseFilterExpression(term, table, columns, values, 0, () => {
      conditionCount += 1;
      if (conditionCount > 200) {
        const error = new Error('Invalid OR filter');
        error.status = 400;
        throw error;
      }
    })
  ).join(' OR ')})`;
  return expression;
}

function splitTopLevel(value, separator = ',') {
  const parts = [];
  let depth = 0;
  let start = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === '\\') {
        index += 1;
        continue;
      }
      if (character === quote) {
        if (value[index + 1] === quote) {
          index += 1;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    if (depth < 0) return null;
    if (character === separator && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (depth !== 0 || quote) return null;
  parts.push(value.slice(start).trim());
  return parts;
}

function parseFilterExpression(value, table, columns, values, depth, countCondition) {
  if (depth > 8 || value.length > 4000) {
    const error = new Error('OR filter is too complex');
    error.status = 400;
    throw error;
  }

  const group = /^(and|or)\((.*)\)$/i.exec(value);
  if (group) {
    const terms = splitTopLevel(group[2]);
    if (!terms || terms.length < 1 || terms.length > 20) {
      const error = new Error('Invalid OR filter');
      error.status = 400;
      throw error;
    }
    const operator = group[1].toLowerCase() === 'and' ? ' AND ' : ' OR ';
    return `(${terms.map((term) =>
      parseFilterExpression(term, table, columns, values, depth + 1, countCondition)
    ).join(operator)})`;
  }

  const match = /^([a-z_][a-z0-9_]*)\.(eq|neq|is|ilike|gte|lte|lt|gt)\.(.*)$/i.exec(value);
  if (!match || !columns.has(match[1]) || !match[3]) {
    const error = new Error('Unsupported OR filter');
    error.status = 400;
    throw error;
  }

  countCondition();
  const [, column, operatorValue] = match;
  const operator = operatorValue.toLowerCase();
  let filterValue = match[3];
  if ((filterValue.startsWith('"') && filterValue.endsWith('"')) ||
      (filterValue.startsWith("'") && filterValue.endsWith("'"))) {
    filterValue = filterValue.slice(1, -1).replace(/\\(["'])/g, '$1');
  }
  if (operator === 'is' && filterValue === 'null') {
    return `${qualifiedColumn(table, column)} IS NULL`;
  }
  if (operator === 'neq' && filterValue === 'null') {
    return `${qualifiedColumn(table, column)} IS NOT NULL`;
  }
  values.push(filterValue);
  const sqlOperator = {
    eq: '=', neq: '<>', is: 'IS', ilike: 'ILIKE',
    gte: '>=', lte: '<=', lt: '<', gt: '>'
  }[operator];
  return `${qualifiedColumn(table, column)} ${sqlOperator} $${values.length}`;
}

function relationSubquery(relation, alias, config, parentAlias, jsonObject) {
  const from = ` FROM public.${quoteIdentifier(relation)} AS ${quoteIdentifier(alias)}`;
  const where = ` WHERE ${qualifiedColumn(alias, config.referencedKey)} = ` +
    qualifiedColumn(parentAlias, config.foreignKey);
  if (config.cardinality === 'many') {
    return `(SELECT COALESCE(jsonb_agg(related_rows.relation_data), '[]'::jsonb) ` +
      `FROM (SELECT ${jsonObject} AS relation_data${from}${where}) AS related_rows)`;
  }
  return `(SELECT ${jsonObject}${from}${where} LIMIT 1)`;
}

async function buildJsonSelection(pool, table, alias, value, depth = 0) {
  if (depth > 4) {
    const error = new Error('Related selection is too deep');
    error.status = 400;
    throw error;
  }
  const columns = await getColumns(pool, table);
  const parts = splitTopLevel(value || '*');
  if (!parts) {
    const error = new Error('Unsupported selected column');
    error.status = 400;
    throw error;
  }
  const expressions = [];
  for (const part of parts) {
    const relationMatch = /^([a-z_][a-z0-9_]*)\((.*)\)$/i.exec(part);
    if (!relationMatch) {
      if (part === '*') {
        for (const column of columns) {
          expressions.push(`'${column}', ${qualifiedColumn(alias, column)}`);
        }
      } else {
        if (!columns.has(part)) {
          const error = new Error('Unsupported selected column');
          error.status = 400;
          throw error;
        }
        expressions.push(`'${part}', ${qualifiedColumn(alias, part)}`);
      }
      continue;
    }

    const [, relation, relationColumnsValue] = relationMatch;
    const relationConfig = RELATIONS[table]?.[relation];
    if (!relationConfig) {
      const error = new Error('Unsupported related table selection');
      error.status = 400;
      throw error;
    }
    const relationAlias = `r${depth}_${relation}`;
    const relationSelection = await buildJsonSelection(
      pool,
      relation,
      relationAlias,
      relationColumnsValue,
      depth + 1
    );
    const jsonObject = `jsonb_build_object(${relationSelection})`;
    const relationValue = relationSubquery(
      relation,
      relationAlias,
      relationConfig,
      alias,
      jsonObject
    );
    expressions.push(`'${relation}', ${relationValue}`);
  }
  return expressions.join(', ');
}

async function parseSelection(pool, table, value, columns) {
  if (!value || value === '*') return '*';
  const parts = splitTopLevel(value);
  if (!parts) {
    const error = new Error('Unsupported selected column');
    error.status = 400;
    throw error;
  }
  const expressions = [];
  for (const part of parts) {
    const relationMatch = /^([a-z_][a-z0-9_]*)\((.*)\)$/i.exec(part);
    if (part === '*') {
      expressions.push(`${quoteIdentifier(table)}.*`);
    } else if (relationMatch) {
      const [, relation] = relationMatch;
      const relationConfig = RELATIONS[table]?.[relation];
      if (!relationConfig) {
        const error = new Error('Unsupported related table selection');
        error.status = 400;
        throw error;
      }
      const relationAlias = `r0_${relation}`;
      const relationSelection = await buildJsonSelection(
        pool,
        relation,
        relationAlias,
        relationMatch[2]
      );
      const jsonObject = `jsonb_build_object(${relationSelection})`;
      const relationValue = relationSubquery(
        relation,
        relationAlias,
        relationConfig,
        table,
        jsonObject
      );
      expressions.push(`${relationValue} AS ${quoteIdentifier(relation)}`);
    } else {
      if (!columns.has(part)) {
        const error = new Error('Unsupported selected column');
        error.status = 400;
        throw error;
      }
      expressions.push(qualifiedColumn(table, part));
    }
  }
  return expressions.join(', ');
}

function policyAllows(table, method, role, columns) {
  const policies = WRITE_POLICIES[table]?.[method] || [];
  return policies.some((policy) =>
    policy.roles.some((requiredRole) => role.includes(requiredRole)) &&
    columns.every((column) => policy.columns.includes(column))
  );
}

async function handleTableRequest(req, res, pool, url, profile, table) {
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    response(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH, DELETE' });
    return;
  }

  const role = String(profile.jabatan || '').toUpperCase().trim();
  if (!role || role === 'ADMIN') {
    response(res, 403, { data: null, error: { message: 'This account cannot access checklist data' } });
    return;
  }

  const columns = await getColumns(pool, table);
  if (columns.size === 0) {
    response(res, 503, {
      data: null,
      error: { message: 'Checklist database table is unavailable to the API role' }
    });
    return;
  }

  const values = [];
  const filters = addFilters(url.searchParams, table, columns, values);
  if (table === 'profiles') {
    if (url.searchParams.has('eq[id]') &&
        url.searchParams.get('eq[id]') !== profile.id) {
      response(res, 403, { data: null, error: { message: 'Profile access denied' } });
      return;
    }
    values.push(profile.id);
    filters.push(`${qualifiedColumn(table, 'id')} = $${values.length}`);
  }
  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  let result;

  if (req.method === 'GET') {
    const selection = await parseSelection(
      pool,
      table,
      url.searchParams.get('select'),
      columns
    );
    const orderClauses = [];
    for (const orderValue of url.searchParams.getAll('order')) {
      for (const orderPart of orderValue.split(',')) {
        const [column, direction = 'asc'] = orderPart.split('.');
        if (!columns.has(column) || !['asc', 'desc'].includes(direction.toLowerCase())) {
          response(res, 400, { error: 'Unsupported ordering' });
          return;
        }
        orderClauses.push(`${qualifiedColumn(table, column)} ${direction.toUpperCase()}`);
      }
    }
    let order = '';
    if (orderClauses.length) {
      if (orderClauses.length > 10) {
        response(res, 400, { error: 'Too many ordering columns' });
        return;
      }
      order = ` ORDER BY ${orderClauses.join(', ')}`;
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
      `SELECT ${selection} FROM public.${quoteIdentifier(table)} AS ${quoteIdentifier(table)}${where}${order}${limit}`,
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
    if (!policyAllows(table, 'POST', role, rowColumns)) {
      response(res, 403, { data: null, error: { message: 'This role cannot insert these checklist fields' } });
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
    if (!policyAllows(table, 'PATCH', role, patchColumns)) {
      response(res, 403, { data: null, error: { message: 'This role cannot update these checklist fields' } });
      return;
    }
    const assignments = patchColumns.map((column) => {
      values.push(body[column]);
      return `${quoteIdentifier(column)} = $${values.length}`;
    });
    result = await pool.query(
      `UPDATE public.${quoteIdentifier(table)} AS ${quoteIdentifier(table)}
       SET ${assignments.join(', ')}${where}
       RETURNING *`,
      values
    );
    response(res, 200, { data: result.rows, error: null });
    return;
  }

  if (req.method === 'DELETE') {
    if (!policyAllows(table, 'DELETE', role, [])) {
      response(res, 403, { data: null, error: { message: 'This role cannot delete checklist records' } });
      return;
    }
    if (filters.length === 0) {
      response(res, 400, { data: null, error: { message: 'Delete requires filters' } });
      return;
    }
    result = await pool.query(
      `DELETE FROM public.${quoteIdentifier(table)} AS ${quoteIdentifier(table)}${where} RETURNING *`,
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
      if (!DATA_TABLES.has(table)) {
        console.warn('Checklist API rejected unlisted table:', table);
        response(res, 404, { data: null, error: { message: 'Table is not available in the checklist API' } });
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
