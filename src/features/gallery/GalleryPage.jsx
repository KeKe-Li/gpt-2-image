import { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocale } from '../i18n/LocaleProvider';
import { fetchCasePrompt, fetchGalleryData } from './gallery-data';
import {
  createSearchIndex,
  filterCases,
  filtersFromSearchParams,
  filtersToSearchParams
} from './gallery-filter';
import CaseGrid from './CaseGrid';
import CaseDialog from './CaseDialog';
import GalleryFilters from './GalleryFilters';
import { localizeGalleryCase, localizeGalleryValue } from './gallery-localization';
import { useSession } from '../auth/SessionProvider';
import { addFavorite, fetchFavorites, removeFavorite, toggleFavoriteSet } from './favorites-api';
import './gallery.css';

const EMPTY_DATA = Object.freeze({ categories: [], styles: [], scenes: [], cases: [] });
export const INITIAL_VISIBLE_CASES = 48;
const LOAD_MORE_CASES = 48;
const defaultFavoritesClient = {
  fetchFavorites,
  addFavorite,
  removeFavorite,
  toggleFavoriteSet
};

const pageCopy = {
  'zh-CN': {
    eyebrow: '案例库',
    title: '浏览全部提示词案例',
    lede: '从真实作品出发，观察构图、材质与叙事如何被准确表达，复制原始提示词开始你的再创作。',
    loading: '正在加载案例…',
    errorMsg: '案例加载失败，请重试。',
    retry: '重新加载',
    searchPlaceholder: '输入主题、风格或场景关键词',
    searchLabel: '搜索案例',
    category: '分类',
    style: '风格',
    scene: '场景',
    allCategory: '全部分类',
    allStyle: '全部风格',
    allScene: '全部场景',
    count: (n) => `共 ${n} 个案例`,
    clear: '清除筛选',
    emptyTitle: '没有符合当前条件的案例。',
    emptyHint: '试着减少筛选条件，或更换关键词。',
    viewCase: '查看案例',
    viewPrompt: '查看提示词 ↗',
    loadMore: (n) => `加载更多（剩余 ${n} 个）`
  },
  en: {
    eyebrow: 'Case library',
    title: 'Browse all prompt cases',
    lede: 'Start from real work, observe how composition, materials, and narrative are expressed, and copy the original prompt to begin your own recreation.',
    loading: 'Loading cases…',
    errorMsg: 'Failed to load cases, please retry.',
    retry: 'Reload',
    searchPlaceholder: 'Enter a theme, style, or scene keyword',
    searchLabel: 'Search cases',
    category: 'Category',
    style: 'Style',
    scene: 'Scene',
    allCategory: 'All categories',
    allStyle: 'All styles',
    allScene: 'All scenes',
    count: (n) => `${n} cases`,
    clear: 'Clear filters',
    emptyTitle: 'No cases match the current filters.',
    emptyHint: 'Try removing a filter or changing your keywords.',
    viewCase: 'View case',
    viewPrompt: 'View prompt ↗',
    loadMore: (n) => `Load more (${n} remaining)`
  }
};

/**
 * 公开案例库页面：从 /cases-index.json 加载索引数据，按 URL 查询参数进行可分享筛选，
 * 并以对话框展示案例详情（deep-link 参数 ?case=ID）。
 * @param {{loadData?: typeof fetchGalleryData}} props 允许注入数据加载器便于测试
 */
