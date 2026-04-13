export type WebsiteContentListTab = "pages" | "products";
export type PageEditorTab = "edit" | "seo" | "preview" | "changes" | "source";
export type PageEditorMode = "visual" | "html" | "split";

export interface PageEditorSeoResult {
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
}

interface WebsiteContentUiState {
  selectedWebsite: string;
  activeTab: WebsiteContentListTab;
  search: string;
  editPageId: string | null;
  updatedAt: number;
}

interface PageEditorDraft {
  pageId: string;
  websiteId: string;
  editTitle: string;
  editContent: string;
  editExcerpt: string;
  activeTab: PageEditorTab;
  editMode: PageEditorMode;
  seoFields: string[];
  seoInstruction: string;
  seoResult: PageEditorSeoResult | null;
  published: boolean;
  pushError: string | null;
  updatedAt: number;
}

const UI_STORAGE_KEY = "website-content-ui-state:v1";
const DRAFT_STORAGE_PREFIX = "website-content-page-draft:v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3;

function canUseStorage() {
  return typeof window !== "undefined";
}

function safeRead<T>(key: string): T | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
}

function safeRemove(key: string) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage remove failures.
  }
}

function isExpired(updatedAt?: number) {
  return typeof updatedAt !== "number" || Date.now() - updatedAt > MAX_AGE_MS;
}

function getDraftKey(websiteId: string, pageId: string) {
  return `${DRAFT_STORAGE_PREFIX}:${websiteId}:${pageId}`;
}

export function readWebsiteContentUiState() {
  const state = safeRead<WebsiteContentUiState>(UI_STORAGE_KEY);
  if (!state) return null;

  if (isExpired(state.updatedAt)) {
    safeRemove(UI_STORAGE_KEY);
    return null;
  }

  const { updatedAt, ...rest } = state;
  return rest;
}

export function writeWebsiteContentUiState(state: Omit<WebsiteContentUiState, "updatedAt">) {
  safeWrite(UI_STORAGE_KEY, {
    ...state,
    updatedAt: Date.now(),
  });
}

export function clearWebsiteContentUiEditPage() {
  const current = readWebsiteContentUiState();
  if (!current) return;

  writeWebsiteContentUiState({
    ...current,
    editPageId: null,
  });
}

export function readPageEditorDraft(websiteId: string, pageId: string) {
  const draft = safeRead<PageEditorDraft>(getDraftKey(websiteId, pageId));
  if (!draft) return null;

  if (isExpired(draft.updatedAt)) {
    safeRemove(getDraftKey(websiteId, pageId));
    return null;
  }

  const { updatedAt, ...rest } = draft;
  return rest;
}

export function writePageEditorDraft(
  draft: Omit<PageEditorDraft, "updatedAt">,
) {
  safeWrite(getDraftKey(draft.websiteId, draft.pageId), {
    ...draft,
    updatedAt: Date.now(),
  });
}