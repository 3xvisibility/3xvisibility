import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceRouter } from "@/components/WorkspaceRouter";
import { WorkspaceRedirect } from "@/components/WorkspaceRedirect";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import TemplatesPage from "./pages/TemplatesPage";
import WebsitesPage from "./pages/WebsitesPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import GeneratedPagesPage from "./pages/GeneratedPagesPage";
import TemplateScannerPage from "./pages/TemplateScannerPage";
import WebsiteDiscoveryPage from "./pages/WebsiteDiscoveryPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import TemplateMarketplacePage from "./pages/TemplateMarketplacePage";
import IndexingPage from "./pages/IndexingPage";
import ABTestingPage from "./pages/ABTestingPage";
import ContentCalendarPage from "./pages/ContentCalendarPage";
import PagePerformancePage from "./pages/PagePerformancePage";
import SeoAuditPage from "./pages/SeoAuditPage";
import AffiliatePage from "./pages/AffiliatePage";

import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import DataCsvPage from "./pages/DataCsvPage";
import WebsiteContentPage from "./pages/WebsiteContentPage";
import NotFound from "./pages/NotFound";
import { LanguageProvider } from "./i18n/LanguageContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import { FeatureGate } from "./components/FeatureGate";

const queryClient = new QueryClient();

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
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
      <Route path="campaigns/:id" element={wrap(<CampaignDetailPage />)} />
      <Route path="templates" element={wrap(<TemplatesPage />)} />
      <Route path="websites" element={wrap(<WebsitesPage />)} />
      <Route path="pages" element={wrap(<GeneratedPagesPage />)} />
      <Route path="scanner" element={wrap(<TemplateScannerPage />)} />
      <Route path="discovery" element={wrap(<FeatureGate feature="discovery"><WebsiteDiscoveryPage /></FeatureGate>)} />
      <Route path="analytics" element={wrap(<AnalyticsPage />)} />
      <Route path="marketplace" element={wrap(<TemplateMarketplacePage />)} />
      <Route path="billing" element={wrap(<BillingPage />)} />
      <Route path="settings" element={wrap(<SettingsPage />)} />
      <Route path="admin" element={wrap(<AdminPage />)} />
      <Route path="indexing" element={wrap(<FeatureGate feature="indexing"><IndexingPage /></FeatureGate>)} />
      <Route path="workspace-settings" element={wrap(<FeatureGate feature="teamCollaboration"><WorkspaceSettingsPage /></FeatureGate>)} />
      <Route path="data" element={wrap(<DataCsvPage />)} />
      <Route path="website-content" element={wrap(<WebsiteContentPage />)} />
      <Route path="ab-testing" element={wrap(<ABTestingPage />)} />
      <Route path="content-calendar" element={wrap(<ContentCalendarPage />)} />
      <Route path="performance" element={wrap(<PagePerformancePage />)} />
      <Route path="seo-audit" element={wrap(<SeoAuditPage />)} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const handleUnload = () => {
      if (localStorage.getItem("sessionEphemeral") === "true") {
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
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <WorkspaceProvider>
      <BrandingProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

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
            <Route path="/ab-testing" element={<ProtectedRoute session={session}><WorkspaceRedirect path="ab-testing" /></ProtectedRoute>} />
            <Route path="/content-calendar" element={<ProtectedRoute session={session}><WorkspaceRedirect path="content-calendar" /></ProtectedRoute>} />
            <Route path="/performance" element={<ProtectedRoute session={session}><WorkspaceRedirect path="performance" /></ProtectedRoute>} />
            <Route path="/seo-audit" element={<ProtectedRoute session={session}><WorkspaceRedirect path="seo-audit" /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </BrandingProvider>
      </WorkspaceProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
