'use strict';

function createGmailTransport(env, nodemailer) {
  const required = ['GMAIL_ADDRESS', 'GMAIL_APP_PASSWORD'];
  const missing = required.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required email environment variables: ${missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: env.GMAIL_ADDRESS,
      pass: env.GMAIL_APP_PASSWORD.replace(/\s+/g, '')
    }
  });
}

function validateAppOrigin(value) {
  let parsedOrigin;
  try {
    parsedOrigin = new URL(value);
  } catch {
    throw new Error('PUBLIC_APP_ORIGIN must be the HTTPS frontend origin');
  }
  if (
    parsedOrigin.protocol !== 'https:' ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    parsedOrigin.pathname !== '/' ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new Error('PUBLIC_APP_ORIGIN must be the HTTPS frontend origin');
  }
  return parsedOrigin.origin;
}

async function sendPasswordSetupEmail({ transport, from, to, setupUrl }) {
  if (!from || !to || !setupUrl) {
    throw new Error('Sender, recipient, and setup link are required');
  }

  const parsedUrl = new URL(setupUrl);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Password setup links must use HTTPS');
  }

  try {
    await transport.sendMail({
      from,
      to,
      subject: 'Set up your MTC account password',
      text: `Use this one-time link to set your MTC account password. It expires in 24 hours:\n\n${setupUrl}\n\nIf you did not expect this email, you can ignore it.`,
      html: `<p>Use this one-time link to set your MTC account password. It expires in 24 hours:</p><p><a href="${setupUrl}">Set up your MTC password</a></p><p>If you did not expect this email, you can ignore it.</p>`
    });
  } catch {
    throw new Error('Could not send password setup email');
  }
}

async function sendEmailVerification({ transport, from, to, verificationUrl }) {
  if (!from || !to || !verificationUrl) {
    throw new Error('Sender, recipient, and verification link are required');
  }

  const parsedUrl = new URL(verificationUrl);
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Email verification links must use HTTPS');
  }

  try {
    await transport.sendMail({
      from,
      to,
      subject: 'Verify your MTC account email',
      text: `Use this one-time link to verify your MTC account. It expires in 24 hours:\n\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`,
      html: `<p>Use this one-time link to verify your MTC account. It expires in 24 hours:</p><p><a href="${verificationUrl}">Verify your email</a></p><p>If you did not create this account, you can ignore this email.</p>`
    });
  } catch {
    throw new Error('Could not send email verification message');
  }
}

async function sendActivationRequestEmail({ transport, from, to, requesterEmail, approvalUrl }) {
  if (!from || !to || !requesterEmail || !approvalUrl) {
    throw new Error('Sender, admin recipient, requester email, and approval link are required');
  }

  const parsedApprovalUrl = new URL(approvalUrl);
  if (parsedApprovalUrl.protocol !== 'https:') {
    throw new Error('Activation approval links must use HTTPS');
  }
  const escapeHtml = (value) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  try {
    await transport.sendMail({
      from,
      to,
      subject: 'Permintaan aktivasi akun MTC',
      text: [
        'Permintaan aktivasi akun berikut diterima:',
        '',
        requesterEmail,
        '',
        'Tinjau dan setujui permintaan ini untuk mengirim tautan setup kata sandi kepada pemohon.',
        'Jangan setujui jika Anda tidak mengenali atau tidak dapat memverifikasi pemohon.',
        '',
        `Tinjau permintaan: ${approvalUrl}`
      ].join('\n'),
      html: [
        '<h2>Permintaan aktivasi akun berikut</h2>',
        `<p><strong>${escapeHtml(requesterEmail)}</strong></p>`,
        '<p>Tinjau dan setujui permintaan ini untuk mengirim tautan setup kata sandi kepada pemohon.</p>',
        '<p>Jangan setujui jika Anda tidak mengenali atau tidak dapat memverifikasi pemohon.</p>',
        `<p><a href="${escapeHtml(approvalUrl)}">Tinjau dan setujui aktivasi akun</a></p>`,
        '<p>Pengguna harus membuat kata sandi sebelum dapat masuk.</p>'
      ].join('')
    });
  } catch {
    throw new Error('Could not send activation request email');
  }
}

module.exports = {
  createGmailTransport,
  sendActivationRequestEmail,
  sendEmailVerification,
  sendPasswordSetupEmail,
  validateAppOrigin
};
