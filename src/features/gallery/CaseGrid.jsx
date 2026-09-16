import CaseCard from './CaseCard';

// 案例网格：响应式稳定比例网格；无结果时给出可操作的空状态提示。
export default function CaseGrid({
  cases,
  onSelect,
  onPrefetch,
  emptyLabels,
  cardLabels,
  loading = false,
  skeletonCount = 12
}) {
  if (loading) {
    const items = Array.from({ length: Math.max(1, Number(skeletonCount) || 12) });
    return (
      <div className="case-grid" aria-hidden="true">
        {items.map((_, index) => (
          <div key={index} className="case-card case-card--skeleton">
            <span className="case-card__media case-card__media--skeleton" />
            <span className="case-card__caption">
              <span className="case-card__category case-card__line case-card__line--short" />
              <span className="case-card__title case-card__line case-card__line--long" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    const t = emptyLabels || {};
    return (
      <div className="case-grid__empty" role="status">
        <p>{t.emptyTitle || '没有符合当前条件的案例。'}</p>
        <p>{t.emptyHint || '试着减少筛选条件，或更换关键词。'}</p>
      </div>
    );
  }

  return (
    <div className="case-grid">
      {cases.map((caseItem, index) => (
        <CaseCard
          key={caseItem.id}
          caseItem={caseItem}
          onSelect={onSelect}
          onPrefetch={onPrefetch}
          eager={index < 4}
          labels={cardLabels}
        />
      ))}
    </div>
  );
}
