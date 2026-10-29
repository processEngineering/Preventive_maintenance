'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { hashPassword, hashSessionToken, verifyPassword } = require('../auth');
const { createServer, validateDatabaseEnvironment } = require('../server');

let server;
let baseUrl;
let publicRoot;
let queryError;
const queries = [];
let authUser;
const sessions = new Map();
const setupTokens = new Set();
const queryValues = [];
const chslrColumns = {
  profiles: ['id', 'full_name', 'divisi', 'jabatan'],
  chslr_items: ['id', 'sort_order'],
  chslr_log: [
    'id', 'mesin_id', 'bulan', 'tahun', 'pelaksana_names', 'catatan_pelaksana',
    'koordinator_nama', 'signature_koordinator', 'status_verifikasi',
    'remark_koordinator', 'superintendent_nama', 'remark_superintendent',
    'signature_superintendent', 'status_final', 'created_at'
  ],
  chslr_mesin: ['id', 'nama_mesin', 'tonage'],
  chslr_result: [
    'id', 'log_id', 'item_id', 'tanggal', 'status', 'input_value', 'keterangan', 'signature'
  ],
  clhmi_machine: ['id', 'merk_mesin', 'serial_no', 'tonage'],
  clhmi_items: ['id', 'aktif', 'urutan', 'item_kode', 'nama_pengecekan'],
  clhmi: [
    'id', 'machine_id', 'merk_mesin', 'serial_no', 'pelaksana', 'paraf', 'status_form',
    'tanggal_isi', 'bulan', 'tahun', 'catatan_pelaksana', 'tonage', 'created_at',
    'paraf_coord', 'catatan_umum', 'verified_by', 'catatan_super', 'paraf_super'
  ],
  clhmi_results: [
    'id', 'clhmi_id', 'item_id', 'item_kode', 'status', 'value', 'temperature_oli',
    'catatan_item', 'pelaksana'
  ],
  jpdo_log: [
    'id', 'tanggal', 'status_hari', 'nama_supervisor', 'nama_mesin',
    'catatan_supervisor', 'tanda_tangan', 'nama_pic', 'created_at'
  ],
  jpdo_result: ['id', 'log_id', 'plan_status', 'actual_status'],
  jpdo_approval: [
    'id', 'bulan', 'nama_superintendent', 'catatan_superintendent',
    'tanda_tangan_superintendent', 'created_at'
  ],
  ppw_log: [
    'id', 'nama_operator', 'status_hasil', 'qc_check', 'keterangan', 'nama_spv',
    'catatan_akhir', 'ttd_spv', 'bagian', 'tanggal', 'nama_part', 'job_desc',
    'estimasi_waktu', 'waktu_mulai', 'waktu_selesai', 'nama_superintendent',
    'catatan_superintendent', 'ttd_superintendent', 'status_approval', 'created_at'
  ]
};
const pool = {
  async query(sql, values = []) {
    queries.push(sql);
    queryValues.push(values);
    if (queryError) {
      throw queryError;
    }
    if (sql.includes('FROM information_schema.columns')) {
      return { rows: (chslrColumns[values[0]] || []).map((column_name) => ({ column_name })) };
    }
    if (sql.includes('WITH claimed AS')) {
      if (!setupTokens.delete(values[0])) return { rows: [] };
      sessions.set(values[2], authUser.profile_id);
      return {
        rows: [{
          id: authUser.profile_id,
          full_name: authUser.full_name,
          divisi: authUser.divisi,
          jabatan: authUser.jabatan
        }]
      };
    }
    if (sql.includes('FROM public.app_users u')) {
      return { rows: authUser ? [authUser] : [] };
    }
    if (sql.includes('INSERT INTO public.app_sessions')) {
      sessions.set(values[0], values[1]);
      return { rows: [] };
    }
    if (sql.includes('FROM public.app_sessions s')) {
      const profileId = sessions.get(values[0]);
      return {
        rows: profileId ? [{
          id: profileId,
          full_name: 'Test User',
          divisi: 'Testing',
          jabatan: authUser.jabatan,
          email: authUser.email
        }] : []
      };
    }
    if (sql.includes('DELETE FROM public.app_sessions')) {
      sessions.delete(values[0]);
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO public.app_signature_files')) {
      return { rows: [{ object_key: values[1] }] };
    }
    if (sql.includes('SELECT content_type, file_data')) {
      return { rows: [{ content_type: 'image/png', file_data: Buffer.from([1, 2, 3]) }] };
    }
    return { rows: [{ '?column?': 1 }] };
  }
};

async function createSessionCookie() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'test-password-123' })
  });
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie').split(';')[0];
}

