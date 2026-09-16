import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import App from './App';

describe('App', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
  });

  function renderAt(path) {
    window.history.replaceState({}, '', path);
    render(<App />);
  }

  test('无外部配置时仍能渲染公开首页', async () => {
    renderAt('/zh-CN');

    expect(
      await screen.findByRole('heading', { name: '把好提示词，变成下一张好作品。' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GPT Image 灵感库 GPT Image Gallery' }))
      .toBeInTheDocument();
    // 无外部配置（案例数据加载失败）时，公开首页仍稳定呈现精选区块，不崩溃。
    expect(screen.getByRole('heading', { name: '精选案例' })).toBeInTheDocument();
  });

  test('工作台在会话和生成服务未配置时安全降级', async () => {
    renderAt('/workspace');

    expect(await screen.findByRole('heading', { name: '创作工作台' })).toBeInTheDocument();
    // 生成服务未配置时，工作台安全降级为“尚未配置”提示，不崩溃。
    expect(await screen.findByText('图片生成服务尚未配置。')).toBeInTheDocument();
  });

  test('案例详情路由可达并保留案例标识', async () => {
    renderAt('/workspace/cases/527');

    expect(await screen.findByRole('heading', { name: '案例详情' })).toBeInTheDocument();
    expect(screen.getByText('案例编号：527')).toBeInTheDocument();
    expect(screen.getByText('案例详情数据尚未接入新架构。')).toBeInTheDocument();
  });

  test('支付回跳路由在支付服务未配置时不宣称成功', async () => {
    renderAt('/workspace/billing/return?provider=alipay');

    expect(await screen.findByRole('heading', { name: '支付结果确认' })).toBeInTheDocument();
    expect(screen.getByText('支付服务尚未配置，当前无法确认订单结果。')).toBeInTheDocument();
  });

  test('管理员路由通过权限边界拒绝匿名访问', async () => {
    renderAt('/admin');

    expect(await screen.findByRole('heading', { name: '需要管理员权限' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '管理后台' })).not.toBeInTheDocument();
  });
});
