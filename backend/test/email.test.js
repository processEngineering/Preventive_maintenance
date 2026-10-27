'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  createGmailTransport,
  sendEmailVerification,
  sendPasswordSetupEmail
} = require('../email');
const {
  createSetupToken,
  validateAppOrigin,
  validateUsers
} = require('../scripts/send-password-setup');

test('Gmail SMTP config uses TLS and strips spaces in app passwords', () => {
  let options;
  const transport = createGmailTransport(
    { GMAIL_ADDRESS: 'department@example.com', GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop' },
    { createTransport: (value) => { options = value; return {}; } }
  );

  assert.deepEqual(transport, {});
  assert.equal(options.host, 'smtp.gmail.com');
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.equal(options.auth.pass, 'abcdefghijklmnop');
});

test('setup email requires HTTPS and sends a plain-text and HTML link', async () => {
  let message;
  const transport = {
    async sendMail(value) {
      message = value;
    }
  };

  await assert.rejects(
    sendPasswordSetupEmail({
      transport,
      from: 'department@example.com',
      to: 'user@example.com',
      setupUrl: 'http://example.com/setup'
    }),
    /HTTPS/
  );
  await sendPasswordSetupEmail({
    transport,
    from: 'department@example.com',
    to: 'user@example.com',
    setupUrl: 'https://example.com/auth/setup-password.html#token=abc'
  });
  assert.match(message.text, /https:\/\/example\.com\/auth\/setup-password\.html#token=abc/);
  assert.match(message.html, /href="https:\/\/example\.com\/auth\/setup-password\.html#token=abc/);
});

test('verification email requires HTTPS and delivers the confirmation link', async () => {
  let message;
  const transport = {
    async sendMail(value) {
      message = value;
    }
  };

  await assert.rejects(
    sendEmailVerification({
      transport,
      from: 'department@example.com',
      to: 'user@example.com',
      verificationUrl: 'http://example.com/auth/verify-email.html'
    }),
    /HTTPS/
  );
  await sendEmailVerification({
    transport,
    from: 'department@example.com',
    to: 'user@example.com',
    verificationUrl: 'https://example.com/auth/verify-email.html#token=abc'
  });
  assert.equal(message.subject, 'Verify your MTC account email');
  assert.match(message.text, /https:\/\/example\.com\/auth\/verify-email\.html#token=abc/);
});

test('account input requires the selected count and unique profile/email pairs', () => {
  const users = Array.from({ length: 22 }, (_, index) => ({
    profile_id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
    email: `user${index + 1}@example.com`
  }));

  assert.equal(validateUsers(users).length, 22);
  assert.equal(validateUsers(users.slice(0, 1), 1).length, 1);
  assert.throws(() => validateUsers(users.slice(0, 21)), /exactly 22/);
  assert.throws(() => validateUsers(users, 1), /exactly 1/);
  assert.throws(
    () => validateUsers([...users.slice(0, 21), { ...users[0], email: 'other@example.com' }]),
    /duplicate/
  );
});

test('setup email origin must be an HTTPS origin without path or credentials', () => {
  assert.equal(validateAppOrigin('https://mtc-test.ngrok-free.dev'), 'https://mtc-test.ngrok-free.dev');
  assert.throws(() => validateAppOrigin('http://mtc-test.local'), /HTTPS frontend origin/);
  assert.throws(() => validateAppOrigin('https://example.com/auth'), /HTTPS frontend origin/);
  assert.throws(() => validateAppOrigin('https://user:pass@example.com'), /HTTPS frontend origin/);
  assert.throws(() => validateAppOrigin(undefined), /HTTPS frontend origin/);
});

test('one-account pilot mapping accepts exactly one unique profile and recipient', () => {
  const user = [{
    profile_id: '00000000-0000-0000-0000-000000000001',
    email: 'pilot@example.com'
  }];
  assert.deepEqual(validateUsers(user, 1), user);
  assert.throws(() => validateUsers([...user, {
    profile_id: '00000000-0000-0000-0000-000000000002',
    email: 'second@example.com'
  }], 1), /exactly 1/);
});

test('setup token provisioning serializes by profile without requiring row-update rights', async () => {
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql);
      if (sql === 'SELECT id FROM public.profiles WHERE id = $1') {
        return { rowCount: 1, rows: [{ id: '00000000-0000-0000-0000-000000000001' }] };
      }
      if (sql.includes('SELECT email_normalized, password_hash')) {
        return {
          rowCount: 1,
          rows: [{ email_normalized: 'pilot@example.com', password_hash: null }]
        };
      }
      return { rowCount: 0, rows: [] };
    },
    release() {}
  };
  const pool = { async connect() { return client; } };
  const token = await createSetupToken(pool, {
    profile_id: '00000000-0000-0000-0000-000000000001',
    email: 'pilot@example.com'
  });

  assert.match(token, /^[A-Za-z0-9_-]{40,50}$/);
  assert.ok(statements.some((sql) => sql.includes('pg_advisory_xact_lock')));
  assert.ok(!statements.some((sql) => sql.includes('FOR UPDATE')));
  assert.equal(statements.at(-1), 'COMMIT');
});