before(async () => {
  publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mtc-api-public-'));
  await fs.mkdir(path.join(publicRoot, 'auth'));
  await fs.writeFile(path.join(publicRoot, 'index.html'), '<h1>MTC test site</h1>');
  await fs.writeFile(
    path.join(publicRoot, 'auth', 'setup-password.html'),
    '<h1>Set password</h1>'
  );
  authUser = {
    profile_id: '00000000-0000-0000-0000-000000000001',
    password_hash: await hashPassword('test-password-123'),
    email_verified_at: new Date(),
    email: 'user@example.com',
    full_name: 'Test User',
    divisi: 'Testing',
    jabatan: 'OPERATOR | PELAKSANA'
  };
  server = createServer(pool, { publicRoot });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await fs.rm(publicRoot, { recursive: true, force: true });
});

test('health endpoint reports process status without querying the database', async () => {
  const response = await fetch(`${baseUrl}/healthz`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(queries.length, 0);
});

test('API version endpoint identifies the backend build without database access', async () => {
  const response = await fetch(`${baseUrl}/api/version`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: 'mtc-postgres-api',
    build: 'checklist-batch-2026-10-28'
  });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(queries.length, 0);
});

test('readiness endpoint performs only the intended profiles existence query', async () => {
  const response = await fetch(`${baseUrl}/readyz`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ready', database: 'connected' });
  assert.equal(queries.at(-1), 'SELECT 1 FROM public.profiles LIMIT 1');
});

test('readiness endpoint does not expose database errors', async () => {
  queryError = new Error('internal database detail');
  const response = await fetch(`${baseUrl}/readyz`);
  queryError = undefined;

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});

test('only GET requests are accepted', async () => {
  const response = await fetch(`${baseUrl}/readyz`, { method: 'POST' });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});

test('static frontend is served from the same origin as the API', async () => {
  const home = await fetch(`${baseUrl}/`);
  const setupPage = await fetch(`${baseUrl}/auth/setup-password.html`);

  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.equal(await home.text(), '<h1>MTC test site</h1>');
  assert.equal(setupPage.status, 200);
  assert.equal(await setupPage.text(), '<h1>Set password</h1>');
});

test('static hosting rejects unknown, hidden, traversal, and write requests', async () => {
  const missing = await fetch(`${baseUrl}/not-a-route`);
  const hidden = await fetch(`${baseUrl}/.env`);
  const traversal = await fetch(`${baseUrl}/%2e%2e%5csecret.txt`);
  const write = await fetch(`${baseUrl}/index.html`, { method: 'POST' });

  assert.equal(missing.status, 404);
  assert.equal(hidden.status, 404);
  assert.equal(traversal.status, 404);
  assert.equal(write.status, 405);
});

test('CHSLR API requires an authenticated session and only exposes allowlisted tables', async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/data/chslr_items`);
  assert.equal(unauthenticated.status, 401);

  const cookie = await createSessionCookie();
  const unsupported = await fetch(`${baseUrl}/api/data/app_users`, {
    headers: { Cookie: cookie }
  });
  assert.equal(unsupported.status, 404);
  assert.deepEqual(await unsupported.json(), {
    data: null,
    error: { message: 'Table is not available in the checklist API' }
  });

  const clhmiMachines = await fetch(`${baseUrl}/api/data/clhmi_machine?select=id,merk_mesin`, {
    headers: { Cookie: cookie }
  });
  assert.equal(clhmiMachines.status, 200);
  const clhmiMachineSql = queries.findLast((sql) =>
    sql.includes('SELECT "clhmi_machine"."id", "clhmi_machine"."merk_mesin"')
  );
  assert.ok(clhmiMachineSql);

  const wrongClhmiTable = await fetch(`${baseUrl}/api/data/clhmi_machines`, {
    headers: { Cookie: cookie }
  });
  assert.equal(wrongClhmiTable.status, 404);
});

test('batch checklist tables are allowlisted separately from database privilege checks', async () => {
  const cookie = await createSessionCookie();
  const tables = [
    'clpm_items',
    'pmw_reports',
    'Lkmr_result',
    'lkmr_repair',
    'pohm_machine',
    'kartu_riwayat_items',
    'pmi_machines',
    'prslb_mesin'
  ];

  for (const table of tables) {
    const response = await fetch(`${baseUrl}/api/data/${encodeURIComponent(table)}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(response.status, 503, `${table} should be allowlisted but unavailable in this test schema`);
    assert.deepEqual(await response.json(), {
      data: null,
      error: { message: 'Checklist database table is unavailable to the API role' }
    });
  }
});

