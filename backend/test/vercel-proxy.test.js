'use strict';

const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { test } = require('node:test');
const { createProxyHandler } = require('../../public/api/[...path]');

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    writeHead(statusCode, headers = {}) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    }
  };
}

test('Vercel API proxy forwards API path, query, cookie, body, and session response headers', async () => {
  let upstreamUrl;
  let upstreamOptions;
  const handler = createProxyHandler({
    getBackendOrigin: () => 'https://test-tunnel.example',
    fetchImpl: async (url, options) => {
      upstreamUrl = String(url);
      upstreamOptions = options;
      return {
        status: 200,
        headers: {
          get(name) {
            return {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'no-store'
            }[name] || null;
          },
          getSetCookie() {
            return ['mtc_session=opaque; Path=/; HttpOnly; Secure; SameSite=Lax'];
          }
        },
        async arrayBuffer() {
          return Buffer.from('{"user":{"id":"test"}}');
        }
      };
    }
  });
  const req = Readable.from([Buffer.from('{"email":"user@example.com"}')]);
  req.method = 'POST';
  req.url = '/api/auth/login?flow=test';
  req.headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    cookie: 'existing=value',
    host: 'mtc.vercel.app'
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(upstreamUrl, 'https://test-tunnel.example/api/auth/login?flow=test');
  assert.equal(upstreamOptions.method, 'POST');
  assert.equal(upstreamOptions.headers.cookie, 'existing=value');
  assert.equal(upstreamOptions.headers.host, undefined);
  assert.equal(upstreamOptions.headers['ngrok-skip-browser-warning'], 'true');
  assert.equal(upstreamOptions.body.toString(), '{"email":"user@example.com"}');
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Set-Cookie'][0], 'mtc_session=opaque; Path=/; HttpOnly; Secure; SameSite=Lax');
  assert.equal(res.body.toString(), '{"user":{"id":"test"}}');
});

test('Vercel API proxy requires a configured HTTPS origin', async () => {
  const res = createResponse();
  const handler = createProxyHandler({
    getBackendOrigin: () => 'http://localhost:3000',
    fetchImpl: async () => {
      throw new Error('upstream must not be called');
    }
  });
  const req = Readable.from([]);
  req.method = 'GET';
  req.url = '/api/auth/me';
  req.headers = {};

  await handler(req, res);

  assert.equal(res.statusCode, 503);
  assert.deepEqual(JSON.parse(res.body), {
    error: 'Backend API is not configured correctly'
  });
});

test('Vercel API proxy rejects unsupported methods without contacting backend', async () => {
  const res = createResponse();
  const handler = createProxyHandler({
    getBackendOrigin: () => 'https://test-tunnel.example',
    fetchImpl: async () => {
      throw new Error('upstream must not be called');
    }
  });
  const req = Readable.from([]);
  req.method = 'PUT';
  req.url = '/api/data/chslr_log';
  req.headers = {};

  await handler(req, res);

  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET, HEAD, POST, PATCH, DELETE');
});
