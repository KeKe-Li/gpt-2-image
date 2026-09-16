/**
 * 把用户态数据与发起请求时的会话绑定，避免身份切换首帧泄露旧用户数据。
 */
export function createSessionOwnedState(ownerKey, data) {
  return { ownerKey: String(ownerKey || ''), data };
}

export function readSessionOwnedData(state, currentOwnerKey, fallback) {
  return state?.ownerKey === String(currentOwnerKey || '') ? state.data : fallback;
}
