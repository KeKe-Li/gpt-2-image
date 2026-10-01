import { describe, expect, test, vi } from 'vitest';

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn().mockResolvedValue({ error: null }) }));
vi.mock('../../supabaseClient', () => ({ supabase: { auth: { signOut } } }));

import { auth } from './authClient';

describe('auth client lazy loading', () => {
  test('auth methods load Supabase only when called', async () => {
    await expect(auth.signOut()).resolves.toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledOnce();
  });
});
