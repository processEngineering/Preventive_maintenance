'use strict';

const {
  createHash,
  randomBytes,
  randomUUID,
  scrypt: scryptCallback,
  timingSafeEqual
} = require('node:crypto');
const { promisify } = require('node:util');
const {
  sendActivationRequestEmail,
  sendEmailVerification,
  sendPasswordSetupEmail
} = require('./email');

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'mtc_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const SETUP_TOKEN_TTL_HOURS = 24;
const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
const ACTIVATION_REQUEST_TOKEN_TTL_HOURS = 24;
const ACTIVATION_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const ACTIVATION_REQUEST_LIMIT_PER_EMAIL = 3;
const ACTIVATION_REQUEST_GLOBAL_LIMIT = 20;
const activationRequestsByEmail = new Map();
let activationRequestTimes = [];
const PASSWORD_HASH_VERSION = 'scrypt';
const PASSWORD_SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_KEY_LENGTH = 64;
const DUMMY_SALT = Buffer.alloc(16, 1);
const DUMMY_HASH = Buffer.alloc(PASSWORD_KEY_LENGTH, 1);
const REGISTRATION_ROLES = new Set([
  'OPERATOR | PELAKSANA',
  'SUPERVISOR | KOORDINATOR',
  'SUPERINTENDENT',
  'JUNIOR MANAGER PRODUKSI',
  'JUNIOR MANAGER PPC',
  'MANAGER'
]);
const REGISTRATION_RESPONSE = {
  message: 'If the address is eligible, a verification link will be sent.'
};

