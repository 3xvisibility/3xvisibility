import { useSyncExternalStore } from "react";
import { languages as baseLanguages, type Language } from "./translations";

/**
 * Locale configuration overrides.
 *
 * Only presentation attributes (label, flag, enabled) can be customized.
 * The set of locale `code`s and their bundled translations are fixed at
 * build time and can NEVER be added/removed/renamed at runtime — that keeps
 * the app safe from referencing a locale with no translation data.
 */
export interface LocaleOverride {
  label?: string;
  flag?: string;
  enabled?: boolean;
}

export interface EffectiveLocale {
  code: Language;
  label: string;
  flag: string;
  enabled: boolean;
  /** Defaults from the source-of-truth list, for reset/diff UI. */
  defaultLabel: string;
  defaultFlag: string;
}

const STORAGE_KEY = "locale-config-overrides";
const EVENT = "locale-config-changed";

const VALID_CODES = new Set(baseLanguages.map((l) => l.code));

function readOverrides(): Record<string, LocaleOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LocaleOverride>;
    // Drop any keys that aren't valid locale codes.
    const clean: Record<string, LocaleOverride> = {};
    for (const [code, ov] of Object.entries(parsed)) {
      if (VALID_CODES.has(code as Language) && ov && typeof ov === "object") {
        clean[code] = ov;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, LocaleOverride>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new Event(EVENT));
}

/** Reset every customization back to the build-time defaults. */
export function resetLocaleConfig() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Save edits for a single locale. Throws on invalid input so callers can
 * surface a friendly error instead of persisting a broken config.
 */
export function saveLocaleOverride(code: Language, patch: LocaleOverride) {
  if (!VALID_CODES.has(code)) {
    throw new Error(`Unknown locale code: ${code}`);
  }

  const next = readOverrides();
  const merged: LocaleOverride = { ...next[code], ...patch };

  if (merged.label !== undefined && merged.label.trim() === "") {
    throw new Error("Label cannot be empty.");
  }
  if (merged.flag !== undefined && merged.flag.trim() === "") {
    throw new Error("Flag cannot be empty.");
  }

  // Never allow disabling the last enabled locale.
  if (merged.enabled === false) {
    const stillEnabled = getEffectiveLocales().filter(
      (l) => l.enabled && l.code !== code
    );
    if (stillEnabled.length === 0) {
      throw new Error("At least one locale must stay enabled.");
    }
  }

  next[code] = merged;
  writeOverrides(next);
}

/** Merge build-time defaults with stored overrides. */
export function getEffectiveLocales(): EffectiveLocale[] {
  const overrides = readOverrides();
  return baseLanguages.map((l) => {
    const ov = overrides[l.code] ?? {};
    return {
      code: l.code,
      label: ov.label?.trim() || l.label,
      flag: ov.flag?.trim() || l.flag,
      enabled: ov.enabled !== false,
      defaultLabel: l.label,
      defaultFlag: l.flag,
    };
  });
}

/** Only the locales a user is allowed to switch to. */
export function getEnabledLocales(): EffectiveLocale[] {
  return getEffectiveLocales().filter((l) => l.enabled);
}

// ----- React bindings (useSyncExternalStore) -----

let cache: EffectiveLocale[] = getEffectiveLocales();

function subscribe(callback: () => void) {
  const handler = () => {
    cache = getEffectiveLocales();
    callback();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot() {
  return cache;
}

/** Reactive list of all locales (enabled + disabled). */
export function useEffectiveLocales(): EffectiveLocale[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Reactive list of only enabled locales. */
export function useEnabledLocales(): EffectiveLocale[] {
  return useEffectiveLocales().filter((l) => l.enabled);
}
