import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  findPlatformGeneration,
  formatStoredGeneration,
  providerFieldsForTask,
  settlePlatformGeneration
} from './generation.js';
import { reconcileApimartCallback } from '../generation/callback.js';

const migration = readFileSync(fileURLToPath(new URL(
  '../../supabase/migrations/20260828090000_apimart_generation_tasks.sql',
  import.meta.url
)), 'utf8');
const callbackSource = readFileSync(fileURLToPath(new URL('../generation/callback.js', import.meta.url)), 'utf8');
const statusSource = readFileSync(fileURLToPath(new URL('../generation/status.js', import.meta.url)), 'utf8');

function settlementClient() {
  const calls = [];
  const client = {
    calls,
    from(table) {
      assert.equal(table, 'generation_reservations');
      return {
        update(fields) {
          calls.push({ type: 'update', fields, filters: [] });
          const call = calls.at(-1);
          const chain = {
            eq(key, value) {
              call.filters.push([key, value]);
              return chain;
            },
            then(resolve) {
              resolve({ error: null });
            }
          };
          return chain;
        }
      };
    },
    async rpc(name, payload) {
      calls.push({ type: 'rpc', name, payload });
      return { error: null };
    }
  };
  return client;
}

test('provider settlement stores actual billing and expiring result fields', () => {
  assert.deepEqual(providerFieldsForTask({
    image: 'https://cdn.example/result.png',
    expiresAt: 1787961600,
    cost: 0.010625
  }), {
    provider_cost_usd: 0.010625,
    provider_result_url: 'https://cdn.example/result.png',
    provider_result_expires_at: '2026-08-29T00:00:00.000Z'
  });
});

test('success settles once and an already-settled duplicate is ignored', async () => {
  const client = settlementClient();
  const reservation = { id: 'reservation-1', status: 'pending' };
  assert.equal(await settlePlatformGeneration(client, reservation, {
    status: 'completed',
    image: 'https://cdn.example/result.png',
    expiresAt: 1787961600,
    cost: 0.010625
  }), true);
  assert.equal(client.calls.filter((call) => call.type === 'rpc').length, 1);
  assert.equal(client.calls.at(-1).name, 'complete_generation_reservation');
  assert.equal(await settlePlatformGeneration(client, { ...reservation, status: 'succeeded' }, {
    status: 'completed',
    image: 'https://cdn.example/result.png'
  }), false);
  assert.equal(client.calls.filter((call) => call.type === 'rpc').length, 1);
});

test('failure releases a reservation once through the idempotent refund RPC', async () => {
  const client = settlementClient();
  await settlePlatformGeneration(client, { id: 'reservation-2', status: 'pending' }, {
    status: 'failed',
    errorCode: 'CONTENT_REJECTED'
  });
  const rpc = client.calls.find((call) => call.type === 'rpc');
  assert.equal(rpc.name, 'release_generation_reservation');
  assert.deepEqual(rpc.payload, {
    p_reservation_id: 'reservation-2',
    p_error_code: 'CONTENT_REJECTED'
  });
});

test('task lookup always applies authenticated ownership when supplied', async () => {
  const filters = [];
  const query = {
    select() { return query; },
    eq(key, value) { filters.push([key, value]); return query; },
    async maybeSingle() { return { data: null, error: null }; }
  };
  await findPlatformGeneration({ from: () => query }, 'task_abcdefgh', 'user-1');
  assert.deepEqual(filters, [
    ['provider', 'apimart'],
    ['provider_task_id', 'task_abcdefgh'],
    ['user_id', 'user-1']
  ]);
});

test('stored terminal rows return the unified browser task shape', () => {
  assert.deepEqual(formatStoredGeneration({
    status: 'succeeded',
    provider_task_id: 'task_abcdefgh',
    provider_cost_usd: '0.010625',
    provider_result_url: 'https://cdn.example/result.png',
    provider_result_expires_at: '2026-08-29T00:00:00.000Z'
  }), {
    taskId: 'task_abcdefgh',
    status: 'completed',
    progress: 100,
    image: 'https://cdn.example/result.png',
    expiresAt: 1787961600,
    cost: 0.010625,
    errorMessage: '',
    errorCode: ''
  });
});

test('callback payload only wakes a provider-verified reconciliation', async () => {
  const calls = [];
  const result = await reconcileApimartCallback({
    client: { name: 'client' },
    apiKey: 'platform-key',
    taskId: 'task_abcdefgh',
    findReservation: async (_client, taskId) => ({ id: 'reservation-1', status: 'pending', provider_task_id: taskId }),
    fetchTask: async ({ apiKey, taskId }) => {
      calls.push({ type: 'verify', apiKey, taskId });
      return { status: 'completed', image: 'https://cdn.example/verified.png', cost: 0.010625 };
    },
    settle: async (_client, reservation, task) => calls.push({ type: 'settle', reservation, task })
  });
  assert.equal(result.state, 'settled');
  assert.equal(calls[0].type, 'verify');
  assert.equal(calls[1].task.image, 'https://cdn.example/verified.png');

  let verified = false;
  const duplicate = await reconcileApimartCallback({
    client: {},
    apiKey: 'platform-key',
    taskId: 'task_abcdefgh',
    findReservation: async () => ({ id: 'reservation-1', status: 'succeeded' }),
    fetchTask: async () => {
      verified = true;
      return { status: 'completed' };
    }
  });
  assert.equal(duplicate.state, 'duplicate');
  assert.equal(verified, false);
});

test('migration, callback verification and status ownership contracts remain present', () => {
  assert.match(migration, /provider_task_id text/i);
  assert.match(migration, /provider_cost_usd numeric\(12, 6\)/i);
  assert.match(migration, /provider_result_url text/i);
  assert.match(migration, /provider_result_expires_at timestamptz/i);
  assert.match(migration, /create unique index[\s\S]*\(provider, provider_task_id\)/i);
  assert.match(callbackSource, /reconcileApimartCallback\([\s\S]*apiKey: config\.apiKey/i);
  assert.match(statusSource, /findPlatformGeneration\(auth\.client, taskId, auth\.user\.id\)/i);
});
