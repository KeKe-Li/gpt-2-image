// 生成领域前端 API：复用现有 apimartClient 与站点生成接口，
// 提供能力探测、访问令牌读取、提交与轮询封装。可注入依赖便于测试。
import {
  fetchPlatformTask,
  pollApimartTask,
  submitPlatformGeneration
} from '../../apimartClient';
import { supabase } from '../../supabaseClient';

const CAPABILITY_ENDPOINT = '/api/generate-image';
const INSPECTION_ENDPOINT = '/api/prompt/inspect';

function resolveFetch(fetchImpl) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('当前环境不支持 fetch。');
  return doFetch;
}

class GenerationError extends Error {
  constructor(message, { loginRequired = false, code = '' } = {}) {
    super(message);
    this.name = 'GenerationError';
    this.loginRequired = loginRequired;
    this.code = code;
  }
}

/**
 * 探测生成能力：服务端是否配置、是否需要登录、免费额度是否已用。
 */
export async function fetchGenerationCapability({ fetchImpl } = {}) {
  const doFetch = resolveFetch(fetchImpl);
  const response = await doFetch(CAPABILITY_ENDPOINT, { method: 'GET' });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (response.ok && body.ok) {
    return {
      configured: true,
      authRequired: Boolean(body.authRequired),
      freeUsed: Boolean(body.freeUsed)
    };
  }
  if (response.status === 500 || body.error === 'SERVER_NOT_CONFIGURED') {
    return { configured: false, authRequired: true, freeUsed: false };
  }
  throw new GenerationError(body.error || '生成能力探测失败。', { code: body.error });
}

export async function inspectPrompt(prompt, { fetchImpl } = {}) {
  const doFetch = resolveFetch(fetchImpl);
  const response = await doFetch(INSPECTION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.ok) {
    const error = new GenerationError(body?.error || 'INSPECTION_FAILED', { code: body?.error });
    error.status = response.status;
    throw error;
  }
  return body.inspection;
}

/**
 * 从 Supabase 会话读取访问令牌。无会话时返回空字符串。
 */
export async function getAccessToken(client = supabase) {
  if (!client?.auth?.getSession) return '';
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || '';
}

/**
 * 提交平台生成任务（使用站点积分）。缺少令牌视为需要登录。
 */
export async function submitGeneration(
  { caseId, prompt, language, accessToken },
  { submitImpl = submitPlatformGeneration } = {}
) {
  if (!accessToken) {
    throw new GenerationError('请先登录后再生成。', { loginRequired: true });
  }
  return submitImpl({ caseId, prompt, language, accessToken });
}

/**
 * 轮询平台生成任务直到终态。
 */
export function pollGeneration(
  { taskId, accessToken, language, signal, onProgress },
  { fetchTaskImpl = fetchPlatformTask, pollImpl = pollApimartTask } = {}
) {
  return pollImpl(() => fetchTaskImpl(taskId, accessToken, language), { signal, onProgress });
}

export { GenerationError };