export default function GalleryPage({ loadData = fetchGalleryData, favoritesClient = defaultFavoritesClient }) {
  const { locale } = useLocale();
  const t = pageCopy[locale] || pageCopy['zh-CN'];
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(EMPTY_DATA);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CASES);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const favoriteMutationVersion = useRef(new Map());

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    loadData({ signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setStatus('ready');
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
  }, [attempt, loadData]);

  const filters = filtersFromSearchParams(searchParams);
  const indexed = useMemo(() => {
    const q = String(filters.query || '').trim();
    return q ? createSearchIndex(data.cases) : data.cases;
  }, [data.cases, filters.query]);
  const filtered = useMemo(() => filterCases(indexed, filters), [indexed, filters]);
  const localizedCases = useMemo(
    () => filtered.slice(0, visibleCount).map((item) => localizeGalleryCase(item, locale)),
    [filtered, locale, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_CASES);
  }, [filters.query, filters.category, filters.style, filters.scene]);

  // 登录后加载收藏集合；登出或匿名时清空。
  useEffect(() => {
    if (!session.user) {
      setFavoriteIds([]);
      return undefined;
    }
    let cancelled = false;
    favoritesClient.fetchFavorites({ accessToken: session.accessToken })
      .then((result) => {
        if (!cancelled && !result.loginRequired) setFavoriteIds(result.caseIds);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [favoritesClient, session.accessToken, session.user]);

  const toggleFavorite = (caseItem) => {
    const caseId = Number(caseItem.id);
    const wasFavorite = favoriteIds.includes(caseId);
    const nextVersion = (favoriteMutationVersion.current.get(caseId) || 0) + 1;
    favoriteMutationVersion.current.set(caseId, nextVersion);
    setFavoriteIds((ids) => favoritesClient.toggleFavoriteSet(ids, caseId)); // 乐观更新
    const requestOptions = { accessToken: session.accessToken };
    const action = wasFavorite
      ? favoritesClient.removeFavorite(caseId, requestOptions)
      : favoritesClient.addFavorite(caseId, requestOptions);
    action.catch(() => {
      if (favoriteMutationVersion.current.get(caseId) !== nextVersion) return;
      setFavoriteIds((ids) => {
        if (wasFavorite) {
          return ids.includes(caseId) ? ids : [...ids, caseId];
        }
        return ids.filter((id) => id !== caseId);
      });
    });
  };

  const selectedId = searchParams.get('case');
  const selectedCase = selectedId ? data.cases.find((item) => String(item.id) === selectedId) : null;

  const prefetchCase = (caseItem) => {
    if (!caseItem) return;
    if (!String(caseItem.prompt || '').trim()) {
      fetchCasePrompt(caseItem.id).catch(() => {});
    }
  };

  const applyFilters = (nextFilters) => {
    const params = filtersToSearchParams(nextFilters);
    setSearchParams(params, { replace: true });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const selectCase = (caseItem) => {
    // 预取详情提示词，避免对话框首次打开时再等待网络（fetchCasePrompt 内部会缓存）。
    if (!String(caseItem?.prompt || '').trim()) {
      fetchCasePrompt(caseItem?.id).catch(() => {});
    }
    const params = new URLSearchParams(searchParams);
    params.set('case', String(caseItem.id));
    setSearchParams(params);
  };

  const closeDialog = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('case');
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="gallery-page">
      <header className="gallery-page__head">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="gallery-page__lede">{t.lede}</p>
      </header>

      <GalleryFilters
        filters={filters}
        options={{ categories: data.categories, styles: data.styles, scenes: data.scenes }}
        resultCount={filtered.length}
        labels={t}
        onChange={applyFilters}
        onReset={resetFilters}
        formatOption={(value) => localizeGalleryValue(value, locale)}
      />

      {status === 'loading' ? (
        <>
          <p className="gallery-page__status" role="status">{t.loading}</p>
          <CaseGrid loading skeletonCount={12} />
        </>
      ) : null}

      {status === 'error' ? (
        <div className="gallery-page__status" role="alert">
          <p>{t.errorMsg}</p>
          <button type="button" className="button button--small" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </button>
        </div>
      ) : null}

      {status === 'ready' ? (
        <>
          <CaseGrid
            cases={localizedCases}
            onSelect={selectCase}
            onPrefetch={prefetchCase}
            emptyLabels={t}
            cardLabels={t}
          />
          {visibleCount < filtered.length ? (
            <div className="gallery-page__load-more">
              <button
                type="button"
                className="button button--quiet"
                onClick={() => setVisibleCount((count) => count + LOAD_MORE_CASES)}
              >
                {t.loadMore(filtered.length - visibleCount)}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <CaseDialog
        caseItem={localizeGalleryCase(selectedCase, locale)}
        onClose={closeDialog}
        isFavorite={selectedCase ? favoriteIds.includes(Number(selectedCase.id)) : false}
        onToggleFavorite={session.user ? toggleFavorite : null}
      />
    </div>
  );
}
