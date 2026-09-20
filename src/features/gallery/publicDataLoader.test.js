import { describe, expect, test, vi } from 'vitest';
import { loadPublicGalleryData } from './publicDataLoader';

describe('loadPublicGalleryData', () => {
  test('把 AbortSignal 透传给 loadSummary', async () => {
    const signal = new AbortController().signal;
    const loadSummary = vi.fn().mockResolvedValue({
      totalCases: 541,
      featuredCases: [{ id: 527 }]
    });

    await loadPublicGalleryData({ loadSummary, signal });

    expect(loadSummary).toHaveBeenCalledWith({ signal });
  });
});
