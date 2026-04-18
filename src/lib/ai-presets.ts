// Reusable AI bulk-generation presets.
// Stored in localStorage so users get instant save/recall across all campaigns —
// no DB writes, no AI cost, no extra round-trips.

export interface AiPreset {
  id: string;
  name: string;
  business: string;
  niche: string;
  service: string;
  pageCount: number;
  language?: string;
  country?: string;
  updatedAt: number;
}

const STORAGE_KEY = "ai-bulk-presets:v1";
const MAX_PRESETS = 25;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readAiPresets(): AiPreset[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is AiPreset => p && typeof p.id === "string" && typeof p.name === "string")
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

function writeAiPresets(presets: AiPreset[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
  } catch {
    // ignore quota errors
  }
}

export function saveAiPreset(input: Omit<AiPreset, "id" | "updatedAt"> & { id?: string }): AiPreset {
  const presets = readAiPresets();
  const now = Date.now();

  // If id given → update; else dedupe by case-insensitive name.
  const existingIdx = input.id
    ? presets.findIndex((p) => p.id === input.id)
    : presets.findIndex((p) => p.name.trim().toLowerCase() === input.name.trim().toLowerCase());

  const preset: AiPreset = {
    id: input.id ?? presets[existingIdx]?.id ?? `preset_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    business: input.business.trim(),
    niche: input.niche.trim(),
    service: input.service.trim(),
    pageCount: Math.max(1, Math.min(200, Math.round(input.pageCount || 20))),
    language: input.language,
    country: input.country,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    presets[existingIdx] = preset;
  } else {
    presets.unshift(preset);
  }

  writeAiPresets(presets);
  return preset;
}

export function deleteAiPreset(id: string) {
  writeAiPresets(readAiPresets().filter((p) => p.id !== id));
}
