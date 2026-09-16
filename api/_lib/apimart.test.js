import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fallbackApimartPricing,
  getApimartTask,
  submitApimartGeneration
} from './apimart.js';
import { publicErrorCode, publicErrorStatus, reserveGeneration } from '../generate-image.js';
import { publicStatusErrorCode } from '../generation/status.js';

function jsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

test('platform submission sends the fixed schema and callback base', async () => {
  const calls = [];
  const result = await submitApimartGeneration({
    apiKey: 'platform-key',
    prompt: 'draw a fox',
    language: 'en',
    webhook: 'https://gpt-image2.canghe.ai/api/generation',
    fetchImpl: async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      return jsonResponse(200, { data: { task_id: 'task_abcdefgh' } });
    }
  });
  assert.equal(result.taskId, 'task_abcdefgh');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer platform-key');
  assert.deepEqual(calls[0].body, {
    model: 'gpt-image-2',
    prompt: 'draw a fox',
    n: 1,
    size: '1:1',
    resolution: '1k',
    webhook: 'https://gpt-image2.canghe.ai/api/generation',
    language: 'en'
  });
});

test('platform status parsing carries result URL, expiry and actual cost', async () => {
  const task = await getApimartTask({
    apiKey: 'platform-key',
    taskId: 'task_abcdefgh',
    fetchImpl: async () => jsonResponse(200, {
      data: {
        id: 'task_abcdefgh',
        status: 'completed',
        progress: 100,
        cost: 0.010625,
        result: { images: [{ url: 'https://cdn.example/result.png', expires_at: 1787961600 }] }
      }
    })
  });
  assert.equal(task.image, 'https://cdn.example/result.png');
  assert.equal(task.expiresAt, 1787961600);
  assert.equal(task.cost, 0.010625);
});

test('upstream 401, 402, 429 and 5xx remain distinguishable', async () => {
  for (const [status, code] of [
    [401, 'APIMART_API_KEY_INVALID'],
    [402, 'APIMART_BALANCE_REQUIRED'],
    [429, 'APIMART_RATE_LIMITED'],
    [503, 'APIMART_UNAVAILABLE']
  ]) {
    await assert.rejects(
      submitApimartGeneration({
        apiKey: 'platform-key',
        prompt: 'draw a fox',
        fetchImpl: async () => jsonResponse(status, { error: { message: 'upstream error' } }, { 'retry-after': '4' })
      }),
      { code }
    );
  }
  assert.equal(publicErrorCode({ code: 'APIMART_API_KEY_INVALID' }), 'SERVER_NOT_CONFIGURED');
  assert.equal(publicErrorCode({ code: 'APIMART_BALANCE_REQUIRED' }), 'SERVER_NOT_CONFIGURED');
  assert.equal(publicErrorCode({ code: 'APIMART_RATE_LIMITED' }), 'UPSTREAM_BUSY');
  assert.equal(publicErrorCode({ code: 'APIMART_UNAVAILABLE' }), 'GENERATION_FAILED');
  assert.equal(publicErrorStatus('SERVER_NOT_CONFIGURED'), 500);
  assert.equal(publicErrorStatus('UPSTREAM_BUSY'), 503);
  assert.equal(publicStatusErrorCode({ code: 'APIMART_API_KEY_INVALID' }), 'SERVER_NOT_CONFIGURED');
});

test('pricing fallback is date-labelled and keeps the confirmed 1K snapshot', () => {
  const fallback = fallbackApimartPricing();
  assert.equal(fallback.prices['1k'], 0.010625);
  assert.equal(fallback.stale, true);
  assert.match(fallback.snapshotDate, /^\d{4}-\d{2}-\d{2}$/);
});

test('platform generation reserves the existing free or credit usage before submission', async () => {
  const calls = [];
  const client = {
    async rpc(name, payload) {
      calls.push({ name, payload });
      return { data: [{ reservation_id: 'reservation-1' }], error: null };
    }
  };
  assert.deepEqual(await reserveGeneration(client, { isSuperAdmin: true }, 'user-1', 42, 'draw a fox'), {
    reservationId: 'reservation-1'
  });
  assert.deepEqual(calls[0], {
    name: 'reserve_generation_usage',
    payload: {
      p_user_id: 'user-1',
      p_case_id: 42,
      p_prompt: 'draw a fox',
      p_force_credit: true
    }
  });

  await assert.rejects(
    reserveGeneration({
      async rpc() {
        return { data: null, error: { message: 'CREDITS_REQUIRED' } };
      }
    }, {}, 'user-1', 42, 'draw a fox'),
    { code: 'CREDITS_REQUIRED' }
  );
});
