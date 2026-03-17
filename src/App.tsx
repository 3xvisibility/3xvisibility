import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import CampaignsPage from "./pages/CampaignsPage";
import TemplatesPage from "./pages/TemplatesPage";
import WebsitesPage from "./pages/WebsitesPage";
import BillingPage from "./pages/BillingPage";
import SettingsPage from "./pages/SettingsPage";
import GeneratedPagesPage from "./pages/GeneratedPagesPage";
import TemplateScannerPage from "./pages/TemplateScannerPage";
import WebsiteDiscoveryPage from "./pages/WebsiteDiscoveryPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import IndexingPage from "./pages/IndexingPage";
import AutoStoreGeneratorPage from "./pages/AutoStoreGeneratorPage";
import NotFound from "./pages/NotFound";
import { LanguageProvider } from "./i18n/LanguageContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";

const queryClient = new QueryClient();

function ProtectedRoute({ children, session }: { children: React.ReactNode; session: Session | null }) {
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
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
    return () => subscription.unsubscribe();
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
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><DashboardPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaigns"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><CampaignsPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><TemplatesPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/websites"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><WebsitesPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pages"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><GeneratedPagesPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/scanner"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><TemplateScannerPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/discovery"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><WebsiteDiscoveryPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><AnalyticsPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><BillingPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><SettingsPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><AdminPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/indexing"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><IndexingPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/store-generator"
              element={
                <ProtectedRoute session={session}>
                  <DashboardLayout onLogout={handleLogout}><AutoStoreGeneratorPage /></DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
