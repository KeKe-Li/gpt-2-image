import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import HomePage from '../features/home/HomePage';
import AboutPage from '../features/about/AboutPage';
import PublicLayout from './PublicLayout';
import WorkspaceLayout from './WorkspaceLayout';
import { getPublicSiteConfig } from '../lib/runtimeConfig';

const layoutCss = readFileSync(resolve(process.cwd(), 'src/styles/layout.css'), 'utf8');
const baseCss = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
const tokensCss = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

afterEach(cleanup);

function renderInRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('品牌与公开布局', () => {
  test('设计系统集中定义字号和动效节奏且新样式只消费令牌', () => {
    for (const token of [
      '--text-body',
      '--text-caption',
      '--text-navigation',
      '--text-title-hero',
      '--text-title-section',
      '--text-title-workspace',
      '--duration-enter',
      '--duration-image',
      '--delay-enter'
    ]) {
      expect(tokensCss).toContain(`${token}:`);
    }

    expect(`${baseCss}\n${layoutCss}`).not.toMatch(/font-size:(?!\s*var\()[^;]+;/);
    expect(layoutCss).not.toMatch(/(?:animation|transition):[^;]*(?:100|550|600)ms/);
  });

  test('安全运行配置提供临时品牌并拒绝不安全站点 URL', () => {
    expect(getPublicSiteConfig({})).toEqual({
      brandName: 'GPT Image 灵感库',
      brandNameEn: 'GPT Image Gallery',
      siteUrl: 'http://localhost:5173'
    });

    expect(getPublicSiteConfig({
      VITE_SITE_NAME: '光影样本库',
      VITE_SITE_NAME_EN: 'Light Archive',
      VITE_SITE_URL: 'https://gallery.example.com/'
    })).toEqual({
      brandName: '光影样本库',
      brandNameEn: 'Light Archive',
      siteUrl: 'https://gallery.example.com'
    });

    expect(getPublicSiteConfig({ VITE_SITE_URL: 'javascript:alert(1)' }).siteUrl)
      .toBe('http://localhost:5173');
  });

  test('品牌标识使用配置名称并链接到公开首页', () => {
    renderInRouter(
      <BrandMark config={{
        brandName: '光影样本库',
        brandNameEn: 'Light Archive',
        siteUrl: 'https://gallery.example.com'
      }} />
    );

    const brand = screen.getByRole('link', { name: '光影样本库 Light Archive' });
    expect(brand).toHaveAttribute('href', '/');
  });

  test('公开导航提供清晰入口和移动端可访问菜单状态', () => {
    renderInRouter(<PublicLayout><p>页面内容</p></PublicLayout>);

    expect(screen.getByRole('navigation', { name: '公开站导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/zh-CN');
    expect(screen.getByRole('link', { name: '案例' })).toHaveAttribute('href', '/zh-CN/cases');
    expect(screen.queryByRole('navigation', { name: '公开站导航' }))
      .not.toHaveTextContent('关于');
    expect(screen.getByRole('link', { name: '许可证与来源' }))
      .toHaveAttribute('href', '/zh-CN/about');

    const menuButton = screen.getByRole('button', { name: '打开导航菜单' });
    expect(menuButton).toHaveAttribute('aria-controls', 'public-navigation-links');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(menuButton).toHaveAccessibleName('关闭导航菜单');
  });
});

describe('工作台布局', () => {
  test('侧栏提供操作导向导航并保留主内容焦点目标', () => {
    renderInRouter(
      <WorkspaceLayout>
        <h1>创作工作台</h1>
      </WorkspaceLayout>
    );

    expect(screen.getByRole('navigation', { name: '工作台导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '生成图片' })).toHaveAttribute('href', '/workspace');
    expect(screen.getByRole('link', { name: '浏览案例' })).toHaveAttribute('href', '/zh-CN/cases');
    expect(screen.getByRole('link', { name: '返回公开站' })).toHaveAttribute('href', '/zh-CN');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'workspace-main');
  });

  test('移动端单栏让导航按内容高度收缩并把剩余空间留给工作区', () => {
    expect(layoutCss).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.workspace-shell\s*{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\);/
    );
  });
});

describe('公开内容契约', () => {
  test('首页呈现品牌主张、真实精选图、全局搜索和双行动路径', () => {
    renderInRouter(<HomePage galleryStatus={<p>公开案例数据尚未接入新架构。</p>} />);

    expect(screen.getByRole('heading', { name: '把好提示词，变成下一张好作品。' }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '精选案例' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /案例/ }).length).toBeGreaterThanOrEqual(3);

    const search = screen.getByRole('searchbox', { name: '搜索全部案例' });
    fireEvent.change(search, { target: { value: '旅行海报' } });
    expect(screen.getByRole('search')).toHaveAttribute('action', '/zh-CN/cases');
    expect(search).toHaveAttribute('name', 'q');
    expect(search).toHaveValue('旅行海报');

    expect(screen.getByRole('link', { name: '浏览案例' })).toHaveAttribute('href', '/zh-CN/cases');
    expect(screen.getAllByRole('link', { name: '开始生成' })).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: '开始生成' })) {
      expect(link).toHaveAttribute('href', '/workspace');
    }
  });

  test('首页优先使用加载后的真实案例数据呈现精选内容', () => {
    renderInRouter(
      <HomePage
        cases={[{
          id: 527,
          title: '来自数据源的案例标题',
          image: '/images/case527.jpg',
          category: 'Posters & Typography'
        }]}
      />
    );

    expect(screen.getByText('来自数据源的案例标题')).toBeInTheDocument();
  });

  test('关于页明确许可证、固定上游和独立运营关系', () => {
    renderInRouter(<AboutPage />);

    expect(screen.getByRole('heading', { name: '关于这座灵感库' })).toBeInTheDocument();
    expect(screen.getByText(/MIT License/)).toBeInTheDocument();
    expect(screen.getByText(/073d105d4dbb3f3afcd2e7cd194cee3a557b0999/)).toBeInTheDocument();
    expect(screen.getByText(/独立项目/)).toBeInTheDocument();
    expect(screen.getByText(/不代表上游作者对本项目提供背书/)).toBeInTheDocument();
  });
});
