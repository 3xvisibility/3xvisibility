// WordPress Site Context Reader.
//
// Before generating a page we inspect the connected WordPress site so the
// native builder can produce output that is compatible with the live site:
//   - active theme + whether it is a block theme
//   - active/available plugins (Elementor? Elementor Pro? Gutenberg always)
//   - Elementor version + global colors / fonts / container width / breakpoints
//   - block-theme global styles (theme.json palette / typography) as a fallback
//
// All lookups are best-effort: every field degrades to a sane default so a site
// that blocks a REST route never breaks generation. The resolved context is
// cached on `websites.site_context` by the caller.

export interface GlobalColor {
  /** Elementor global id, e.g. "primary", "secondary", or a custom slug. */
  id: string;
  title: string;
  /** Hex / rgb value, normalized lowercase. */
  value: string;
}

export interface GlobalFont {
  id: string;
  title: string;
  family: string;
  weight?: string;
}

export interface SiteContext {
  url: string;
  activeTheme: string;
  isBlockTheme: boolean;
  plugins: string[];
  hasElementor: boolean;
  hasElementorPro: boolean;
  hasGutenberg: boolean;
  elementorVersion: string;
  globalColors: GlobalColor[];
  globalFonts: GlobalFont[];
  /** Boxed content width in px (Elementor kit `container_width`). */
  containerWidth: number;
  /** Full theme/site width in px. */
  themeWidth: number;
  breakpoints: { mobile: number; tablet: number };
  /** ISO timestamp the context was resolved. */
  fetchedAt: string;
  /** Routes that failed so callers can surface partial-context warnings. */
  warnings: string[];
}

export const DEFAULT_SITE_CONTEXT: Omit<SiteContext, "url" | "fetchedAt"> = {
  activeTheme: "",
  isBlockTheme: false,
  plugins: [],
  hasElementor: true,
  hasElementorPro: false,
  hasGutenberg: true,
  elementorVersion: "3.21.0",
  globalColors: [],
  globalFonts: [],
  containerWidth: 1140,
  themeWidth: 1140,
  breakpoints: { mobile: 767, tablet: 1024 },
  warnings: [],
};

interface AuthHeaders {
  Authorization?: string;
  [k: string]: string | undefined;
}

