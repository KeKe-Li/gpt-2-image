import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { LocaleProvider } from '../features/i18n/LocaleProvider';
import LocaleRedirect from '../features/i18n/LocaleRedirect';
import { SUPPORTED_LOCALES } from '../lib/i18n';
import PublicLayout from './PublicLayout';

const PublicHomePage = lazy(() => import('./pages/PublicHomePage'));
const GalleryPage = lazy(() => import('../features/gallery/GalleryPage'));
const AboutPage = lazy(() => import('../features/about/AboutPage'));
const TemplatesPage = lazy(() => import('../features/templates/TemplatesPage'));
const SkillPage = lazy(() => import('../features/skills/SkillPage'));
const CommunityPage = lazy(() => import('../features/community/CommunityPage'));
const PricingPage = lazy(() => import('../features/billing/PricingPage'));
const BillingPage = lazy(() => import('../features/billing/BillingPage'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const CaseDetailPage = lazy(() => import('./pages/CaseDetailPage'));
const PaymentReturnPage = lazy(() => import('./pages/PaymentReturnPage'));
const AccountPage = lazy(() => import('../features/account/AccountPage'));
const AuthCallbackPage = lazy(() => import('../features/auth/AuthCallbackPage'));
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage'));
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
const GenerationHistoryPage = lazy(() => import('../features/generation/GenerationHistoryPage'));
const WorkspaceLayout = lazy(() => import('./WorkspaceLayout'));

// 本地化公开站容器：校验语言前缀，无效时重定向；有效时注入语言上下文。
function LocalePublicLayout() {
  const { locale } = useParams();
  if (!SUPPORTED_LOCALES.includes(locale)) return <LocaleRedirect />;
  return <PublicLayout />;
}

// 本地化区域内的未知子路径回到当前语言首页。
function LocaleNotFound() {
  const { locale } = useParams();
  return <Navigate to={`/${locale}`} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <Routes>
          {/* 登录后的应用区：非本地化路径 */}
          <Route element={<WorkspaceLayout />}>
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/workspace/cases/:caseId" element={<CaseDetailPage />} />
            <Route path="/workspace/account" element={<AccountPage />} />
            <Route path="/workspace/history" element={<GenerationHistoryPage />} />
            <Route path="/workspace/billing" element={<BillingPage />} />
            <Route path="/workspace/billing/return" element={<PaymentReturnPage />} />
          </Route>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/reset" element={<ResetPasswordPage />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* 本地化公开站：/zh-CN/* 与 /en/* */}
          <Route path="/:locale" element={<LocalePublicLayout />}>
            <Route index element={<PublicHomePage />} />
            <Route path="cases" element={<GalleryPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="skill" element={<SkillPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<LocaleNotFound />} />
          </Route>

          {/* 根与遗留非本地化路径重定向到解析出的语言 */}
          <Route path="/" element={<LocaleRedirect />} />
          <Route path="*" element={<LocaleRedirect />} />
        </Routes>
      </LocaleProvider>
    </BrowserRouter>
  );
}
