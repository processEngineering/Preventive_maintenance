'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const { handleAuthRequest } = require('./auth');
const { handleChslrRequest } = require('./api/chslr-api');
const { createGmailTransport, validateAppOrigin } = require('./email');

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json']
]);

async function serveStaticFile(req, res, publicRoot) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  if (pathname.split(/[\\/]/).some((part) => part.startsWith('.'))) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let filePath = path.resolve(publicRoot, `.${pathname}`);
  const relativePath = path.relative(publicRoot, filePath);
  if (
    path.isAbsolute(relativePath) ||
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`)
  ) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    let info = await fs.stat(filePath);
    if (info.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      info = await fs.stat(filePath);
    }
    if (!info.isFile()) throw new Error('Requested path is not a file');

    const contents = req.method === 'HEAD' ? null : await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ||
        'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(contents);
  } catch (error) {
    if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') {
      console.error('Static file request failed:', error.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Unable to serve file' }));
      return;
    }
    res.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

function createServer(pool, {
  publicRoot = path.resolve(__dirname, '..', 'public'),
  mailer = null,
  fromEmail = null,
  publicAppOrigin = null
} = {}) {
  return http.createServer(async (req, res) => {
    if (req.url === '/api/version') {
      if (req.method !== 'GET') {
        res.writeHead(405, { Allow: 'GET' });
        res.end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end(JSON.stringify({ service: 'mtc-postgres-api', build: 'checklist-batch-2026-10-28' }));
      return;
    }

    if (await handleAuthRequest(req, res, pool, { mailer, fromEmail, publicAppOrigin })) return;
    if (await handleChslrRequest(req, res, pool)) return;

    if (req.url.startsWith('/api/')) {
      res.writeHead(404, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');

    if (req.url === '/healthz' || req.url === '/readyz') {
      if (req.method !== 'GET') {
        res.writeHead(405, { Allow: 'GET' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      if (req.url === '/healthz') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      try {
        await pool.query('SELECT 1 FROM public.profiles LIMIT 1');
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ready', database: 'connected' }));
      } catch (error) {
        console.error('Database readiness check failed:', error.message);
        res.writeHead(503);
        res.end(JSON.stringify({ status: 'unavailable' }));
      }
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    await serveStaticFile(req, res, publicRoot);
  });
}

function validateDatabaseEnvironment(env) {
  const required = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missing = required.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  }

  if (env.PGDATABASE !== 'mtc_migration_test2') {
    throw new Error('PGDATABASE must be mtc_migration_test2 for this connectivity proof');
  }

  const port = env.PGPORT ? Number(env.PGPORT) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PGPORT must be an integer between 1 and 65535');
  }

  const host = env.API_HOST || '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0'].includes(host)) {
    throw new Error('API_HOST must be 127.0.0.1 or 0.0.0.0');
  }

  return { port, host };
}

function start() {
  const { port: databasePort, host } = validateDatabaseEnvironment(process.env);
  const publicAppOrigin = process.env.PUBLIC_APP_ORIGIN
    ? validateAppOrigin(process.env.PUBLIC_APP_ORIGIN)
    : null;
  const mailer = process.env.GMAIL_ADDRESS || process.env.GMAIL_APP_PASSWORD
    ? createGmailTransport(process.env, nodemailer)
    : null;
  const apiPort = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  const pool = new Pool({
    host: process.env.PGHOST,
    port: databasePort,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000
  });
  const server = createServer(pool, {
    mailer,
    fromEmail: process.env.GMAIL_ADDRESS || null,
    publicAppOrigin
  });

  server.listen(apiPort, host, () => {
    console.log(`MTC API listening on http://${host}:${apiPort}`);
  });

  const shutdown = () => {
    server.close(async (error) => {
      if (error) {
        console.error('API shutdown failed:', error.message);
        process.exitCode = 1;
      }
      await pool.end();
      mailer?.close();
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) {
  try {
    start();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createServer, validateDatabaseEnvironment };
