// 单个案例卡片：稳定比例封面 + 分类/标题，点击打开详情对话框。
export default function CaseCard({ caseItem, onSelect, onPrefetch, eager = false, labels = {} }) {
  const viewLabel = labels.viewCase || '查看案例';
  const revealLabel = labels.viewPrompt || '查看提示词 ↗';

  return (
    <button
      type="button"
      className="case-card"
      onClick={() => onSelect?.(caseItem)}
      onPointerEnter={() => onPrefetch?.(caseItem)}
      // 移动端没有 hover；pointerDown 可以更早触发预取，提升“点开即出”的体感。
      onPointerDown={() => onPrefetch?.(caseItem)}
      // 键盘导航预取：focus 到卡片时就尝试拉取 prompt。
      onFocus={() => onPrefetch?.(caseItem)}
      aria-label={`${viewLabel}：${caseItem.title}`}
    >
      <span className="case-card__media">
        <img
          src={caseItem.image}
          alt={caseItem.imageAlt || caseItem.title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
        />
        <span className="case-card__reveal" aria-hidden="true">{revealLabel}</span>
      </span>
      <span className="case-card__caption">
        <span className="case-card__category">{caseItem.categoryLabel || caseItem.category}</span>
        <strong className="case-card__title">{caseItem.title}</strong>
      </span>
    </button>
  );
}
