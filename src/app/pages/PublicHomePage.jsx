import { useEffect, useState } from 'react';
import { fetchHomeSummary, loadPublicGalleryData } from '../../features/gallery/publicDataLoader';
import HomePage from '../../features/home/HomePage';

const defaultLoadGallery = (options = {}) => loadPublicGalleryData({ ...options, loadSummary: fetchHomeSummary });

const loadingGallery = Object.freeze({
  status: 'loading',
  totalCases: 0,
  featuredCases: [],
  message: '正在加载公开案例…'
});

const failedGallery = Object.freeze({
  status: 'error',
  totalCases: 0,
  featuredCases: [],
  message: '公开案例加载失败，请重试。'
});

export default function PublicHomePage({ loadGallery = defaultLoadGallery }) {
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
          重新加载公开案例
        </button>
      </div>
    );
  } else if (gallery.status === 'ready') {
    galleryStatus = <p>已收录 {gallery.totalCases} 个公开案例。</p>;
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
