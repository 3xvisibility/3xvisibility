/**
 * Pure helpers for sidebar active-route detection & group auto-expansion.
 * Kept framework-free so they can be unit-tested in isolation.
 */

export interface SidebarNavItem {
  /** Relative path within workspace, e.g. "dashboard" */
  path: string;
}

/** Strip query string / hash and trailing slash from a pathname. */
export function normalizePath(p: string): string {
  return p.split(/[?#]/)[0].replace(/\/+$/, "");
}

/**
 * Segment-aware match so "/pages" doesn't match "/pages-archive", while
 * still matching nested routes like "/pages/123" or "/pages?tab=live".
 * The dashboard is treated as an exact match (it's the index route).
 */
export function isItemActive(
  pathname: string,
  basePath: string,
  item: SidebarNavItem,
): boolean {
  const currentPath = normalizePath(pathname);
  const full = normalizePath(`${basePath}/${item.path}`);
  if (item.path === "dashboard") return currentPath === full;
  return currentPath === full || currentPath.startsWith(`${full}/`);
}

/** Whether any nav item in a group matches the current route. */
export function isGroupActive(
  pathname: string,
  basePath: string,
  items: SidebarNavItem[],
): boolean {
  return items.some((item) => isItemActive(pathname, basePath, item));
}
