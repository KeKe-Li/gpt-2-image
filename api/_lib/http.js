export function json(res, status, payload, { cacheControl = 'no-store' } = {}) {
  if (cacheControl) {
    res.setHeader('Cache-Control', cacheControl);
  }
  return res.status(status).json(payload);
}

export function methodNotAllowed(res, allow, options = {}) {
  res.setHeader('Allow', allow);
  return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' }, options);
}

export async function readJsonBody(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8');

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
