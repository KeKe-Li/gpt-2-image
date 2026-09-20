import { useEffect, useState } from 'react';
import { fetchHomeSummary, loadPublicGalleryData } from '../../features/gallery/publicDataLoader';
import { useLocale } from '../../features/i18n/LocaleProvider';
import HomePage from '../../features/home/HomePage';

const defaultLoadGallery = (options = {}) => loadPublicGalleryData({ ...options, loadSummary: fetchHomeSummary });

const copy = {
  'zh-CN': {
    loading: '正在加载公开案例…',
    error: '公开案例加载失败，请重试。',
    retry: '重新加载公开案例',
    ready: (count) => `已收录 ${count} 个公开案例。`
  },
  en: {
    loading: 'Loading public cases…',
    error: 'Failed to load public cases. Please retry.',
    retry: 'Reload public cases',
    ready: (count) => `Collected ${count} public cases.`
  }
};

export default function PublicHomePage({ loadGallery = defaultLoadGallery }) {
  const { locale } = useLocale();
  const t = copy[locale] || copy['zh-CN'];
  const loadingGallery = {
    status: 'loading',
    totalCases: 0,
    featuredCases: [],
    message: t.loading
  };
  const failedGallery = {
    status: 'error',
    totalCases: 0,
    featuredCases: [],
    message: t.error
  };
  const [gallery, setGallery] = useState(loadingGallery);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setGallery(loadingGallery);

    Promise.resolve()
      .then(() => loadGallery({ signal: controller.signal }))
      .then((result) => {
        if (!controller.signal.aborted) setGallery(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setGallery(failedGallery);
      });

    return () => {
      controller.abort();
    };
  }, [attempt, loadGallery]);

  let galleryStatus;
  if (gallery.status === 'loading') {
    galleryStatus = <p role="status">{gallery.message}</p>;
  } else if (gallery.status === 'error') {
    galleryStatus = (
      <div role="alert">
        <p>{gallery.message}</p>
        <button type="button" onClick={() => setAttempt((current) => current + 1)}>
          {t.retry}
        </button>
      </div>
    );
  } else if (gallery.status === 'ready') {
    galleryStatus = <p>{t.ready(gallery.totalCases)}</p>;
  } else {
    galleryStatus = <p>{gallery.message}</p>;
  }

  return (
    <HomePage
      galleryStatus={galleryStatus}
      totalCases={gallery.totalCases}
      featuredCases={gallery.featuredCases}
    />
  );
}
