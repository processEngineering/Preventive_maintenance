'use strict';

const { randomBytes, createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const {
  createGmailTransport,
  sendPasswordSetupEmail,
  validateAppOrigin
} = require('../email');

const EXPECTED_USERS = 22;
const SETUP_TOKEN_HOURS = 24;
const PRODUCTION_DATABASE = 'mtc';
const PRODUCTION_PROVISIONER = 'mtc_api_provisioner';

function validateUsers(users, expectedCount = EXPECTED_USERS) {
  if (!Array.isArray(users) || users.length !== expectedCount) {
    throw new Error(`Input must contain exactly ${expectedCount} users`);
  }

  const ids = new Set();
  const emails = new Set();
  for (const user of users) {
    if (
      !user || typeof user.profile_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.profile_id)
    ) {
      throw new Error('Every user must have a valid profile_id');
    }
    if (typeof user.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      throw new Error('Every user must have a valid email');
    }
    const id = user.profile_id.toLowerCase();
    const email = user.email.trim().toLowerCase();
    if (ids.has(id) || emails.has(email)) {
      throw new Error('Input contains duplicate profile IDs or emails');
    }
    ids.add(id);
    emails.add(email);
  }
  return users.map((user) => ({
    profile_id: user.profile_id.toLowerCase(),
    email: user.email.trim()
  }));
}

function validateProvisioningEnvironment(mode, env) {
  if (mode === '--send-one-production') {
    if (
      env.APP_ENVIRONMENT !== 'production' ||
      env.PGDATABASE !== PRODUCTION_DATABASE ||
      env.PGUSER !== PRODUCTION_PROVISIONER
    ) {
      throw new Error(
        `Production provisioning requires APP_ENVIRONMENT=production, ` +
        `PGDATABASE=${PRODUCTION_DATABASE}, and PGUSER=${PRODUCTION_PROVISIONER}`
      );
    }
    return;
  }

  if (env.PGDATABASE !== 'mtc_migration_test2') {
    throw new Error('PGDATABASE must be mtc_migration_test2');
  }
}

function validateProductionRecipientConfirmation(user, env) {
  if (
    !env.CONFIRM_PRODUCTION_SETUP_EMAIL ||
    user.email.toLowerCase() !== env.CONFIRM_PRODUCTION_SETUP_EMAIL.trim().toLowerCase()
  ) {
    throw new Error(
      'CONFIRM_PRODUCTION_SETUP_EMAIL must exactly match the single production recipient'
    );
  }
}