test('database scripts are isolated and cover production and staging requirements', async () => {
  const [
    apiSource,
    grantSource,
    productionGrantSource,
    provisionerGrantSource,
    stagingCleanupSource,
    ecosystemConfigSource
  ] = await Promise.all([
    fs.readFile(path.join(__dirname, '..', 'api', 'chslr-api.js'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'sql', 'checklist-api-grants.sql'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'sql', 'production-api-grants.sql'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'sql', 'production-provisioner-grants.sql'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'sql', 'staging-clean-2026-10-28.sql'), 'utf8'),
    fs.readFile(path.join(__dirname, '..', 'ecosystem.config.js'), 'utf8')
  ]);
  const allowlist = apiSource.match(/const DATA_TABLES = new Set\(\[([\s\S]*?)\]\);/);
  const selectGrant = grantSource.match(/GRANT SELECT ON TABLE([\s\S]*?)TO mtc_api_auth_test;/);
  const productionSelectGrant = productionGrantSource.match(
    /GRANT SELECT ON TABLE\s+public\.profiles,([\s\S]*?)TO mtc_api_runtime;/
  );
  assert.ok(allowlist);
  assert.ok(selectGrant);
  assert.ok(productionSelectGrant);

  const allowedTables = [...allowlist[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const grantedTestTables = new Set(
    [...selectGrant[1].matchAll(/public\."?([A-Za-z_][A-Za-z_0-9]*)"?/g)]
      .map((match) => match[1])
  );
  const grantedProductionTables = new Set([
    'profiles',
    ...[...productionSelectGrant[1].matchAll(/public\."?([A-Za-z_][A-Za-z_0-9]*)"?/g)]
      .map((match) => match[1])
  ]);
  assert.deepEqual(allowedTables.filter((table) => !grantedTestTables.has(table)), []);
  assert.deepEqual(allowedTables.filter((table) => !grantedProductionTables.has(table)), []);
  assert.match(grantSource, /GRANT USAGE ON SCHEMA public TO mtc_api_auth_test;/);
  assert.match(
    grantSource,
    /GRANT SELECT, INSERT ON TABLE public\.app_signature_files TO mtc_api_auth_test;/
  );
  assert.match(grantSource, /current_database\(\) <> 'mtc_migration_test2'/);
  assert.doesNotMatch(grantSource, /mtc_api_runtime/);
  assert.match(productionGrantSource, /current_database\(\) <> 'mtc'/);
  assert.match(ecosystemConfigSource, /PUBLIC_APP_ORIGIN: 'https:\/\/amarilyspm\.vercel\.app'/);
  assert.doesNotMatch(productionGrantSource, /mtc_migration_test2|mtc_api_auth_test/);
  assert.match(productionGrantSource, /GRANT CONNECT ON DATABASE mtc TO mtc_api_runtime;/);
  assert.match(productionGrantSource, /GRANT USAGE ON SCHEMA extensions TO mtc_api_runtime;/);
  assert.match(productionGrantSource, /rolcanlogin, rolsuper, rolinherit/);
  assert.match(productionGrantSource, /must not be a member of another role/);
  assert.match(productionGrantSource, /app_email_verification_tokens TO mtc_api_runtime/);
  assert.match(productionGrantSource, /app_setup_tokens TO mtc_api_runtime/);
  assert.match(productionGrantSource, /app_sessions TO mtc_api_runtime/);
  assert.match(productionGrantSource, /app_users TO mtc_api_runtime/);
  assert.match(
    productionGrantSource,
    /GRANT SELECT, INSERT ON TABLE public\.app_signature_files TO mtc_api_runtime;/
  );
  assert.match(provisionerGrantSource, /current_database\(\) <> 'mtc'/);
  assert.doesNotMatch(provisionerGrantSource, /mtc_api_runtime|mtc_migration_test2/);
  assert.match(provisionerGrantSource, /GRANT CONNECT ON DATABASE mtc TO mtc_api_provisioner;/);
  assert.match(provisionerGrantSource, /GRANT SELECT \(id\) ON TABLE public\.profiles/);
  assert.match(provisionerGrantSource, /GRANT INSERT \(profile_id, email\)/);
  assert.match(provisionerGrantSource, /GRANT DELETE ON TABLE public\.app_setup_tokens/);
  assert.match(provisionerGrantSource, /rolcanlogin, rolsuper, rolinherit/);
  assert.match(stagingCleanupSource, /current_database\(\) <> 'mtc_migration_backup'/);
  assert.match(stagingCleanupSource, /TIMESTAMPTZ '2026-10-28 00:00:00\+07'/);
  assert.match(stagingCleanupSource, /TIMESTAMPTZ '2026-10-29 00:00:00\+07'/);
  assert.doesNotMatch(stagingCleanupSource, /DELETE FROM public\.(app_users|app_sessions|app_setup_tokens|app_email_verification_tokens|app_signature_files)/);
  assert.ok(
    stagingCleanupSource.indexOf('DELETE FROM public.chslr_result') <
      stagingCleanupSource.indexOf('DELETE FROM public.chslr_log')
  );
  const clhmiDeleteIndex = stagingCleanupSource.search(/DELETE FROM public\.clhmi\r?\n/);
  assert.ok(
    stagingCleanupSource.indexOf('DELETE FROM public.clhmi_results') <
      clhmiDeleteIndex
  );
});

test('CHSLR queries parameterize filters and force profile reads to the current user', async () => {
  const cookie = await createSessionCookie();
  const filter = await fetch(
    `${baseUrl}/api/data/chslr_mesin?select=id,nama_mesin&ilike[nama_mesin]=%25A%25&order=nama_mesin.asc&limit=5`,
    { headers: { Cookie: cookie } }
  );
  assert.equal(filter.status, 200);
  const filterSql = queries.findLast((sql) => sql.includes('SELECT "chslr_mesin"."id", "chslr_mesin"."nama_mesin"'));
  const filterParams = queryValues[queries.indexOf(filterSql)];
  assert.match(filterSql, /ILIKE \$1/);
  assert.deepEqual(filterParams, ['%A%', 5]);

  const profile = await fetch(`${baseUrl}/api/data/profiles?select=jabatan`, {
    headers: { Cookie: cookie }
  });
  assert.equal(profile.status, 200);
  const profileSql = queries.findLast((sql) => sql.includes('SELECT "profiles"."jabatan" FROM public."profiles"'));
  assert.match(profileSql, /WHERE "profiles"\."id" = \$1/);
  assert.deepEqual(queryValues[queries.indexOf(profileSql)], [authUser.profile_id]);

  const otherProfile = await fetch(
    `${baseUrl}/api/data/profiles?select=jabatan&eq[id]=00000000-0000-0000-0000-000000000099`,
    { headers: { Cookie: cookie } }
  );
  assert.equal(otherProfile.status, 403);
});

test('CLHMI API supports safe filters, related selections, and role-scoped writes', async () => {
  const operatorCookie = await createSessionCookie();
  const queue = await fetch(
    `${baseUrl}/api/data/clhmi?select=*,clhmi_machine(merk_mesin)&eq[status_form]=submitted&order=created_at.desc`,
    { headers: { Cookie: operatorCookie } }
  );
  assert.equal(queue.status, 200);
  const queueSql = queries.findLast((sql) => sql.includes('jsonb_build_object') && sql.includes('public."clhmi"'));
  assert.match(queueSql, /FROM public\."clhmi_machine" AS "r0_clhmi_machine"/);
  assert.match(queueSql, /"r0_clhmi_machine"\."id" = "clhmi"\."machine_id"/);
  assert.match(queueSql, /"clhmi"\."status_form" = \$1/);
  assert.deepEqual(queryValues[queries.indexOf(queueSql)], ['submitted']);

  const findings = await fetch(
    `${baseUrl}/api/data/clhmi_results?select=status,catatan_item,clhmi_items(nama_pengecekan)&eq[clhmi_id]=report-1&or=status.eq.NG%2Cstatus.eq.NA%2Cstatus.eq.MT`,
    { headers: { Cookie: operatorCookie } }
  );
  assert.equal(findings.status, 200);
  const findingsSql = queries.findLast((sql) => sql.includes('public."clhmi_results"') && sql.includes('jsonb_build_object'));
  assert.match(findingsSql, /"clhmi_results"\."clhmi_id" = \$1/);
  assert.match(findingsSql, /"clhmi_results"\."status" = \$2 OR "clhmi_results"\."status" = \$3 OR "clhmi_results"\."status" = \$4/);
  assert.deepEqual(queryValues[queries.indexOf(findingsSql)], ['report-1', 'NG', 'NA', 'MT']);

  const header = await fetch(`${baseUrl}/api/data/clhmi`, {
    method: 'POST',
    headers: { Cookie: operatorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      machine_id: 'machine-1',
      status_form: 'submitted',
      bulan: 6,
      tahun: 2026
    })
  });
  assert.equal(header.status, 201);

  const forbiddenOperatorUpdate = await fetch(`${baseUrl}/api/data/clhmi?eq[id]=report-1`, {
    method: 'PATCH',
    headers: { Cookie: operatorCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status_form: 'approved' })
  });
  assert.equal(forbiddenOperatorUpdate.status, 403);

  const originalRole = authUser.jabatan;
  try {
    authUser.jabatan = 'SUPERVISOR | KOORDINATOR';
    const supervisorCookie = await createSessionCookie();
    const update = await fetch(`${baseUrl}/api/data/clhmi?eq[id]=report-1`, {
      method: 'PATCH',
      headers: { Cookie: supervisorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_form: 'approved', paraf_coord: 'signature-data' })
    });
    assert.equal(update.status, 200);

    const forbiddenSupervisorUpdate = await fetch(`${baseUrl}/api/data/clhmi?eq[id]=report-1`, {
      method: 'PATCH',
      headers: { Cookie: supervisorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paraf_super: 'signature-data' })
    });
    assert.equal(forbiddenSupervisorUpdate.status, 403);

    authUser.jabatan = 'SUPERINTENDENT';
    const superintendentCookie = await createSessionCookie();
    const close = await fetch(`${baseUrl}/api/data/clhmi?in[id]=(report-1%2Creport-2)`, {
      method: 'PATCH',
      headers: { Cookie: superintendentCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_form: 'closed', verified_by: 'Test' })
    });
    assert.equal(close.status, 200);
    const updateSql = queries.findLast((sql) => sql.includes('UPDATE public."clhmi"'));
    assert.match(updateSql, /"clhmi"\."id" IN \(\$1, \$2\)/);
    assert.deepEqual(queryValues[queries.indexOf(updateSql)], ['report-1', 'report-2', 'closed', 'Test']);
  } finally {
    authUser.jabatan = originalRole;
  }
});

