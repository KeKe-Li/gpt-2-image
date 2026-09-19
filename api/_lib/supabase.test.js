import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthContext, getSessionContext } from './supabase.js';

test('轻会话上下文只校验 bearer token，不触发 profile 查询', async () => {
  const calls = [];
  const client = {
    auth: {
      async getUser(token) {
        calls.push(['getUser', token]);
        return {
          data: { user: { id: 'user-1', email: 'member@example.com' } },
          error: null
        };
      }
    },
    from() {
      throw new Error('PROFILE_QUERY_SHOULD_NOT_RUN');
    }
  };

  const result = await getSessionContext(
    { headers: { authorization: 'Bearer session-token' } },
    { client }
  );

  assert.equal(result.error, undefined);
  assert.equal(result.user.id, 'user-1');
  assert.equal(result.token, 'session-token');
  assert.equal(result.client, client);
  assert.deepEqual(calls, [['getUser', 'session-token']]);
});

test('完整认证上下文仍会补齐 profile，并复用已注入 client', async () => {
  const client = {
    auth: {
      async getUser() {
        return {
          data: { user: { id: 'user-1', email: 'member@example.com' } },
          error: null
        };
      }
    }
  };
  const calls = [];

  const result = await getAuthContext(
    { headers: { authorization: 'Bearer session-token' } },
    {
      client,
      resolveProfile: async (user, options) => {
        calls.push(['resolveProfile', user.id, options.client === client]);
        return { id: user.id, role: 'user' };
      }
    }
  );

  assert.equal(result.error, undefined);
  assert.equal(result.user.id, 'user-1');
  assert.deepEqual(result.profile, { id: 'user-1', role: 'user' });
  assert.deepEqual(calls, [['resolveProfile', 'user-1', true]]);
});
