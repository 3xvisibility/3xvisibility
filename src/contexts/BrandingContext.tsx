import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface BrandingConfig {
  app_name?: string;
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  favicon_url?: string;
  hide_powered_by?: boolean;
}

interface BrandingContextType {
  branding: BrandingConfig;
  appName: string;
  logoUrl: string | null;
  isWhitelabeled: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: {},
  appName: "3XVISIBILITY",
  logoUrl: null,
  isWhitelabeled: false,
});

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { currentWorkspace } = useWorkspace();

  const branding = useMemo<BrandingConfig>(() => {
    const raw = (currentWorkspace as any)?.branding;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as BrandingConfig;
    return {};
  }, [currentWorkspace]);

  const appName = branding.app_name?.trim() || "3XVISIBILITY";
  const logoUrl = branding.logo_url?.trim() || null;
  const isWhitelabeled = !!(branding.app_name || branding.logo_url || branding.primary_color);

  // Apply custom CSS variables when branding colors are set
  useEffect(() => {
    const root = document.documentElement;
    if (branding.primary_color) {
      root.style.setProperty("--brand-primary", branding.primary_color);
    } else {
      root.style.removeProperty("--brand-primary");
    }
    if (branding.accent_color) {
      root.style.setProperty("--brand-accent", branding.accent_color);
    } else {
      root.style.removeProperty("--brand-accent");
    }

    // Update favicon
    if (branding.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) link.href = branding.favicon_url;
    }

    // Update document title
    if (branding.app_name) {
      document.title = branding.app_name;
    }

    return () => {
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-accent");
    };
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, appName, logoUrl, isWhitelabeled }}>
      {children}
    </BrandingContext.Provider>
  );
}