test('checklist API supports compound date filters, repeated ordering, one-to-many relations, and role policies', async () => {
  const originalRole = authUser.jabatan;
  const cookie = await createSessionCookie();
  const url = new URL(`${baseUrl}/api/data/jpdo_log`);
  url.searchParams.set('select', '*,jpdo_result(id,plan_status,actual_status)');
  url.searchParams.set('lt[tanggal]', '2026-10-01');
  url.searchParams.set(
    'or',
    'and(tanggal.gte.2026-01-01,tanggal.lt.2026-02-01),and(tanggal.gte.2026-03-01,tanggal.lt.2026-04-01)'
  );
  url.searchParams.append('order', 'tanggal.asc');
  url.searchParams.append('order', 'created_at.desc');

  try {
    const list = await fetch(url, { headers: { Cookie: cookie } });
    assert.equal(list.status, 200);
    const sql = queries.findLast((query) =>
      query.includes('public."jpdo_log"') && query.includes('jsonb_agg')
    );
    assert.match(sql, /jsonb_agg\(related_rows\.relation_data\)/);
    assert.match(sql, /"jpdo_log"\."tanggal" < \$1/);
    assert.match(sql, /"jpdo_log"\."tanggal" >= \$2 AND "jpdo_log"\."tanggal" < \$3/);
    assert.match(sql, /"jpdo_log"\."tanggal" >= \$4 AND "jpdo_log"\."tanggal" < \$5/);
    assert.match(sql, /ORDER BY "jpdo_log"\."tanggal" ASC, "jpdo_log"\."created_at" DESC/);
    assert.deepEqual(queryValues[queries.indexOf(sql)], [
      '2026-10-01',
      '2026-01-01',
      '2026-02-01',
      '2026-03-01',
      '2026-04-01'
    ]);

    authUser.jabatan = 'SUPERVISOR';
    const supervisorCookie = await createSessionCookie();
    const logInsert = await fetch(`${baseUrl}/api/data/jpdo_log`, {
      method: 'POST',
      headers: { Cookie: supervisorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tanggal: '2026-10-28',
        status_hari: 'normal',
        nama_supervisor: 'Test',
        nama_mesin: 'M-1',
        nama_pic: 'Operator',
        tanda_tangan: 'sig.png'
      })
    });
    assert.equal(logInsert.status, 201);

    const ppwInsert = await fetch(`${baseUrl}/api/data/ppw_log`, {
      method: 'POST',
      headers: { Cookie: supervisorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama_operator: 'Operator',
        status_hasil: 'pending',
        qc_check: false,
        keterangan: '',
        nama_spv: 'Test',
        catatan_akhir: '',
        ttd_spv: 'sig.png',
        bagian: 'Assembly',
        tanggal: '2026-10-28',
        nama_part: 'Part',
        job_desc: 'Preventive check',
        estimasi_waktu: '30 menit'
      })
    });
    assert.equal(ppwInsert.status, 201);

    const forbiddenApproval = await fetch(`${baseUrl}/api/data/jpdo_approval`, {
      method: 'POST',
      headers: { Cookie: supervisorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulan: '2026-10',
        nama_superintendent: 'Test',
        catatan_superintendent: 'Approved',
        tanda_tangan_superintendent: 'sig.png'
      })
    });
    assert.equal(forbiddenApproval.status, 403);

    authUser.jabatan = 'SUPERINTENDENT';
    const superintendentCookie = await createSessionCookie();
    const approvalInsert = await fetch(`${baseUrl}/api/data/jpdo_approval`, {
      method: 'POST',
      headers: { Cookie: superintendentCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulan: '2026-10',
        nama_superintendent: 'Test',
        catatan_superintendent: 'Approved',
        tanda_tangan_superintendent: 'sig.png'
      })
    });
    assert.equal(approvalInsert.status, 201);
  } finally {
    authUser.jabatan = originalRole;
  }
});