async function createSetupToken(pool, user) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
      [user.profile_id]
    );
    const profile = await client.query(
      'SELECT id FROM public.profiles WHERE id = $1',
      [user.profile_id]
    );
    if (profile.rowCount !== 1) {
      throw new Error('A supplied profile ID does not exist');
    }

    await client.query(
      `INSERT INTO public.app_users (profile_id, email)
       VALUES ($1, $2)
       ON CONFLICT (profile_id) DO NOTHING`,
      [user.profile_id, user.email]
    );
    const existing = await client.query(
      `SELECT email_normalized, password_hash
       FROM public.app_users
       WHERE profile_id = $1`,
      [user.profile_id]
    );
    if (
      existing.rowCount !== 1 ||
      existing.rows[0].email_normalized !== user.email.toLowerCase() ||
      existing.rows[0].password_hash
    ) {
      throw new Error('Existing account does not match the supplied setup record');
    }

    await client.query(
      `DELETE FROM public.app_setup_tokens
       WHERE profile_id = $1 AND consumed_at IS NULL`,
      [user.profile_id]
    );
    await client.query(
      `INSERT INTO public.app_setup_tokens (token_hash, profile_id, expires_at)
       VALUES ($1, $2, now() + ($3 * interval '1 hour'))`,
      [tokenHash, user.profile_id, SETUP_TOKEN_HOURS]
    );
    await client.query('COMMIT');
    return token;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const mode = process.argv[2];
  const usersPathArgument = process.argv[3];
  if (
    !['--check-test', '--send-test', '--send-all', '--send-one-production'].includes(mode) ||
    !usersPathArgument
  ) {
    throw new Error(
      'Usage: node scripts/send-password-setup.js --check-test <private-user.json>, ' +
      '--send-test <private-user.json>, ' +
      '--send-all <private-users.json>, or ' +
      '--send-one-production <private-user.json>'
    );
  }
  if (mode === '--send-all' && process.env.CONFIRM_SEND_ALL !== String(EXPECTED_USERS)) {
    throw new Error(`Set CONFIRM_SEND_ALL=${EXPECTED_USERS} to authorize all-user email delivery`);
  }
  validateProvisioningEnvironment(mode, process.env);

  const appOrigin = mode === '--check-test'
    ? null
    : validateAppOrigin(process.env.PUBLIC_APP_ORIGIN);

  const usersPath = path.resolve(usersPathArgument);
  const expectedCount = mode === '--send-all' ? EXPECTED_USERS : 1;
  const users = validateUsers(
    JSON.parse(await fs.readFile(usersPath, 'utf8')),
    expectedCount
  );
  if (
    mode !== '--send-all' &&
    mode !== '--send-one-production' &&
    (!process.env.SETUP_TEST_EMAIL ||
      users[0].email.toLowerCase() !== process.env.SETUP_TEST_EMAIL.trim().toLowerCase())
  ) {
    throw new Error('SETUP_TEST_EMAIL must match the single test recipient in the private input file');
  }
  if (mode === '--send-one-production') {
    validateProductionRecipientConfirmation(users[0], process.env);
  }
  const transport = createGmailTransport(process.env, nodemailer);
  await transport.verify();

  const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 1,
    connectionTimeoutMillis: 5000
  });

  let sent = 0;
  try {
    const profileIds = users.map((user) => user.profile_id);
    const existingProfiles = await pool.query(
      'SELECT id FROM public.profiles WHERE id = ANY($1::uuid[])',
      [profileIds]
    );
    if (existingProfiles.rowCount !== users.length) {
      throw new Error('The input profile ID does not match a profile in the selected database');
    }

    const appUsers = await pool.query(
      `SELECT profile_id, email_normalized, password_hash
       FROM public.app_users
       WHERE profile_id = ANY($1::uuid[])`,
      [profileIds]
    );
    if (
      mode === '--send-one-production' &&
      appUsers.rows.some((account) =>
        account.email_normalized !== users[0].email.toLowerCase() || account.password_hash
      )
    ) {
      throw new Error(
        'The profile already has a different email or an established password; no email was sent'
      );
    }
    if (mode !== '--send-one-production' && appUsers.rowCount !== 0) {
      throw new Error('Test profile already has a provisioned app user');
    }

    if (mode === '--check-test') {
      console.log('Preflight passed. No account, token, or email was created.');
      return;
    }

    for (const user of users) {
      const token = await createSetupToken(pool, user);
      const setupUrl = new URL('/auth/setup-password.html', appOrigin);
      setupUrl.hash = new URLSearchParams({ token }).toString();
      try {
        await sendPasswordSetupEmail({
          transport,
          from: process.env.GMAIL_ADDRESS,
          to: user.email,
          setupUrl: setupUrl.toString()
        });
        sent += 1;
      } catch (error) {
        const tokenHash = createHash('sha256').update(token).digest('hex');
        await pool.query(
          'DELETE FROM public.app_setup_tokens WHERE token_hash = $1 AND consumed_at IS NULL',
          [tokenHash]
        );
        throw error;
      }
    }
    console.log(`Sent ${sent} password setup email${sent === 1 ? '' : 's'}.`);
  } finally {
    await pool.end();
    transport.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  createSetupToken,
  validateAppOrigin,
  validateProductionRecipientConfirmation,
  validateProvisioningEnvironment,
  validateUsers
};