function isValidEmail(email) {
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function allowActivationRequest(email, now = Date.now()) {
  const cutoff = now - ACTIVATION_REQUEST_WINDOW_MS;
  activationRequestTimes = activationRequestTimes.filter((timestamp) => timestamp > cutoff);
  for (const [address, timestamps] of activationRequestsByEmail) {
    const activeTimestamps = timestamps.filter((timestamp) => timestamp > cutoff);
    if (activeTimestamps.length === 0) {
      activationRequestsByEmail.delete(address);
    } else {
      activationRequestsByEmail.set(address, activeTimestamps);
    }
  }

  if (activationRequestTimes.length >= ACTIVATION_REQUEST_GLOBAL_LIMIT) return false;
  const emailTimestamps = activationRequestsByEmail.get(email) || [];
  if (emailTimestamps.length >= ACTIVATION_REQUEST_LIMIT_PER_EMAIL) return false;
  if (activationRequestsByEmail.size >= 5000) return false;

  activationRequestTimes.push(now);
  activationRequestsByEmail.set(email, [...emailTimestamps, now]);
  return true;
}

function verificationUrl(publicAppOrigin, token) {
  const url = new URL('/auth/verify-email.html', publicAppOrigin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

function activationApprovalUrl(publicAppOrigin, token) {
  const url = new URL('/auth/approve-activation.html', publicAppOrigin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

async function createEmailVerificationToken(client, profileId) {
  const token = randomBytes(32).toString('base64url');
  await client.query(
    `DELETE FROM public.app_email_verification_tokens
     WHERE profile_id = $1 AND consumed_at IS NULL`,
    [profileId]
  );
  await client.query(
    `INSERT INTO public.app_email_verification_tokens (token_hash, profile_id, expires_at)
     VALUES ($1, $2, now() + ($3 * interval '1 hour'))`,
    [hashSessionToken(token), profileId, EMAIL_VERIFICATION_TOKEN_TTL_HOURS]
  );
  return token;
}

async function sendVerificationMessage({ mailer, fromEmail, email, token, publicAppOrigin }) {
  await sendEmailVerification({
    transport: mailer,
    from: fromEmail,
    to: email,
    verificationUrl: verificationUrl(publicAppOrigin, token)
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH, PASSWORD_SCRYPT_OPTIONS);

  return [
    PASSWORD_HASH_VERSION,
    PASSWORD_SCRYPT_OPTIONS.N,
    PASSWORD_SCRYPT_OPTIONS.r,
    PASSWORD_SCRYPT_OPTIONS.p,
    salt.toString('base64url'),
    derivedKey.toString('base64url')
  ].join('$');
}

async function verifyPassword(password, encodedHash) {
  const parts = typeof encodedHash === 'string' ? encodedHash.split('$') : [];
  if (parts.length !== 6 || parts[0] !== PASSWORD_HASH_VERSION) {
    await scrypt(password, DUMMY_SALT, PASSWORD_KEY_LENGTH, PASSWORD_SCRYPT_OPTIONS);
    return false;
  }

  const [, n, r, p, saltText, hashText] = parts;
  const options = { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 };
  const salt = Buffer.from(saltText, 'base64url');
  const expected = Buffer.from(hashText, 'base64url');
  if (
    !Number.isInteger(options.N) || options.N < 16384 || options.N > 65536 ||
    !Number.isInteger(options.r) || options.r < 8 || options.r > 16 ||
    !Number.isInteger(options.p) || options.p < 1 || options.p > 4 ||
    salt.length !== 16 || expected.length !== PASSWORD_KEY_LENGTH
  ) {
    await scrypt(password, DUMMY_SALT, PASSWORD_KEY_LENGTH, PASSWORD_SCRYPT_OPTIONS);
    return false;
  }

  const actual = await scrypt(password, salt, PASSWORD_KEY_LENGTH, options);
  return timingSafeEqual(actual, expected);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(req, cookieName) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === cookieName) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

function jsonResponse(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body === null ? undefined : JSON.stringify(body));
}

async function readJsonBody(req, res) {
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    jsonResponse(res, 415, { error: 'Unsupported media type' });
    return null;
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 8192) {
      jsonResponse(res, 413, { error: 'Request too large' });
      return null;
    }
  }

  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      jsonResponse(res, 400, { error: 'Invalid JSON' });
      return null;
    }
    return parsed;
  } catch {
    jsonResponse(res, 400, { error: 'Invalid JSON' });
    return null;
  }
}

async function handleAuthRequest(req, res, pool, {
  mailer,
  fromEmail,
  publicAppOrigin
} = {}) {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/auth/')) return false;

  if (url.pathname === '/api/auth/request-activation' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (!body) return true;

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!isValidEmail(email)) {
      jsonResponse(res, 400, { error: 'Enter a valid email address' });
      return true;
    }
    if (!mailer || !fromEmail || !publicAppOrigin) {
      console.error('Activation request email is unavailable because email is not configured');
      jsonResponse(res, 503, { error: 'Layanan permintaan aktivasi sementara tidak tersedia' });
      return true;
    }
    if (!allowActivationRequest(email.toLowerCase())) {
      jsonResponse(res, 429, {
        error: 'Terlalu banyak permintaan aktivasi. Silakan coba kembali nanti.'
      });
      return true;
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashSessionToken(token);
    let client;
    let requestCreated = false;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const profiles = await client.query(
        `SELECT id, email
         FROM public.profiles
         WHERE lower(btrim(email)) = $1
         LIMIT 2`,
        [email.toLowerCase()]
      );
      if (profiles.rowCount !== 1) {
        await client.query('ROLLBACK');
        jsonResponse(res, 202, {
          message: 'Jika alamat ini sesuai dengan profil yang ada, admin akan meninjau permintaan aktivasi.'
        });
        return true;
      }

      const profile = profiles.rows[0];
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
        [profile.id]
      );
      const account = await client.query(
        `SELECT email_normalized, password_hash
         FROM public.app_users
         WHERE profile_id = $1`,
        [profile.id]
      );
      if (
        account.rowCount > 0 &&
        (
          account.rows[0].email_normalized !== email.toLowerCase() ||
          account.rows[0].password_hash
        )
      ) {
        await client.query('ROLLBACK');
        jsonResponse(res, 202, {
          message: 'Jika alamat ini sesuai dengan profil yang ada, admin akan meninjau permintaan aktivasi.'
        });
        return true;
      }

      await client.query(
        `DELETE FROM public.app_activation_requests
         WHERE profile_id = $1 AND consumed_at IS NULL`,
        [profile.id]
      );
      await client.query(
        `INSERT INTO public.app_activation_requests
           (token_hash, profile_id, email, expires_at)
         VALUES ($1, $2, $3, now() + ($4 * interval '1 hour'))`,
        [
          tokenHash,
          profile.id,
          profile.email.trim().toLowerCase(),
          ACTIVATION_REQUEST_TOKEN_TTL_HOURS
        ]
      );
      await client.query('COMMIT');
      requestCreated = true;
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Activation request rollback failed:', rollbackError.message);
        }
      }
      console.error('Activation request lookup failed:', error.message);
      jsonResponse(res, 503, { error: 'Permintaan aktivasi tidak dapat diproses saat ini' });
      return true;
    } finally {
      if (client) client.release();
    }

    if (requestCreated) {
      try {
        await sendActivationRequestEmail({
          transport: mailer,
          from: fromEmail,
          to: fromEmail,
          requesterEmail: email,
          approvalUrl: activationApprovalUrl(publicAppOrigin, token)
        });
      } catch (error) {
        try {
          await pool.query(
            'DELETE FROM public.app_activation_requests WHERE token_hash = $1 AND consumed_at IS NULL',
            [tokenHash]
          );
        } catch (cleanupError) {
          console.error('Activation request cleanup failed:', cleanupError.message);
        }
        console.error('Activation request email delivery failed:', error.message);
        jsonResponse(res, 503, { error: 'Permintaan aktivasi tidak dapat dikirim saat ini' });
        return true;
      }
    }

    jsonResponse(res, 202, {
      message: 'Jika alamat ini sesuai dengan profil yang ada, admin akan meninjau permintaan aktivasi.'
    });
    return true;
  }

  if (url.pathname === '/api/auth/approve-activation' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (!body) return true;

    const token = typeof body.token === 'string' ? body.token : '';
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      jsonResponse(res, 400, { error: 'Tautan persetujuan tidak valid atau kedaluwarsa' });
      return true;
    }
    if (!mailer || !fromEmail || !publicAppOrigin) {
      console.error('Activation approval is unavailable because email is not configured');
      jsonResponse(res, 503, { error: 'Persetujuan aktivasi sementara tidak tersedia' });
      return true;
    }

    const setupToken = randomBytes(32).toString('base64url');
    const setupTokenHash = hashSessionToken(setupToken);
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const activation = await client.query(
        `SELECT activation_request.profile_id, activation_request.email
         FROM public.app_activation_requests activation_request
         JOIN public.profiles profile ON profile.id = activation_request.profile_id
         WHERE activation_request.token_hash = $1
           AND activation_request.consumed_at IS NULL
           AND activation_request.expires_at > now()
           AND lower(btrim(profile.email)) = activation_request.email
         FOR UPDATE OF activation_request`,
        [hashSessionToken(token)]
      );
      const request = activation.rows[0];
      if (activation.rowCount !== 1) {
        await client.query('ROLLBACK');
        jsonResponse(res, 400, { error: 'Tautan persetujuan tidak valid atau kedaluwarsa' });
        return true;
      }

      await client.query(
        `INSERT INTO public.app_users (profile_id, email)
         VALUES ($1, $2)
         ON CONFLICT (profile_id) DO NOTHING`,
        [request.profile_id, request.email]
      );
      const account = await client.query(
        `SELECT email_normalized, password_hash
         FROM public.app_users
         WHERE profile_id = $1
         FOR UPDATE`,
        [request.profile_id]
      );
      if (
        account.rowCount !== 1 ||
        account.rows[0].email_normalized !== request.email.toLowerCase() ||
        account.rows[0].password_hash
      ) {
        await client.query('ROLLBACK');
        jsonResponse(res, 409, {
          error: 'Akun ini sudah disiapkan atau email profil berubah; hubungi administrator'
        });
        return true;
      }

      await client.query(
        `DELETE FROM public.app_setup_tokens
         WHERE profile_id = $1 AND consumed_at IS NULL`,
        [request.profile_id]
      );
      await client.query(
        `INSERT INTO public.app_setup_tokens (token_hash, profile_id, expires_at)
         VALUES ($1, $2, now() + ($3 * interval '1 hour'))`,
        [setupTokenHash, request.profile_id, SETUP_TOKEN_TTL_HOURS]
      );
      const setupUrl = new URL('/auth/setup-password.html', publicAppOrigin);
      setupUrl.hash = new URLSearchParams({ token: setupToken }).toString();
      await sendPasswordSetupEmail({
        transport: mailer,
        from: fromEmail,
        to: request.email,
        setupUrl: setupUrl.toString()
      });
      await client.query(
        `UPDATE public.app_activation_requests
         SET consumed_at = now()
         WHERE token_hash = $1`,
        [hashSessionToken(token)]
      );
      await client.query('COMMIT');
      jsonResponse(res, 200, {
        message: 'Persetujuan berhasil. Tautan untuk membuat kata sandi telah dikirim kepada pengguna.'
      });
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Activation approval rollback failed:', rollbackError.message);
        }
      }
      console.error('Activation approval failed:', error.message);
      jsonResponse(res, 503, { error: 'Persetujuan aktivasi gagal diproses saat ini' });
    } finally {
      if (client) client.release();
    }
    return true;
  }

  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (!body) return true;

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const divisi = typeof body.divisi === 'string' ? body.divisi.trim() : '';
    const jabatan = typeof body.jabatan === 'string' ? body.jabatan.trim().toUpperCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
      !isValidEmail(email) ||
      !fullName || fullName.length > 160 ||
      !divisi || divisi.length > 160 ||
      !REGISTRATION_ROLES.has(jabatan) ||
      password.length < 6 || password.length > 1024
    ) {
      jsonResponse(res, 400, {
        error: 'Check the registration details. Passwords must be at least 6 characters.'
      });
      return true;
    }

    if (!mailer || !fromEmail || !publicAppOrigin) {
      console.error('Signup is unavailable because email verification is not configured');
      jsonResponse(res, 503, { error: 'Registration email service is temporarily unavailable' });
      return true;
    }

    const profileId = randomUUID();
    const passwordHash = await hashPassword(password);
    let token;
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO public.profiles (id, full_name, divisi, jabatan)
         VALUES ($1, $2, $3, $4)`,
        [profileId, fullName, divisi, jabatan]
      );
      await client.query(
        `INSERT INTO public.app_users (profile_id, email, password_hash)
         VALUES ($1, $2, $3)`,
        [profileId, email, passwordHash]
      );
      token = await createEmailVerificationToken(client, profileId);
      await client.query('COMMIT');
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Registration rollback failed:', rollbackError.message);
        }
      }
      if (error.code === '23505' && error.constraint === 'app_users_email_normalized_unique') {
        jsonResponse(res, 202, REGISTRATION_RESPONSE);
        return true;
      }
      console.error('Account registration failed:', error.message);
      jsonResponse(res, 503, { error: 'Registration is temporarily unavailable' });
      return true;
    } finally {
      if (client) client.release();
    }

    try {
      await sendVerificationMessage({
        mailer,
        fromEmail,
        email,
        token,
        publicAppOrigin
      });
      jsonResponse(res, 202, REGISTRATION_RESPONSE);
    } catch (error) {
      console.error('Verification email delivery failed:', error.message);
      jsonResponse(res, 503, {
        error: 'Your account was created, but the verification email could not be sent. Request a new link to try again.'
      });
    }
    return true;
  }

  if (url.pathname === '/api/auth/resend-verification' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (!body) return true;

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!isValidEmail(email)) {
      jsonResponse(res, 400, { error: 'Enter a valid email address' });
      return true;
    }

    if (!mailer || !fromEmail || !publicAppOrigin) {
      console.error('Verification resend is unavailable because email is not configured');
      jsonResponse(res, 503, { error: 'Verification email service is temporarily unavailable' });
      return true;
    }

    let client;
    let account;
    let token;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
        [email.toLowerCase()]
      );
      const result = await client.query(
        `SELECT profile_id, email
         FROM public.app_users
         WHERE email_normalized = $1 AND email_verified_at IS NULL
         LIMIT 1`,
        [email.toLowerCase()]
      );
      account = result.rows[0];
      if (account) {
        token = await createEmailVerificationToken(client, account.profile_id);
      }
      await client.query('COMMIT');
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Verification resend rollback failed:', rollbackError.message);
        }
      }
      console.error('Verification resend lookup failed:', error.message);
      jsonResponse(res, 503, { error: 'Verification request is temporarily unavailable' });
      return true;
    } finally {
      if (client) client.release();
    }

    if (account) {
      try {
        await sendVerificationMessage({
          mailer,
          fromEmail,
          email: account.email,
          token,
          publicAppOrigin
        });
      } catch (error) {
        console.error('Verification resend delivery failed:', error.message);
      }
    }
    jsonResponse(res, 202, REGISTRATION_RESPONSE);
    return true;
  }

  if (url.pathname === '/api/auth/verify-email' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (!body) return true;

    const token = typeof body.token === 'string' ? body.token : '';
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      jsonResponse(res, 400, { error: 'Verification link is invalid or expired' });
      return true;
    }

    try {
      const result = await pool.query(
        `WITH claimed AS (
           UPDATE public.app_email_verification_tokens
           SET consumed_at = now()
           WHERE token_hash = $1
             AND consumed_at IS NULL
             AND expires_at > now()
           RETURNING profile_id
         ),
         verified AS (
           UPDATE public.app_users u
           SET email_verified_at = COALESCE(u.email_verified_at, now())
           FROM claimed c
           WHERE u.profile_id = c.profile_id
           RETURNING u.profile_id
         )
         SELECT profile_id FROM verified`,
        [hashSessionToken(token)]
      );
      if (result.rows.length === 0) {
        jsonResponse(res, 400, { error: 'Verification link is invalid or expired' });
        return true;
      }
      jsonResponse(res, 200, { status: 'verified' });
    } catch (error) {
      console.error('Email verification failed:', error.message);
      jsonResponse(res, 503, { error: 'Email verification is temporarily unavailable' });
    }
    return true;
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (!body) return true;

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || email.length > 320 || !password || password.length > 1024) {
      jsonResponse(res, 400, { error: 'Email and password are required' });
      return true;
    }

    let result;
    try {
      result = await pool.query(
        `SELECT u.profile_id, u.password_hash, u.email_verified_at,
                p.full_name, p.divisi, p.jabatan
         FROM public.app_users u
         JOIN public.profiles p ON p.id = u.profile_id
         WHERE u.email_normalized = $1
         LIMIT 1`,
        [email]
      );
    } catch (error) {
      console.error('Login database query failed:', error.message);
      jsonResponse(res, 503, { error: 'Login is temporarily unavailable' });
      return true;
    }

    const user = result.rows[0];
    const passwordMatches = await verifyPassword(password, user?.password_hash ?? null);
    if (!user || !passwordMatches || !user.email_verified_at) {
      jsonResponse(res, 401, { error: 'Email or password is incorrect' });
      return true;
    }

    const token = randomBytes(32).toString('base64url');
    try {
      await pool.query(
        `INSERT INTO public.app_sessions (token_hash, profile_id, expires_at)
         VALUES ($1, $2, now() + interval '7 days')`,
        [hashSessionToken(token), user.profile_id]
      );
    } catch (error) {
      console.error('Session creation failed:', error.message);
      jsonResponse(res, 503, { error: 'Login is temporarily unavailable' });
      return true;
    }

    jsonResponse(res, 200, {
      user: {
        id: user.profile_id,
        full_name: user.full_name,
        divisi: user.divisi,
        jabatan: user.jabatan
      }
    }, { 'Set-Cookie': sessionCookie(token) });
    return true;
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      jsonResponse(res, 401, { error: 'Not authenticated' });
      return true;
    }

    try {
      const result = await pool.query(
        `SELECT p.id, p.full_name, p.divisi, p.jabatan
         FROM public.app_sessions s
         JOIN public.app_users u ON u.profile_id = s.profile_id
         JOIN public.profiles p ON p.id = s.profile_id
         WHERE s.token_hash = $1
           AND s.expires_at > now()
           AND u.email_verified_at IS NOT NULL
         LIMIT 1`,
        [hashSessionToken(token)]
      );
      const user = result.rows[0];
      if (!user) {
        jsonResponse(res, 401, { error: 'Not authenticated' }, {
          'Set-Cookie': clearSessionCookie()
        });
        return true;
      }
      jsonResponse(res, 200, { user });
    } catch (error) {
      console.error('Session lookup failed:', error.message);
      jsonResponse(res, 503, { error: 'Session check is temporarily unavailable' });
    }
    return true;
  }

  if (url.pathname === '/api/auth/setup-password' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (!body) return true;

    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      jsonResponse(res, 400, { error: 'Setup link is invalid or expired' });
      return true;
    }
    if (password.length < 6 || password.length > 1024) {
      jsonResponse(res, 400, { error: 'Password must be at least 6 characters' });
      return true;
    }

    const sessionToken = randomBytes(32).toString('base64url');
    let result;
    try {
      result = await pool.query(
        `WITH claimed AS (
           UPDATE public.app_setup_tokens
           SET consumed_at = now()
           WHERE token_hash = $1
             AND consumed_at IS NULL
             AND expires_at > now()
           RETURNING profile_id
         ),
         updated_user AS (
           UPDATE public.app_users u
           SET password_hash = $2,
               email_verified_at = COALESCE(u.email_verified_at, now())
           FROM claimed c
           WHERE u.profile_id = c.profile_id
           RETURNING u.profile_id
         ),
         created_session AS (
           INSERT INTO public.app_sessions (token_hash, profile_id, expires_at)
           SELECT $3, u.profile_id, now() + interval '7 days'
           FROM updated_user u
           RETURNING profile_id
         )
         SELECT p.id, p.full_name, p.divisi, p.jabatan
         FROM created_session s
         JOIN public.profiles p ON p.id = s.profile_id`,
        [
          hashSessionToken(token),
          await hashPassword(password),
          hashSessionToken(sessionToken)
        ]
      );
    } catch (error) {
      console.error('Password setup failed:', error.message);
      jsonResponse(res, 503, { error: 'Password setup is temporarily unavailable' });
      return true;
    }

    const user = result.rows[0];
    if (!user) {
      jsonResponse(res, 400, { error: 'Setup link is invalid or expired' });
      return true;
    }

    jsonResponse(res, 200, { user }, { 'Set-Cookie': sessionCookie(sessionToken) });
    return true;
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    const body = await readJsonBody(req, res);
    if (body === null) return true;

    const token = readCookie(req, SESSION_COOKIE);
    if (token && /^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      try {
        await pool.query(
          'DELETE FROM public.app_sessions WHERE token_hash = $1',
          [hashSessionToken(token)]
        );
      } catch (error) {
        console.error('Session revocation failed:', error.message);
        jsonResponse(res, 503, { error: 'Logout is temporarily unavailable' });
        return true;
      }
    }

    jsonResponse(res, 200, { status: 'signed_out' }, {
      'Set-Cookie': clearSessionCookie()
    });
    return true;
  }

  jsonResponse(res, 404, { error: 'Not found' });
  return true;
}

module.exports = {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SETUP_TOKEN_TTL_HOURS,
  handleAuthRequest,
  hashPassword,
  hashSessionToken,
  verifyPassword
};