test('CHSLR writes are parameterized and reject fields outside the current role', async () => {
  const cookie = await createSessionCookie();
  const marker = 'value"); DROP TABLE public.profiles; --';
  const insert = await fetch(`${baseUrl}/api/data/chslr_result`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      log_id: 'log-1',
      item_id: 'item-1',
      tanggal: 1,
      status: 'OK',
      input_value: null,
      keterangan: marker,
      signature: 'sig.png'
    })
  });
  assert.equal(insert.status, 201);
  const insertSql = queries.findLast((sql) => sql.includes('INSERT INTO public."chslr_result"'));
  assert.equal(insertSql.includes(marker), false);
  assert.ok(queryValues[queries.indexOf(insertSql)].includes(marker));

  const forbiddenUpdate = await fetch(`${baseUrl}/api/data/chslr_log?eq[id]=log-1`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status_verifikasi: true })
  });
  assert.equal(forbiddenUpdate.status, 403);
});

test('CHSLR approval fields are writable only through the matching workflow roles', async () => {
  const originalRole = authUser.jabatan;
  try {
    authUser.jabatan = 'SUPERVISOR | KOORDINATOR';
    const supervisorCookie = await createSessionCookie();
    const coordinatorUpdate = await fetch(`${baseUrl}/api/data/chslr_log?eq[id]=log-1`, {
      method: 'PATCH',
      headers: { Cookie: supervisorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_verifikasi: true })
    });
    assert.equal(coordinatorUpdate.status, 200);

    authUser.jabatan = 'SUPERINTENDENT';
    const superintendentCookie = await createSessionCookie();
    const superintendentUpdate = await fetch(`${baseUrl}/api/data/chslr_log?eq[id]=log-1`, {
      method: 'PATCH',
      headers: { Cookie: superintendentCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_final: true })
    });
    assert.equal(superintendentUpdate.status, 200);
  } finally {
    authUser.jabatan = originalRole;
  }
});

