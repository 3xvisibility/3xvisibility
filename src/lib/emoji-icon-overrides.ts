/**
 * Persistence + engine wiring for the user-configurable emoji → icon mapping.
 *
 * The Elementor engine keeps overrides in memory (see `setEmojiIconOverrides`).
 * This module persists them in localStorage and hydrates the engine at app boot
 * so page generation/publish uses the customized mapping.
 */
import { setEmojiIconOverrides, getEmojiIconOverrides } from "@/lib/connectors/elementor-engine";

export const EMOJI_ICON_OVERRIDES_KEY = "emoji-icon-overrides";

/** Read overrides from localStorage (safe on SSR / private mode). */
export function loadEmojiIconOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(EMOJI_ICON_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
  } catch {
    /* ignore malformed storage */
  }
  return {};
}

/** Persist overrides and apply them to the engine immediately. */
export function saveEmojiIconOverrides(overrides: Record<string, string>): void {
  try {
    localStorage.setItem(EMOJI_ICON_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    /* ignore quota / private mode */
  }
  setEmojiIconOverrides(overrides);
}

/** Hydrate the engine from localStorage. Call once at app startup. */
export function initEmojiIconOverrides(): void {
  setEmojiIconOverrides(loadEmojiIconOverrides());
}

export { getEmojiIconOverrides };
