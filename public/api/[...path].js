'use strict';

const MAX_PROXY_BODY_BYTES = 2 * 1024 * 1024;
const REQUEST_HEADERS = ['accept', 'content-type', 'cookie'];
const RESPONSE_HEADERS = [
  'allow',
  'cache-control',
  'content-type',
  'x-content-type-options'
];

function backendOriginFromEnvironment() {
  const value = process.env.BACKEND_API_ORIGIN;
  if (!value) return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('BACKEND_API_ORIGIN must be an HTTPS origin');
  }
  return validateBackendOrigin(url);
}

function validateBackendOrigin(value) {
  const url = value instanceof URL ? value : new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('BACKEND_API_ORIGIN must be an HTTPS origin without a path');
  }
  return url.origin;
}

async function readRequestBody(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += data.length;
    if (length > MAX_PROXY_BODY_BYTES) {
      const error = new Error('Request body is too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(data);
  }
  return Buffer.concat(chunks);
}

function jsonResponse(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: message }));
}

function createProxyHandler({
  getBackendOrigin = backendOriginFromEnvironment,
  fetchImpl = globalThis.fetch
} = {}) {
  return async function proxyApiRequest(req, res) {
    if (!['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD, POST, PATCH, DELETE' });
      res.end();
      return;
    }

    let backendOrigin;
    let target;
    try {
      const configuredOrigin = getBackendOrigin();
      if (!configuredOrigin) {
        jsonResponse(res, 503, 'Backend API is not configured');
        return;
      }
      backendOrigin = validateBackendOrigin(configuredOrigin);
      target = new URL(req.url, `${backendOrigin}/`);
      if (target.origin !== backendOrigin || !target.pathname.startsWith('/api/')) {
        jsonResponse(res, 400, 'Invalid API route');
        return;
      }
    } catch (error) {
      console.error('Vercel API proxy configuration is invalid:', error.message);
      jsonResponse(res, 503, 'Backend API is not configured correctly');
      return;
    }

    const headers = {};
    for (const name of REQUEST_HEADERS) {
      const value = req.headers[name];
      if (value) headers[name] = Array.isArray(value) ? value.join(', ') : value;
    }
    headers['ngrok-skip-browser-warning'] = 'true';

    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      try {
        body = await readRequestBody(req);
      } catch (error) {
        jsonResponse(res, error.statusCode || 400, error.statusCode === 413
          ? 'Request body is too large'
          : 'Unable to read request body');
        return;
      }
    }

    try {
      const upstream = await fetchImpl(target, {
        method: req.method,
        headers,
        body,
        redirect: 'manual'
      });

      const responseHeaders = {};
      for (const name of RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders[name] = value;
      }
      const cookies = upstream.headers.getSetCookie?.();
      if (cookies?.length) {
        responseHeaders['Set-Cookie'] = cookies;
      } else {
        const cookie = upstream.headers.get('set-cookie');
        if (cookie) responseHeaders['Set-Cookie'] = cookie;
      }

      res.writeHead(upstream.status, responseHeaders);
      if (req.method === 'HEAD' || upstream.status === 204 || upstream.status === 304) {
        res.end();
        return;
      }
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      console.error('Vercel API proxy request failed:', error.message);
      jsonResponse(res, 502, 'Backend API is temporarily unavailable');
    }
  };
}

module.exports = createProxyHandler();
module.exports.createProxyHandler = createProxyHandler;
module.exports.config = { api: { bodyParser: false } };