test('CHSLR signature endpoints accept only PNG data and serve stored images', async () => {
  const cookie = await createSessionCookie();
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
  const upload = await fetch(`${baseUrl}/api/storage/signatures/test-signature.png`, {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'image/png' },
    body: png
  });
  assert.equal(upload.status, 201);
  assert.deepEqual(await upload.json(), {
    data: { path: 'test-signature.png' },
    error: null
  });

  const read = await fetch(`${baseUrl}/api/storage/signatures/test-signature.png`, {
    headers: { Cookie: cookie }
  });
  assert.equal(read.status, 200);
  assert.equal(read.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await read.arrayBuffer()), Buffer.from([1, 2, 3]));
});

test('login creates a seven-day secure, HttpOnly session cookie', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ' USER@EXAMPLE.COM ', password: 'test-password-123' })
  });
  const cookie = response.headers.get('set-cookie');

  assert.equal(response.status, 200);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=604800/);
  assert.deepEqual(await response.json(), {
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Test User',
      divisi: 'Testing',
      jabatan: 'OPERATOR | PELAKSANA'
    }
  });
});

test('login rejects wrong passwords and unverified accounts without revealing which failed', async () => {
  const wrongPassword = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'wrong-password' })
  });
  authUser.email_verified_at = null;
  const unverified = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'test-password-123' })
  });
  authUser.email_verified_at = new Date();

  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(await wrongPassword.json(), { error: 'Email or password is incorrect' });
  assert.equal(unverified.status, 401);
  assert.deepEqual(await unverified.json(), { error: 'Email or password is incorrect' });
});

