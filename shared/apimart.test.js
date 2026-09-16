import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APIMART_DEFAULT_PRICE_USD,
  APIMART_MODEL,
  apimartErrorCode,
  apimartTaskErrorCode,
  buildApimartGenerationPayload,
  extractApimartTaskId,
  normalizeApimartExpiry,
  normalizeApimartTask,
  parseApimartPricing,
  retryAfterMilliseconds
} from './apimart.js';

test('generation payload locks GPT-Image-2 to one 1K square image', () => {
  assert.deepEqual(buildApimartGenerationPayload('  draw a fox  ', {
    language: 'zh',
    webhook: 'https://example.com/api/generation',
    n: 9,
    size: '16:9',
    resolution: '4k'
  }), {
    model: APIMART_MODEL,
    prompt: 'draw a fox',
    n: 1,
    size: '1:1',
    resolution: '1k',
    webhook: 'https://example.com/api/generation',
    language: 'zh'
  });
});

test('task ids and async task responses are normalized', () => {
  assert.equal(extractApimartTaskId({ data: { task_id: 'task_12345678' } }), 'task_12345678');
  const task = normalizeApimartTask({
    data: {
      id: 'task_12345678',
      status: 'in_progress',
      progress: '67',
      cost: '0.010625',
      result: {
        images: [{
          url: ['https://cdn.example/result.png'],
          expires_at: '2026-08-29T00:00:00.000Z'
        }]
      }
    }
  });
  assert.equal(task.status, 'processing');
  assert.equal(task.progress, 67);
  assert.equal(task.image, 'https://cdn.example/result.png');
  assert.equal(task.cost, 0.010625);
  assert.equal(task.expiresAt, Date.parse('2026-08-29T00:00:00.000Z') / 1000);
});

test('expiry accepts seconds, milliseconds and ISO dates', () => {
  assert.equal(normalizeApimartExpiry(1787961600), 1787961600);
  assert.equal(normalizeApimartExpiry(1787961600000), 1787961600);
  assert.equal(normalizeApimartExpiry('2026-08-29T00:00:00.000Z'), 1787961600);
  assert.equal(normalizeApimartExpiry('invalid'), null);
});

test('Retry-After supports seconds and HTTP dates with bounded waits', () => {
  assert.equal(retryAfterMilliseconds('3'), 3000);
  assert.equal(retryAfterMilliseconds('120'), 60000);
  assert.equal(retryAfterMilliseconds('Thu, 01 Jan 2026 00:00:05 GMT', 2000, Date.parse('2026-01-01T00:00:00Z')), 5000);
  assert.equal(retryAfterMilliseconds('invalid', 2500), 2500);
});

test('pricing parser uses live 1K pricing and safe fallbacks', () => {
  assert.deepEqual(parseApimartPricing({
    data: {
      model_name: 'gpt-image-2',
      resolution_prices: { '1K': 0.010625, '2K': 0.0175, '4K': 0.02625 }
    }
  }).prices, { '1k': 0.010625, '2k': 0.0175, '4k': 0.02625 });
  assert.equal(parseApimartPricing({}).prices['1k'], APIMART_DEFAULT_PRICE_USD);
});

test('HTTP and terminal task errors map to distinct user-facing classes', () => {
  assert.equal(apimartErrorCode(401, {}), 'APIMART_API_KEY_INVALID');
  assert.equal(apimartErrorCode(402, {}), 'APIMART_BALANCE_REQUIRED');
  assert.equal(apimartErrorCode(429, {}), 'APIMART_RATE_LIMITED');
  assert.equal(apimartErrorCode(503, {}), 'APIMART_UNAVAILABLE');
  assert.equal(apimartErrorCode(400, { error: { code: 'moderation_failed' } }), 'APIMART_REQUEST_REJECTED');
  assert.equal(apimartTaskErrorCode({ errorCode: 'NSFW_CONTENT_DETECTED' }), 'APIMART_REQUEST_REJECTED');
  assert.equal(apimartTaskErrorCode({ errorMessage: 'Insufficient balance' }), 'APIMART_BALANCE_REQUIRED');
  assert.equal(apimartTaskErrorCode({ errorMessage: 'unknown worker failure' }), 'APIMART_TASK_FAILED');
});