function normHex(v: unknown): string {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

async function safeJson(
  url: string,
  headers: AuthHeaders,
  warnings: string[],
  label: string,
): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: headers as Record<string, string> });
    if (!res.ok) {
      warnings.push(`${label}: HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    warnings.push(`${label}: ${e instanceof Error ? e.message : "fetch failed"}`);
    return null;
  }
}

/** Read the Elementor "kit" (global settings) and extract colors/fonts/width. */
function parseElementorKit(
  kit: any,
  ctx: SiteContext,
): void {
  const settings = kit?.settings ?? kit ?? {};
  const sysColors: any[] = settings.system_colors ?? [];
  const customColors: any[] = settings.custom_colors ?? [];
  for (const c of [...sysColors, ...customColors]) {
    const value = normHex(c?.color);
    if (!value) continue;
    ctx.globalColors.push({
      id: String(c?._id ?? c?.id ?? c?.title ?? "color").toLowerCase(),
      title: String(c?.title ?? c?._id ?? "Color"),
      value,
    });
  }
  const sysFonts: any[] = settings.system_typography ?? [];
  const customFonts: any[] = settings.custom_typography ?? [];
  for (const f of [...sysFonts, ...customFonts]) {
    const family = typeof f?.typography_font_family === "string"
      ? f.typography_font_family
      : "";
    if (!family) continue;
    ctx.globalFonts.push({
      id: String(f?._id ?? f?.id ?? f?.title ?? "font").toLowerCase(),
      title: String(f?.title ?? "Font"),
      family,
      weight: f?.typography_font_weight ? String(f.typography_font_weight) : undefined,
    });
  }
  const cw = Number(settings.container_width?.size ?? settings.container_width);
  if (Number.isFinite(cw) && cw > 0) {
    ctx.containerWidth = cw;
    ctx.themeWidth = Math.max(ctx.themeWidth, cw);
  }
  const mobile = Number(settings.viewport_mobile ?? settings.viewport_md);
  const tablet = Number(settings.viewport_tablet ?? settings.viewport_lg);
  if (Number.isFinite(mobile) && mobile > 0) ctx.breakpoints.mobile = mobile;
  if (Number.isFinite(tablet) && tablet > 0) ctx.breakpoints.tablet = tablet;
}

/** Pull palette/typography from a block theme's global-styles (theme.json). */
function parseGlobalStyles(gs: any, ctx: SiteContext): void {
  const palette: any[] =
    gs?.settings?.color?.palette?.theme ??
    gs?.settings?.color?.palette ??
    [];
  for (const p of palette) {
    const value = normHex(p?.color);
    if (!value) continue;
    ctx.globalColors.push({
      id: String(p?.slug ?? "color").toLowerCase(),
      title: String(p?.name ?? p?.slug ?? "Color"),
      value,
    });
  }
  const families: any[] = gs?.settings?.typography?.fontFamilies?.theme ?? [];
  for (const f of families) {
    if (!f?.fontFamily) continue;
    ctx.globalFonts.push({
      id: String(f?.slug ?? "font").toLowerCase(),
      title: String(f?.name ?? f?.slug ?? "Font"),
      family: String(f.fontFamily),
    });
  }
  const cw = Number(gs?.settings?.layout?.contentSize?.toString().replace(/[^\d.]/g, ""));
  if (Number.isFinite(cw) && cw > 0) ctx.containerWidth = cw;
}

/**
 * Resolve the full site context. `baseUrl` is the site root (no trailing
 * `/wp-json`). `headers` carries auth (Basic/JWT) for protected routes.
 */
export async function readSiteContext(
  baseUrl: string,
  headers: AuthHeaders = {},
): Promise<SiteContext> {
  const url = baseUrl.replace(/\/+$/, "");
  const ctx: SiteContext = {
    ...DEFAULT_SITE_CONTEXT,
    url,
    globalColors: [],
    globalFonts: [],
    plugins: [],
    warnings: [],
    breakpoints: { ...DEFAULT_SITE_CONTEXT.breakpoints },
    fetchedAt: new Date().toISOString(),
  };

  // 1) REST index: theme, namespaces (capability detection).
  const index = await safeJson(`${url}/wp-json/`, headers, ctx.warnings, "rest-index");
  if (index) {
    const namespaces: string[] = Array.isArray(index.namespaces) ? index.namespaces : [];
    ctx.hasElementor = namespaces.some((n) => n.startsWith("elementor"));
    ctx.hasGutenberg = namespaces.includes("wp/v2");
    if (typeof index?.site_logo === "number") { /* noop, just shape probing */ }
  }

  // 2) Active theme (block theme detection via `is_block_theme`).
  const themes = await safeJson(
    `${url}/wp-json/wp/v2/themes?status=active`,
    headers,
    ctx.warnings,
    "themes",
  );
  if (Array.isArray(themes) && themes[0]) {
    const t = themes[0];
    ctx.activeTheme = String(t?.stylesheet ?? t?.name?.rendered ?? t?.name ?? "");
    ctx.isBlockTheme = Boolean(t?.is_block_theme);
  }

  // 3) Plugins (may be 401 on locked sites — that's fine).
  const plugins = await safeJson(`${url}/wp-json/wp/v2/plugins`, headers, ctx.warnings, "plugins");
  if (Array.isArray(plugins)) {
    for (const p of plugins) {
      const name = String(p?.plugin ?? p?.name ?? "").toLowerCase();
      if (!name) continue;
      if (p?.status === "active" || p?.status === undefined) ctx.plugins.push(name);
    }
    ctx.hasElementor = ctx.hasElementor || ctx.plugins.some((p) => p.includes("elementor"));
    ctx.hasElementorPro = ctx.plugins.some((p) => p.includes("elementor-pro") || p.includes("pro/elementor"));
  }

  // 4) Elementor kit globals (colors/fonts/container width/breakpoints).
  const kit = await safeJson(
    `${url}/wp-json/elementor/v1/globals`,
    headers,
    ctx.warnings,
    "elementor-globals",
  );
  if (kit) parseElementorKit(kit, ctx);

  // 5) Block-theme fallback for global colors/typography.
  if (ctx.globalColors.length === 0 || ctx.isBlockTheme) {
    const gs = await safeJson(
      `${url}/wp-json/wp/v2/global-styles/themes/${encodeURIComponent(ctx.activeTheme || "")}`,
      headers,
      ctx.warnings,
      "global-styles",
    );
    if (gs) parseGlobalStyles(gs, ctx);
  }

  return ctx;
}