test('registration excludes ADMIN and verifies new email with a single-use token', async () => {
  const tokenHashes = new Set();
  const transactionQueries = [];
  const deliveries = [];
  let emailVerified = false;
  const registrationPool = {
    async connect() {
      return {
        async query(sql, values = []) {
          transactionQueries.push({ sql, values });
          if (sql.includes('SELECT profile_id, email')) {
            return {
              rows: emailVerified
                ? []
                : [{
                  profile_id: '00000000-0000-0000-0000-000000000002',
                  email: 'new@example.com'
                }]
            };
          }
          if (sql.includes('DELETE FROM public.app_email_verification_tokens')) {
            tokenHashes.clear();
          }
          if (sql.includes('INSERT INTO public.app_email_verification_tokens')) {
            tokenHashes.add(values[0]);
          }
          return { rows: [] };
        },
        release() {}
      };
    },
    async query(sql, values = []) {
      if (sql.includes('WITH claimed AS')) {
        if (!tokenHashes.delete(values[0])) return { rows: [] };
        emailVerified = true;
        return { rows: [{ profile_id: '00000000-0000-0000-0000-000000000002' }] };
      }
      return { rows: [] };
    }
  };
  const registrationServer = createServer(registrationPool, {
    publicRoot,
    mailer: { async sendMail(message) { deliveries.push(message); } },
    fromEmail: 'department@example.com',
    publicAppOrigin: 'https://mtc-test.example.com'
  });
  await new Promise((resolve) => registrationServer.listen(0, '127.0.0.1', resolve));
  const registrationUrl = `http://127.0.0.1:${registrationServer.address().port}/api/auth/register`;

  try {
    const forbiddenRole = await fetch(registrationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test User',
        divisi: 'Testing',
        jabatan: 'ADMIN',
        email: 'new@example.com',
        password: 'a-secure-test-password'
      })
    });
    assert.equal(forbiddenRole.status, 400);
    assert.equal(transactionQueries.length, 0);

    const shortPassword = await fetch(registrationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test User',
        divisi: 'Testing',
        jabatan: 'OPERATOR | PELAKSANA',
        email: 'new@example.com',
        password: 'abc12'
      })
    });
    assert.equal(shortPassword.status, 400);
    assert.equal(transactionQueries.length, 0);

    const registration = await fetch(registrationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test User',
        divisi: 'Testing',
        jabatan: 'OPERATOR | PELAKSANA',
        email: 'new@example.com',
        password: 'Abc123'
      })
    });
    assert.equal(registration.status, 202);
    assert.equal(transactionQueries.at(-1).sql, 'COMMIT');
    const profileInsert = transactionQueries.find(({ sql }) => sql.includes('INSERT INTO public.profiles'));
    const userInsert = transactionQueries.find(({ sql }) => sql.includes('INSERT INTO public.app_users'));
    assert.equal(profileInsert.values[3], 'OPERATOR | PELAKSANA');
    assert.equal(await verifyPassword('Abc123', userInsert.values[2]), true);
    assert.equal(deliveries.length, 1);
    assert.match(deliveries[0].text, /https:\/\/mtc-test\.example\.com\/auth\/verify-email\.html#token=/);

    const firstUrl = new URL(deliveries[0].html.match(/href="([^"]+)"/)[1]);
    const firstToken = new URLSearchParams(firstUrl.hash.slice(1)).get('token');
    const resend = await fetch(
      `http://127.0.0.1:${registrationServer.address().port}/api/auth/resend-verification`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com' })
      }
    );
    assert.equal(resend.status, 202);
    assert.equal(deliveries.length, 2);

    const secondUrl = new URL(deliveries[1].html.match(/href="([^"]+)"/)[1]);
    const token = new URLSearchParams(secondUrl.hash.slice(1)).get('token');
    const verify = await fetch(
      `http://127.0.0.1:${registrationServer.address().port}/api/auth/verify-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }
    );
    assert.equal(verify.status, 200);
    assert.deepEqual(await verify.json(), { status: 'verified' });

    const expiredLink = await fetch(
      `http://127.0.0.1:${registrationServer.address().port}/api/auth/verify-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: firstToken })
      }
    );
    assert.equal(expiredLink.status, 400);

    const replay = await fetch(
      `http://127.0.0.1:${registrationServer.address().port}/api/auth/verify-email`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }
    );
    assert.equal(replay.status, 400);
  } finally {
    await new Promise((resolve, reject) => {
      registrationServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('session lookup requires a valid session and logout revokes it', async () => {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'test-password-123' })
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const session = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookie }
  });
  assert.equal(session.status, 200);
  assert.deepEqual((await session.json()).user, {
    id: authUser.profile_id,
    full_name: authUser.full_name,
    divisi: authUser.divisi,
    jabatan: authUser.jabatan,
    email: authUser.email
  });

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: '{}'
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);

  const expiredSession = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookie }
  });
  assert.equal(expiredSession.status, 401);
});

