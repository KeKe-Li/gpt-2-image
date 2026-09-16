import { describe, expect, test } from 'vitest';
import { readAuthCallbackError } from './authCallback';

describe('readAuthCallbackError', () => {
  test('无错误时返回 null', () => {
    expect(readAuthCallbackError('?code=abc', '')).toBeNull();
    expect(readAuthCallbackError('', '')).toBeNull();
  });

  test('从 query 读取错误与描述', () => {
    expect(readAuthCallbackError('?error=access_denied&error_description=denied', '')).toEqual({
      error: 'access_denied',
      description: 'denied'
    });
  });

  test('从 hash 读取错误', () => {
    expect(readAuthCallbackError('', '#error=otp_expired&error_description=expired')).toEqual({
      error: 'otp_expired',
      description: 'expired'
    });
  });
});
