import type { AnalyzerReport, AnalyzerCheckStatus } from "@/lib/analyzer-pdf";

export interface CheckChange {
  id: string;
  label: string;
  from: AnalyzerCheckStatus | null;
  to: AnalyzerCheckStatus | null;
  kind: "improved" | "regressed" | "added" | "removed";
  detail: string;
}

export interface CategoryDelta {
  key: string;
  label: string;
  previous: number;
  current: number;
  delta: number;
}

export interface AnalyzerDiff {
  overall: { previous: number; current: number; delta: number };
  issues: { previous: number; current: number; delta: number };
  categories: CategoryDelta[];
  changes: CheckChange[];
  unchanged: number;
}

const RANK: Record<AnalyzerCheckStatus, number> = { bad: 0, warn: 1, good: 2 };

function flatten(report: AnalyzerReport) {
  const map = new Map<string, { label: string; status: AnalyzerCheckStatus; detail: string }>();
  for (const cat of report.categories) {
    for (const c of cat.checks) {
      map.set(c.id, { label: c.label, status: c.status, detail: c.detail });
    }
  }
  return map;
}

/** Compares a fresh analyzer report against the previously stored one. */
export function diffReports(previous: AnalyzerReport, current: AnalyzerReport): AnalyzerDiff {
  const prev = flatten(previous);
  const curr = flatten(current);
  const changes: CheckChange[] = [];
  let unchanged = 0;

  for (const [id, c] of curr) {
    const p = prev.get(id);
    if (!p) {
      changes.push({ id, label: c.label, from: null, to: c.status, kind: "added", detail: c.detail });
      continue;
    }
    if (p.status === c.status) {
      unchanged += 1;
      continue;
    }
    changes.push({
      id,
      label: c.label,
      from: p.status,
      to: c.status,
      kind: RANK[c.status] > RANK[p.status] ? "improved" : "regressed",
      detail: c.detail,
    });
  }

  for (const [id, p] of prev) {
    if (!curr.has(id)) {
      changes.push({ id, label: p.label, from: p.status, to: null, kind: "removed", detail: p.detail });
    }
  }

  const order = { regressed: 0, improved: 1, added: 2, removed: 3 } as const;
  changes.sort((a, b) => order[a.kind] - order[b.kind] || a.label.localeCompare(b.label));

  const prevCats = new Map(previous.categories.map((c) => [c.key, c]));
  const categories: CategoryDelta[] = current.categories.map((c) => {
    const p = prevCats.get(c.key);
    return {
      key: c.key,
      label: c.label,
      previous: p?.score ?? c.score,
      current: c.score,
      delta: c.score - (p?.score ?? c.score),
    };
  });

  return {
    overall: {
      previous: previous.overall,
      current: current.overall,
      delta: current.overall - previous.overall,
    },
    issues: {
      previous: previous.issueCount,
      current: current.issueCount,
      delta: current.issueCount - previous.issueCount,
    },
    categories,
    changes,
    unchanged,
  };
}

const STORAGE_PREFIX = "3xv:analyzer:last:";

interface StoredSnapshot {
  savedAt: string;
  report: AnalyzerReport;
}

function key(host: string) {
  return `${STORAGE_PREFIX}${host.toLowerCase()}`;
}

export function loadSnapshot(host: string): StoredSnapshot | null {
  try {
    const raw = localStorage.getItem(key(host));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSnapshot;
    return parsed?.report?.categories ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSnapshot(report: AnalyzerReport) {
  try {
    localStorage.setItem(
      key(report.host),
      JSON.stringify({ savedAt: new Date().toISOString(), report } satisfies StoredSnapshot),
    );
  } catch {
    /* storage unavailable — comparison simply stays in-memory */
  }
}

export function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "earlier scan";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
