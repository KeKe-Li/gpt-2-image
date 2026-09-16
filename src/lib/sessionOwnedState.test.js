import { describe, expect, test } from 'vitest';
import { createSessionOwnedState, readSessionOwnedData } from './sessionOwnedState';

describe('会话所有权状态', () => {
  test('只有所有者与当前会话一致时才返回用户数据', () => {
    const state = createSessionOwnedState('user-a:token-a', [{ id: 'a' }]);
    expect(readSessionOwnedData(state, 'user-a:token-a', [])).toEqual([{ id: 'a' }]);
    expect(readSessionOwnedData(state, 'user-b:token-b', [])).toEqual([]);
  });

  test('缺少所有者时使用安全回退值', () => {
    expect(readSessionOwnedData(null, 'user-a:token-a', null)).toBeNull();
  });
});
