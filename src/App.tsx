import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceRouter } from "@/components/WorkspaceRouter";
import { WorkspaceRedirect } from "@/components/WorkspaceRedirect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import LandingPage from "./pages/LandingPage";
import DocumentationPage from "./pages/DocumentationPage";
import WordPressGuidePage from "./pages/WordPressGuidePage";
import ShopifyGuidePage from "./pages/ShopifyGuidePage";
import AuthPage from "./pages/AuthPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import CampaignsPage from "./pages/CampaignsPage";
import AiSiteBuilderPage from "./pages/AiSiteBuilderPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import TemplatesPage from "./pages/TemplatesPage";
import WebsitesPage from "./pages/WebsitesPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import GeneratedPagesPage from "./pages/GeneratedPagesPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import TemplateMarketplacePage from "./pages/TemplateMarketplacePage";
import IndexingPage from "./pages/IndexingPage";

import PagePerformancePage from "./pages/PagePerformancePage";
import SeoAuditPage from "./pages/SeoAuditPage";
import AffiliatePage from "./pages/AffiliatePage";
import ReferralPage from "./pages/ReferralPage";

import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import DataCsvPage from "./pages/DataCsvPage";
import WebsiteContentPage from "./pages/WebsiteContentPage";
import PgpKeywordsPage from "./pages/PgpKeywordsPage";
import PgpGeneratePage from "./pages/PgpGeneratePage";
import PgpTermsPage from "./pages/PgpTermsPage";
import ElementorTestPage from "./pages/ElementorTestPage";
import RepublishDiffHarnessPage from "./pages/RepublishDiffHarnessPage";
import SeoAnalysisHarnessPage from "./pages/SeoAnalysisHarnessPage";
import WpControlPage from "./pages/WpControlPage";
import NotFound from "./pages/NotFound";
import SupabaseConnectionTestPage from "./pages/SupabaseConnectionTestPage";
import MigrateToSupabasePage from "./pages/MigrateToSupabasePage";
import ShopifyCallbackPage from "./pages/ShopifyCallbackPage";
import ShopifyOAuthLaunchPage from "./pages/ShopifyOAuthLaunchPage";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import ContactPage from "./pages/ContactPage";
import UnsubscribePage from "./pages/UnsubscribePage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ChangelogPage from "./pages/ChangelogPage";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AutoTranslateProvider } from "./i18n/AutoTranslateProvider";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import ScrollToTop from "./components/ScrollToTop";
import { BrandingProvider } from "./contexts/BrandingContext";
import { FeatureGate } from "./components/FeatureGate";

