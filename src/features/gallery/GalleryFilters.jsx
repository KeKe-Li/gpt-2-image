// 筛选栏：全局搜索 + 分类/风格/场景下拉，受控组件，状态由 GalleryPage 与 URL 同步。
export default function GalleryFilters({ filters, options, resultCount, labels, onChange, onReset, formatOption }) {
  const { categories = [], styles = [], scenes = [] } = options || {};
  const t = labels || {};

  const update = (key, value) => onChange?.({ ...filters, [key]: value });

  const hasActiveFilter =
    Boolean(filters.query) || Boolean(filters.category) || Boolean(filters.style) || Boolean(filters.scene);

  return (
    <div className="gallery-filters">
      <div className="gallery-filters__search">
        <label className="sr-only" htmlFor="gallery-search">{t.searchLabel}</label>
        <input
          id="gallery-search"
          type="search"
          value={filters.query}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
          onChange={(event) => update('query', event.target.value)}
        />
      </div>

      <div className="gallery-filters__selects">
        <label className="gallery-filters__field">
          <span>{t.category}</span>
          <select value={filters.category} onChange={(event) => update('category', event.target.value)}>
            <option value="">{t.allCategory}</option>
            {categories.map((category) => (
              <option key={category} value={category}>{formatOption?.(category) || category}</option>
            ))}
          </select>
        </label>

        <label className="gallery-filters__field">
          <span>{t.style}</span>
          <select value={filters.style} onChange={(event) => update('style', event.target.value)}>
            <option value="">{t.allStyle}</option>
            {styles.map((style) => (
              <option key={style} value={style}>{formatOption?.(style) || style}</option>
            ))}
          </select>
        </label>

        <label className="gallery-filters__field">
          <span>{t.scene}</span>
          <select value={filters.scene} onChange={(event) => update('scene', event.target.value)}>
            <option value="">{t.allScene}</option>
            {scenes.map((scene) => (
              <option key={scene} value={scene}>{formatOption?.(scene) || scene}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="gallery-filters__meta">
        <span aria-live="polite">{typeof t.count === 'function' ? t.count(resultCount) : resultCount}</span>
        {hasActiveFilter ? (
          <button type="button" className="text-link" onClick={onReset}>{t.clear}</button>
        ) : null}
      </div>
    </div>
  );
}
