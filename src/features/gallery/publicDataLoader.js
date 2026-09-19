const HOME_SUMMARY_ENDPOINT = '/home-summary.json';

function resolveFetch(fetchImpl) {
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw new Error('当前环境不支持 fetch。');
  return doFetch;
}

export async function fetchHomeSummary({ signal, fetchImpl } = {}) {
  const doFetch = resolveFetch(fetchImpl);
  const response = await doFetch(HOME_SUMMARY_ENDPOINT, { signal });
  if (!response.ok) {
    throw new Error(`加载首页摘要失败：HTTP ${response.status}`);
  }

  const payload = await response.json();
  return {
    totalCases: Number(payload?.totalCases || 0),
    featuredCases: Array.isArray(payload?.featuredCases) ? payload.featuredCases : []
  };
}

export async function loadPublicGalleryData({ loadSummary } = {}) {
  if (typeof loadSummary !== 'function') {
    return {
      status: 'unconfigured',
      totalCases: 0,
      featuredCases: [],
      message: '公开案例数据尚未接入新架构。'
    };
  }

  const summary = await loadSummary();
  return {
    status: 'ready',
    totalCases: Number(summary?.totalCases || 0),
    featuredCases: Array.isArray(summary?.featuredCases) ? summary.featuredCases : [],
    message: ''
  };
}

export { HOME_SUMMARY_ENDPOINT };
