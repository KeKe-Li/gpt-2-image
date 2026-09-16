import { apiRequest } from '../../lib/apiClient';

export class GenerationHistoryError extends Error {
  constructor(message = 'HISTORY_LOAD_FAILED', code = 'HISTORY_LOAD_FAILED') {
    super(message);
    this.name = 'GenerationHistoryError';
    this.code = code;
  }
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: String(item?.id || ''),
      caseId: Number(item?.caseId || 0),
      status: item?.status || 'pending',
      usedFreeGeneration: Boolean(item?.usedFreeGeneration),
      creditAmount: Number(item?.creditAmount || 0),
      errorCode: item?.errorCode || '',
      createdAt: item?.createdAt || '',
      completedAt: item?.completedAt || '',
      provider: item?.provider || '',
      taskId: item?.taskId || '',
      costUsd: item?.costUsd == null ? null : Number(item.costUsd),
      resultUrl: item?.resultUrl || '',
      resultExpiresAt: item?.resultExpiresAt || '',
      promptPreview: item?.promptPreview || ''
    }))
    .filter((item) => item.id);
}

export async function fetchGenerationHistory({ accessToken = '', limit = 30, signal, fetchImpl } = {}) {
  try {
    const body = await apiRequest(`/api/generation/history?limit=${encodeURIComponent(limit)}`, {
      method: 'GET',
      accessToken,
      signal,
      fetchImpl
    });
    return { items: normalizeItems(body.items), loginRequired: false };
  } catch (error) {
    if (error?.loginRequired) return { items: [], loginRequired: true };
    throw new GenerationHistoryError(error?.message || '生成记录加载失败。');
  }
}

