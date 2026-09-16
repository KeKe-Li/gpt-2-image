export async function loadPublicGalleryData({ loadCases } = {}) {
  if (typeof loadCases !== 'function') {
    return {
      status: 'unconfigured',
      cases: [],
      message: '公开案例数据尚未接入新架构。'
    };
  }

  const cases = await loadCases();
  return {
    status: 'ready',
    cases: Array.isArray(cases) ? cases : [],
    message: ''
  };
}
