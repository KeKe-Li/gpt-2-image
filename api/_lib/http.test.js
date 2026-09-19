import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  json,
  methodNotAllowed,
  readJsonBody,
  readRawBody
} from './http.js';

const generateImageSource = readFileSync(new URL('../generate-image.js', import.meta.url), 'utf8');
const callbackSource = readFileSync(new URL('../generation/callback.js', import.meta.url), 'utf8');
const statusSource = readFileSync(new URL('../generation/status.js', import.meta.url), 'utf8');
const historySource = readFileSync(new URL('../generation/history.js', import.meta.url), 'utf8');
const billingSource = readFileSync(new URL('./billing.js', import.meta.url), 'utf8');

test('readJsonBody 统一处理 object string buffer 与 stream', async () => {
  assert.deepEqual(await readJsonBody({ body: { ok: true } }), { ok: true });
  assert.deepEqual(await readJsonBody({ body: '{"ok":true}' }), { ok: true });
  assert.deepEqual(await readJsonBody({ body: Buffer.from('{"ok":true}') }), { ok: true });

  const chunks = [Buffer.from('{"ok"'), Buffer.from(':true}')];
  const streamLike = {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
  assert.deepEqual(await readJsonBody(streamLike), { ok: true });
});

test('readRawBody 统一处理 string buffer 与 stream', async () => {
  assert.deepEqual(await readRawBody({ body: Buffer.from('abc') }), Buffer.from('abc'));
  assert.deepEqual(await readRawBody({ body: 'abc' }), Buffer.from('abc'));

  const streamLike = {
    async *[Symbol.asyncIterator]() {
      yield 'a';
      yield Buffer.from('bc');
    }
  };
  assert.deepEqual(await readRawBody(streamLike), Buffer.from('abc'));
});

test('json 与 methodNotAllowed 统一写响应头和错误体', () => {
  const state = { headers: {}, status: null, payload: null };
  const res = {
    setHeader(key, value) {
      state.headers[key] = value;
    },
    status(code) {
      state.status = code;
      return {
        json(payload) {
          state.payload = payload;
        }
      };
    }
  };

  json(res, 202, { ok: true });
  assert.equal(state.headers['Cache-Control'], 'no-store');
  assert.equal(state.status, 202);
  assert.deepEqual(state.payload, { ok: true });

  methodNotAllowed(res, 'POST');
  assert.equal(state.headers.Allow, 'POST');
  assert.equal(state.status, 405);
  assert.deepEqual(state.payload, { ok: false, error: 'METHOD_NOT_ALLOWED' });
});

test('生成链路与 billing 共享同一组 HTTP helper', () => {
  assert.match(generateImageSource, /from '\.\/_lib\/http\.js'/);
  assert.match(generateImageSource, /readJsonBody/);
  assert.doesNotMatch(generateImageSource, /async function readBody/);
  assert.doesNotMatch(generateImageSource, /function json\(res, status, payload\)/);

  assert.match(callbackSource, /from '\.\.\/_lib\/http\.js'/);
  assert.match(callbackSource, /readJsonBody/);
  assert.doesNotMatch(callbackSource, /async function readBody/);
  assert.doesNotMatch(callbackSource, /function json\(res, status, payload\)/);

  assert.match(statusSource, /from '\.\.\/_lib\/http\.js'/);
  assert.match(statusSource, /methodNotAllowed/);
  assert.doesNotMatch(statusSource, /function json\(res, status, payload\)/);

  assert.match(historySource, /from '\.\.\/_lib\/http\.js'/);
  assert.match(historySource, /methodNotAllowed/);
  assert.doesNotMatch(historySource, /function json\(res, status, payload\)/);

  assert.match(billingSource, /from '\.\/http\.js'/);
  assert.match(billingSource, /export \{ readJsonBody, readRawBody \}/);
});
