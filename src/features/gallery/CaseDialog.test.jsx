import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import CaseDialog from './CaseDialog';

afterEach(cleanup);

const sampleCase = {
  id: 527,
  title: 'Rio 旅行票据纸雕立体海报',
  image: '/images/case527.jpg',
  imageAlt: 'Rio 旅行票据纸雕立体海报',
  prompt: 'Create a layered paper-cut travel poster.\nUse warm lighting and bold typography.',
  category: 'Posters & Typography',
  styles: ['Poster', 'Illustration'],
  scenes: ['Travel'],
  sourceLabel: '@traveler',
  sourceUrl: 'https://x.com/traveler/status/1',
  githubUrl: 'https://github.com/KeKe-Li/gpt-2-image/blob/main/docs/gallery-part-2.md#case-527'
};

describe('CaseDialog', () => {
  test('以对话框语义呈现案例标题、完整提示词与来源链接', () => {
    render(<CaseDialog caseItem={sampleCase} onClose={() => {}} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Rio 旅行票据纸雕立体海报' })).toBeInTheDocument();
    // 完整提示词（含换行）应可见
    expect(screen.getByText(/Use warm lighting and bold typography\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /@traveler/ })).toHaveAttribute('href', sampleCase.sourceUrl);
  });

  test('复制按钮复制原始提示词', async () => {
    const copyPrompt = vi.fn().mockResolvedValue(undefined);
    render(<CaseDialog caseItem={sampleCase} onClose={() => {}} copyPrompt={copyPrompt} />);

    fireEvent.click(screen.getByRole('button', { name: /复制提示词/ }));
    await waitFor(() => expect(copyPrompt).toHaveBeenCalledWith(sampleCase.prompt));
  });

  test('按 Esc 键触发关闭回调', () => {
    const onClose = vi.fn();
    render(<CaseDialog caseItem={sampleCase} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('点击关闭按钮触发关闭回调', () => {
    const onClose = vi.fn();
    render(<CaseDialog caseItem={sampleCase} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '关闭案例详情' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('关闭后把焦点还给打开详情的控件', () => {
    const opener = document.createElement('button');
    opener.textContent = '打开案例';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(<CaseDialog caseItem={sampleCase} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: '关闭案例详情' })).toHaveFocus();

    rerender(<CaseDialog caseItem={null} onClose={() => {}} />);
    expect(opener).toHaveFocus();
    opener.remove();
  });

  test('caseItem 为空时不渲染任何内容', () => {
    const { container } = render(<CaseDialog caseItem={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
