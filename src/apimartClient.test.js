import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearStoredApimartKey,
  getPendingGeneration,
  getSavedGeneration,
  getStoredApimartKey,
  maskApimartKey,
  pollApimartTask,
  saveGeneratedTest,
  savePendingGeneration,
  saveStoredApimartKey,
  submitPersonalGeneration,
  submitPlatformGeneration
} from './apimartClient.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test('personal key stays in browser storage and is displayed only as a suffix mask', () => {
  const storage = new MemoryStorage();
  const key = 'apimart_secret_12345678';
  assert.equal(saveStoredApimartKey(key, storage), true);
  assert.equal(getStoredApimartKey(storage), key);
  assert.equal(maskApimartKey(key), '••••••••5678');
  clearStoredApimartKey(storage);
  assert.equal(getStoredApimartKey(storage), '');
});

test('pending tasks persist without an API key and expired results are removed', () => {
  const storage = new MemoryStorage();
  savePendingGeneration(42, {
    taskId: 'task_abcdefgh',
    mode: 'personal',
    prompt: 'draw a lighthouse'
  }, storage);
  const pending = getPendingGeneration(42, storage);
  assert.equal(pending.taskId, 'task_abcdefgh');
  assert.equal(JSON.stringify(pending).includes('apiKey'), false);

  saveGeneratedTest(42, {
    image: 'https://cdn.example/expired.png',
    savedAt: '2026-08-28T00:00:00.000Z',
    expiresAt: 100
  }, storage);
  assert.equal(getSavedGeneration(42, storage, 101000), null);
});

test('personal submission sends the fixed APIMart schema directly', async () => {
  const calls = [];
  const result = await submitPersonalGeneration('draw a fox', 'personal-key', 'zh', async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ data: { task_id: 'task_abcdefgh' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  });
  assert.equal(result.taskId, 'task_abcdefgh');
  assert.match(calls[0].url, /api\.apimart\.ai\/v1\/images\/generations$/);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer personal-key');
  assert.deepEqual(calls[0].body, {
    model: 'gpt-image-2',
    prompt: 'draw a fox',
    n: 1,
    size: '1:1',
    resolution: '1k',
    language: 'zh'
  });
});

test('platform submission contains only site auth and generation fields', async () => {
  const calls = [];
  await submitPlatformGeneration({
    caseId: 42,
    prompt: 'draw a fox',
    language: 'en',
    accessToken: 'site-session-token'
  }, async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ ok: true, taskId: 'task_abcdefgh', status: 'submitted' }), {
      status: 202,
      headers: { 'content-type': 'application/json' }
    });
  });
  assert.equal(calls[0].url, '/api/generate-image');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer site-session-token');
  assert.deepEqual(calls[0].body, { caseId: 42, prompt: 'draw a fox', language: 'en' });
  assert.equal(JSON.stringify(calls[0]).includes('personal-key'), false);
});

test('polling stops on completion and honors Retry-After waits', async () => {
  const waits = [];
  let calls = 0;
  const task = await pollApimartTask(async () => {
    calls += 1;
    if (calls === 1) {
      const error = new Error('APIMART_RATE_LIMITED');
      error.code = error.message;
      error.retryAfterMs = 7000;
      throw error;
    }
    if (calls === 2) return { status: 'processing', progress: 50 };
    return { status: 'completed', progress: 100, image: 'https://cdn.example/result.png' };
  }, {
    intervalMs: 2000,
    waitImpl: async (milliseconds) => waits.push(milliseconds),
    now: () => 0
  });
  assert.equal(task.status, 'completed');
  assert.deepEqual(waits, [7000, 2000]);
});

test('polling times out without submitting another task', async () => {
  let fetchCount = 0;
  await assert.rejects(
    pollApimartTask(async () => {
      fetchCount += 1;
      return { status: 'processing', progress: fetchCount };
    }, {
      maxAttempts: 2,
      intervalMs: 1,
      waitImpl: async () => {},
      now: () => 0
    }),
    { code: 'APIMART_TASK_TIMEOUT' }
  );
  assert.equal(fetchCount, 2);
});