const getAuthStorageKey = () => {
  try {
    return `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  } catch {
    return "";
  }
};

const clearExpiredLocalAuthSession = () => {
  const key = getAuthStorageKey();
  if (!key) return;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const session = JSON.parse(raw);
    if (session?.expires_at && session.expires_at * 1000 <= Date.now()) {
      localStorage.removeItem(key);
    }
  } catch {
    localStorage.removeItem(key);
  }
};

import { registerQueryClient } from "@/lib/ai-client";
import { captureReferralFromUrl, attributeReferralIfPending } from "@/lib/referral-tracking";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

registerQueryClient(queryClient);

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Redirects deep admin paths (e.g. /admin/system/marketplace) to the query-param section */
function AdminSectionRedirect() {
  const { section } = useParams();
  const depth = section ? window.location.pathname.split("/admin/")[1]?.split("/").length ?? 1 : 1;
  const up = "../".repeat(depth);
  return <Navigate to={`${up}admin?section=${section ?? "overview"}`} replace />;
}

/** All the dashboard child routes, rendered inside DashboardLayout */
function DashboardRoutes({ session, onLogout }: { session: Session | null; onLogout: () => void }) {
  const wrap = (el: React.ReactNode) => (
    <ProtectedRoute session={session}>
      <DashboardLayout onLogout={onLogout}>{el}</DashboardLayout>
    </ProtectedRoute>
  );

  return (
    <Routes>
      <Route path="dashboard" element={wrap(<DashboardPage />)} />
      <Route path="campaigns" element={wrap(<CampaignsPage />)} />
      <Route path="ai-site-builder" element={wrap(<AiSiteBuilderPage />)} />
      <Route path="campaigns/:id" element={wrap(<CampaignDetailPage />)} />
      <Route path="templates" element={wrap(<TemplatesPage />)} />
      <Route path="websites" element={wrap(<WebsitesPage />)} />
      <Route path="pages" element={wrap(<GeneratedPagesPage />)} />
      <Route path="css-scan-fix" element={<Navigate to="../dashboard" replace />} />
      <Route path="scanner" element={<Navigate to="../website-content" replace />} />
      <Route path="discovery" element={<Navigate to="../website-content" replace />} />
      <Route path="analytics" element={wrap(<AnalyticsPage />)} />
      <Route path="marketplace" element={wrap(<FeatureGate feature="internalLinks"><TemplateMarketplacePage /></FeatureGate>)} />
      <Route path="billing" element={wrap(<BillingPage />)} />
      <Route path="settings" element={wrap(<SettingsPage />)} />
      <Route path="admin" element={wrap(<AdminPage />)} />
      <Route path="admin/:group/:section" element={<AdminSectionRedirect />} />
      <Route path="admin/:section" element={<AdminSectionRedirect />} />
      <Route path="indexing" element={wrap(<FeatureGate feature="indexing"><IndexingPage /></FeatureGate>)} />
      <Route path="workspace-settings" element={wrap(<FeatureGate feature="teamCollaboration"><WorkspaceSettingsPage /></FeatureGate>)} />
      <Route path="data" element={wrap(<DataCsvPage />)} />
      <Route path="website-content" element={wrap(<FeatureGate feature="discovery"><WebsiteContentPage /></FeatureGate>)} />
      
      <Route path="content-calendar" element={<Navigate to="../dashboard" replace />} />
      <Route path="performance" element={wrap(<PagePerformancePage />)} />
      <Route path="seo-audit" element={wrap(<SeoAuditPage />)} />
      <Route path="affiliate" element={wrap(<AffiliatePage />)} />
      <Route path="referral" element={wrap(<ReferralPage />)} />
      <Route path="pgp-keywords" element={wrap(<PgpKeywordsPage />)} />
      <Route path="pgp-content" element={<Navigate to="../templates" replace />} />
      <Route path="pgp-generate" element={wrap(<PgpGeneratePage />)} />
      <Route path="pgp-terms" element={wrap(<PgpTermsPage />)} />
      <Route path="pgp-logs" element={<Navigate to="../pages" replace />} />
      <Route path="template-mapping" element={<Navigate to="../dashboard" replace />} />
      <Route path="template-kit" element={<Navigate to="../dashboard" replace />} />
      <Route path="elementor-test" element={wrap(<ElementorTestPage />)} />
      <Route path="wp-control" element={wrap(<WpControlPage />)} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    clearExpiredLocalAuthSession();
    captureReferralFromUrl();
    if (window.location.pathname === "/auth") {
      const key = getAuthStorageKey();
      if (key) localStorage.removeItem(key);
      setSession(null);
      setLoading(false);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase re-fires SIGNED_IN / TOKEN_REFRESHED every time the tab regains
      // focus. Updating session state on those redundant events causes the whole
      // app to re-render and can unmount the active page, wiping in-progress work.
      // Only update when the authenticated user actually changes.
      const newUserId = session?.user?.id ?? null;
      if (newUserId === lastUserIdRef.current && event !== "SIGNED_OUT") {
        setLoading(false);
        return;
      }
      lastUserIdRef.current = newUserId;
      setSession(session);
      setLoading(false);
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setTimeout(() => { attributeReferralIfPending(); }, 0);
      }
    });
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        // Validate the cached session against the server. A locally cached token
        // can reference a session that no longer exists (e.g. after an admin
        // password reset), which causes every authenticated call to 401.
        if (session) {
          const { error } = await supabase.auth.getUser();
          if (error) {
            await supabase.auth.signOut();
            clearExpiredLocalAuthSession();
            setSession(null);
            setLoading(false);
            return;
          }
        }
        lastUserIdRef.current = session?.user?.id ?? null;
        setSession(session);
        setLoading(false);
      })
      .catch(() => {
        clearExpiredLocalAuthSession();
        setSession(null);
        setLoading(false);
      });

    const handleUnload = () => {
      if (localStorage.getItem("sessionEphemeral") === "true") {
        if (localStorage.getItem("allowEphemeralSessionNavigationOnce") === "shopify-oauth") {
          localStorage.removeItem("allowEphemeralSessionNavigationOnce");
          return;
        }
        supabase.auth.signOut();
        localStorage.removeItem("sessionEphemeral");
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const handleLogout = async () => {
    // Clear cached plan so the next user never sees the previous user's plan.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("plan-cache:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <AutoTranslateProvider>
      <WorkspaceProvider>
      <BrandingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/docs" element={<DocumentationPage />} />
            <Route path="/supabase-test" element={<SupabaseConnectionTestPage />} />
            <Route path="/guides/wordpress" element={<WordPressGuidePage />} />
            <Route path="/guides/shopify" element={<ShopifyGuidePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/shopify/oauth-launch" element={<ShopifyOAuthLaunchPage />} />
            <Route path="/shopify/callback" element={<ShopifyCallbackPage />} />
            <Route path="/api/shopify/callback" element={<ShopifyCallbackPage />} />
            {import.meta.env.DEV && (
              <>
                <Route path="/__dev/republish-diff" element={<RepublishDiffHarnessPage />} />
                <Route path="/__dev/seo-analysis" element={<SeoAnalysisHarnessPage />} />
              </>
            )}

            {/* Workspace-prefixed routes */}
            <Route path="/w/:workspaceSlug" element={<WorkspaceRouter />}>
              <Route path="*" element={<DashboardRoutes session={session} onLogout={handleLogout} />} />
            </Route>

            {/* Legacy redirects — redirect old paths to workspace-prefixed versions */}
            <Route path="/dashboard" element={<ProtectedRoute session={session}><WorkspaceRedirect path="dashboard" /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute session={session}><WorkspaceRedirect path="campaigns" /></ProtectedRoute>} />
            <Route path="/campaigns/:id" element={<ProtectedRoute session={session}><WorkspaceRedirect path="campaigns" /></ProtectedRoute>} />
            <Route path="/templates" element={<ProtectedRoute session={session}><WorkspaceRedirect path="templates" /></ProtectedRoute>} />
            <Route path="/websites" element={<ProtectedRoute session={session}><WorkspaceRedirect path="websites" /></ProtectedRoute>} />
            <Route path="/pages" element={<ProtectedRoute session={session}><WorkspaceRedirect path="pages" /></ProtectedRoute>} />
            <Route path="/scanner" element={<ProtectedRoute session={session}><WorkspaceRedirect path="scanner" /></ProtectedRoute>} />
            <Route path="/discovery" element={<ProtectedRoute session={session}><WorkspaceRedirect path="discovery" /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute session={session}><WorkspaceRedirect path="analytics" /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute session={session}><WorkspaceRedirect path="marketplace" /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute session={session}><WorkspaceRedirect path="billing" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute session={session}><WorkspaceRedirect path="settings" /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute session={session}><WorkspaceRedirect path="admin" /></ProtectedRoute>} />
            <Route path="/indexing" element={<ProtectedRoute session={session}><WorkspaceRedirect path="indexing" /></ProtectedRoute>} />
            <Route path="/workspace-settings" element={<ProtectedRoute session={session}><WorkspaceRedirect path="workspace-settings" /></ProtectedRoute>} />
            <Route path="/data" element={<ProtectedRoute session={session}><WorkspaceRedirect path="data" /></ProtectedRoute>} />
            <Route path="/website-content" element={<ProtectedRoute session={session}><WorkspaceRedirect path="website-content" /></ProtectedRoute>} />
            
            <Route path="/content-calendar" element={<Navigate to="/" replace />} />
            <Route path="/performance" element={<ProtectedRoute session={session}><WorkspaceRedirect path="performance" /></ProtectedRoute>} />
            <Route path="/seo-audit" element={<ProtectedRoute session={session}><WorkspaceRedirect path="seo-audit" /></ProtectedRoute>} />
            <Route path="/affiliate" element={<ProtectedRoute session={session}><WorkspaceRedirect path="affiliate" /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute session={session}><WorkspaceRedirect path="referral" /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </BrandingProvider>
      </WorkspaceProvider>
      </AutoTranslateProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
