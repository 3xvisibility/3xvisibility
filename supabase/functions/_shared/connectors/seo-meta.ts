import type { PagePayload } from "./types.ts";

type MetaEntry = { key?: string; value?: unknown } | null | undefined;

function toCleanString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toCleanString(item);
      if (parsed) return parsed;
    }
    return undefined;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return toCleanString(record.raw ?? record.rendered ?? record.value ?? record.title);
  }

  return undefined;
}

export function normalizeSeoKeywords(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const keywords = value.flatMap((item) => normalizeSeoKeywords(item) ?? []);
    return keywords.length > 0 ? [...new Set(keywords)] : undefined;
  }

  const raw = toCleanString(value);
  if (!raw) return undefined;

  const keywords = raw
    .split(/[\n,|]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return keywords.length > 0 ? [...new Set(keywords)] : undefined;
}

export function metaArrayToRecord(metaData: MetaEntry[] | undefined): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  for (const entry of metaData ?? []) {
    if (!entry?.key) continue;
    record[entry.key] = entry.value;
  }

  return record;
}

export function extractSeoFieldsFromMeta(meta: Record<string, unknown> | null | undefined) {
  const source = meta ?? {};
  const seoKeywords = normalizeSeoKeywords(source.rank_math_focus_keyword ?? source._yoast_wpseo_focuskw);

  return {
    seo_title: toCleanString(source.rank_math_title ?? source._yoast_wpseo_title),
    seo_description: toCleanString(source.rank_math_description ?? source._yoast_wpseo_metadesc),
    seo_keywords: seoKeywords,
    canonical_url: toCleanString(source.rank_math_canonical_url ?? source._yoast_wpseo_canonical),
  };
}

export function buildSeoMetaRecord(payload: Partial<PagePayload>): Record<string, unknown> {
  const meta: Record<string, unknown> = {};

  if (payload.seo_title) {
    meta.rank_math_title = payload.seo_title;
    meta._yoast_wpseo_title = payload.seo_title;
  }

  if (payload.seo_description) {
    meta.rank_math_description = payload.seo_description;
    meta._yoast_wpseo_metadesc = payload.seo_description;
  }

  const keywords = payload.seo_keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? [];
  if (keywords.length > 0) {
    meta.rank_math_focus_keyword = keywords.join(", ");
    meta._yoast_wpseo_focuskw = keywords[0];
  }

  if (payload.canonical_url) {
    meta.rank_math_canonical_url = payload.canonical_url;
    meta._yoast_wpseo_canonical = payload.canonical_url;
  }

  return meta;
}

export function buildSeoMetaDataEntries(payload: Partial<PagePayload>): { key: string; value: string }[] {
  return Object.entries(buildSeoMetaRecord(payload)).map(([key, value]) => ({
    key,
    value: String(value),
  }));
}