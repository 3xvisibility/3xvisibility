/**
 * use-persisted-state
 *
 * Drop-in replacement for `useState` that transparently mirrors its value to
 * `localStorage` so that work-in-progress survives page navigation, tab
 * switches, accidental refreshes, etc.
 *
 * Designed for the "auto-restore silently" UX:
 *  - On mount, if a saved value exists (and isn't expired), it's loaded.
 *  - On every state change, the new value is written back (debounced).
 *  - When the user explicitly finishes/submits, call the returned `clear()`.
 *
 * Notes:
 *  - Storage is per-browser only — no server/DB sync.
 *  - Values must be JSON-serialisable.
 *  - Keys are namespaced under `pgp:state:` to avoid collisions.
 *  - A TTL (default 14 days) prevents stale forms from lingering forever.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const NAMESPACE = "pgp:state:";
const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const WRITE_DEBOUNCE_MS = 300;

interface StoredEnvelope<T> {
  v: T;
  /** epoch ms when this entry was last written */
  t: number;
}

interface Options {
  /** Override the default 14-day expiry. Pass 0 to disable expiry. */
  ttlMs?: number;
  /**
   * If true (default), the value is also restored when this tab regains
   * focus, so changes made in another tab on the same form are picked up.
   */
  syncAcrossTabs?: boolean;
  /**
   * Optional version tag. Bump it when the shape of `T` changes to
   * automatically discard incompatible saved values.
   */
  version?: string | number;
}

function safeRead<T>(fullKey: string, ttlMs: number, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(fullKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StoredEnvelope<T>;
    if (!parsed || typeof parsed !== "object" || !("v" in parsed)) return fallback;
    if (ttlMs > 0 && parsed.t && Date.now() - parsed.t > ttlMs) {
      window.localStorage.removeItem(fullKey);
      return fallback;
    }
    return parsed.v;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(fullKey: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    const envelope: StoredEnvelope<T> = { v: value, t: Date.now() };
    window.localStorage.setItem(fullKey, JSON.stringify(envelope));
  } catch {
    // quota exceeded / serialisation failure → silently ignore.
  }
}

function buildKey(key: string, version?: string | number): string {
  const v = version === undefined ? "" : `@${version}`;
  return `${NAMESPACE}${key}${v}`;
}

/**
 * Like React.useState, but persists to localStorage under `key`.
 *
 * @returns [value, setValue, clear]
 *   `clear()` removes the persisted entry (use after a successful submit).
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T | (() => T),
  options: Options = {},
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const { ttlMs = DEFAULT_TTL_MS, syncAcrossTabs = true, version } = options;
  const fullKey = buildKey(key, version);

  const [value, setValue] = useState<T>(() => {
    const initial =
      typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
    return safeRead<T>(fullKey, ttlMs, initial);
  });

  const writeTimer = useRef<number | null>(null);
  const latestRef = useRef(value);
  latestRef.current = value;

  // Debounced write whenever `value` changes.
  useEffect(() => {
    if (writeTimer.current) window.clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(() => {
      safeWrite(fullKey, latestRef.current);
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) window.clearTimeout(writeTimer.current);
    };
  }, [value, fullKey]);

  // Flush on unmount / tab close so we don't lose the last keystroke.
  useEffect(() => {
    const flush = () => safeWrite(fullKey, latestRef.current);
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [fullKey]);

  // Cross-tab sync: when another tab updates the same key, mirror it here.
  useEffect(() => {
    if (!syncAcrossTabs) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== fullKey || e.newValue === null) return;
      try {
        const parsed = JSON.parse(e.newValue) as StoredEnvelope<T>;
        if (parsed && "v" in parsed) setValue(parsed.v);
      } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fullKey, syncAcrossTabs]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(fullKey);
    } catch { /* ignore */ }
  }, [fullKey]);

  return [value, setValue, clear];
}

/**
 * Persist an existing piece of state without taking ownership of it.
 *
 * Useful when state is already managed elsewhere (e.g. by react-hook-form,
 * a reducer, or a parent component) and you just want it auto-saved/auto-
 * restored on mount.
 *
 * @param key      Stable storage key (already namespaced internally).
 * @param value    The current value to persist.
 * @param onRestore Called once on mount with a previously persisted value, if any.
 *                  Return value is ignored — use it to hydrate your state.
 */
export function usePersistedSnapshot<T>(
  key: string,
  value: T,
  onRestore: (restored: T) => void,
  options: Options = {},
) {
  const { ttlMs = DEFAULT_TTL_MS, version } = options;
  const fullKey = buildKey(key, version);
  const restored = useRef(false);
  const writeTimer = useRef<number | null>(null);
  const latestRef = useRef(value);
  latestRef.current = value;

  // Restore once on mount.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = safeRead<T | undefined>(fullKey, ttlMs, undefined);
    if (stored !== undefined) onRestore(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  // Debounced write on every change.
  useEffect(() => {
    if (writeTimer.current) window.clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(() => {
      safeWrite(fullKey, latestRef.current);
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (writeTimer.current) window.clearTimeout(writeTimer.current);
    };
  }, [value, fullKey]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(fullKey);
    } catch { /* ignore */ }
  }, [fullKey]);

  return clear;
}