test('password setup consumes a one-time token and creates a session atomically', async () => {
  const sessionsBeforeSetup = sessions.size;
  const token = 'setup-token-value-123456789012345678901234';
  setupTokens.add(hashSessionToken(token));
  const response = await fetch(`${baseUrl}/api/auth/setup-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'Abc123' })
  });
  const cookie = response.headers.get('set-cookie');

  assert.equal(response.status, 200);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.deepEqual((await response.json()).user.id, authUser.profile_id);
  assert.match(queries.at(-1), /UPDATE public\.app_setup_tokens/);
  assert.match(queries.at(-1), /UPDATE public\.app_users/);
  assert.match(queries.at(-1), /INSERT INTO public\.app_sessions/);
  assert.equal(sessions.size, sessionsBeforeSetup + 1);

  const replay = await fetch(`${baseUrl}/api/auth/setup-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'another-secure-password-456' })
  });
  assert.equal(replay.status, 400);
});

test('password setup rejects passwords shorter than six characters', async () => {
  const token = 'setup-token-short-password-123456789012345';
  setupTokens.add(hashSessionToken(token));
  const response = await fetch(`${baseUrl}/api/auth/setup-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: 'abc12' })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'Password must be at least 6 characters'
  });
  assert.equal(setupTokens.has(hashSessionToken(token)), true);
});

test('password setup rejects an expired or malformed token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/setup-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'not-a-setup-token', password: 'new-secure-password-123' })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Setup link is invalid or expired' });
});

test('login rejects non-JSON requests and malformed JSON', async () => {
  const wrongContentType = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: 'email=user@example.com'
  });
  const malformed = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'null'
  });

  assert.equal(wrongContentType.status, 415);
  assert.equal(malformed.status, 400);
});

test('database configuration must be explicit and use a valid port', () => {
  assert.throws(
    () => validateDatabaseEnvironment({}),
    /PGHOST, PGDATABASE, PGUSER, PGPASSWORD/
  );
  assert.throws(
    () => validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc',
      PGUSER: 'mtc_api_auth_test',
      PGPASSWORD: 'test-only'
    }),
    /PGDATABASE=mtc_migration_test2 and PGUSER=mtc_api_auth_test/
  );
  assert.deepEqual(
    validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc_migration_test2',
      PGUSER: 'mtc_api_auth_test',
      PGPASSWORD: 'test-only',
      PGPORT: '5432'
    }),
    { port: 5432, host: '127.0.0.1' }
  );
  assert.deepEqual(
    validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc_migration_test2',
      PGUSER: 'mtc_api_auth_test',
      PGPASSWORD: 'test-only',
      PGPORT: '5432',
      API_HOST: '0.0.0.0'
    }),
    { port: 5432, host: '0.0.0.0' }
  );
  assert.throws(
    () => validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc_migration_test2',
      PGUSER: 'mtc_api_auth_test',
      PGPASSWORD: 'test-only',
      PGPORT: '70000'
    }),
    /PGPORT/
  );
  assert.throws(
    () => validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc_migration_test2',
      PGUSER: 'mtc_api_auth_test',
      PGPASSWORD: 'test-only',
      API_HOST: '192.168.4.240'
    }),
    /API_HOST/
  );
  assert.throws(
    () => validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc_migration_test2',
      PGUSER: 'mtc_api_auth_test',
      PGPASSWORD: 'test-only',
      APP_ENVIRONMENT: 'staging'
    }),
    /APP_ENVIRONMENT must be test or production/
  );
  assert.deepEqual(
    validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc',
      PGUSER: 'mtc_api_runtime',
      PGPASSWORD: 'test-only',
      APP_ENVIRONMENT: 'production'
    }),
    { port: 5432, host: '127.0.0.1' }
  );
  assert.throws(
    () => validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc_migration_test2',
      PGUSER: 'mtc_api_auth_test',
      PGPASSWORD: 'test-only',
      APP_ENVIRONMENT: 'production'
    }),
    /PGDATABASE=mtc and PGUSER=mtc_api_runtime/
  );
  assert.throws(
    () => validateDatabaseEnvironment({
      PGHOST: 'localhost',
      PGDATABASE: 'mtc',
      PGUSER: 'mtc_api_runtime',
      PGPASSWORD: 'test-only',
      APP_ENVIRONMENT: 'production',
      API_HOST: '0.0.0.0'
    }),
    /Production API_HOST must be 127.0.0.1/
  );
});
