import { supabase } from "@/integrations/supabase/client";

export type TemplateVersionRow = {
  id: string;
  template_id: string;
  workspace_id: string | null;
  user_id: string;
  version_number: number;
  name: string;
  content: string;
  elementor_data: unknown | null;
  seo_title_pattern: string | null;
  seo_description_pattern: string | null;
  schema_type: string | null;
  schema_config: Record<string, unknown> | null;
  template_kind: string | null;
  variables: string[] | null;
  change_summary: string | null;
  created_at: string;
};

type TemplateSnapshot = {
  id: string;
  workspace_id?: string | null;
  name: string;
  content?: string | null;
  elementor_data?: unknown | null;
  seo_title_pattern?: string | null;
  seo_description_pattern?: string | null;
  schema_type?: string | null;
  schema_config?: Record<string, unknown> | null;
  template_kind?: string | null;
  variables?: string[] | null;
};

/**
 * Record a new immutable snapshot of a template. Each call appends a row to
 * `template_versions` with the next incremental version number, so the full
 * history (with timestamps) is preserved for diffing. Best-effort: failures are
 * swallowed so they never block the primary save.
 */
export async function recordTemplateVersion(
  tpl: TemplateSnapshot,
  changeSummary = "",
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    const { data: last } = await supabase
      .from("template_versions")
      .select("version_number")
      .eq("template_id", tpl.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = ((last?.version_number as number) ?? 0) + 1;

    await supabase.from("template_versions").insert({
      template_id: tpl.id,
      workspace_id: tpl.workspace_id ?? null,
      user_id: uid,
      version_number: nextVersion,
      name: tpl.name,
      content: tpl.content ?? "",
      elementor_data: (tpl.elementor_data ?? null) as never,
      seo_title_pattern: tpl.seo_title_pattern ?? "",
      seo_description_pattern: tpl.seo_description_pattern ?? "",
      schema_type: tpl.schema_type ?? "WebPage",
      schema_config: (tpl.schema_config ?? {}) as never,
      template_kind: tpl.template_kind ?? "html",
      variables: tpl.variables ?? [],
      change_summary: changeSummary,
    } as never);
  } catch {
    // Versioning is best-effort and must never block the main operation.
  }
}

/**
 * Read the current template row by id and snapshot it as a new version. Use
 * after an update/customize where the DB already holds the latest content.
 */
export async function recordVersionById(templateId: string, changeSummary = ""): Promise<void> {
  const { data } = await supabase
    .from("templates")
    .select("id, workspace_id, name, content, elementor_data, seo_title_pattern, seo_description_pattern, schema_type, schema_config, template_kind, variables")
    .eq("id", templateId)
    .maybeSingle();
  if (data) await recordTemplateVersion(data as TemplateSnapshot, changeSummary);
}

/**
 * Resolve the freshly-saved template row (by name within a workspace) when the
 * insert call did not return the new id, then record its first version.
 */
export async function recordVersionForLatest(
  workspaceId: string,
  name: string,
  changeSummary = "Initial version",
): Promise<void> {
  const { data } = await supabase
    .from("templates")
    .select("id, workspace_id, name, content, elementor_data, seo_title_pattern, seo_description_pattern, schema_type, schema_config, template_kind, variables")
    .eq("workspace_id", workspaceId)
    .eq("name", name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) await recordTemplateVersion(data as TemplateSnapshot, changeSummary);
}

export type DiffLine = { type: "add" | "del" | "same"; text: string };

/** Simple LCS-based line diff for the change log view. */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = (oldText || "").split("\n");
  const b = (newText || "").split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}

export function diffStats(lines: DiffLine[]) {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.type === "add") added++;
    else if (l.type === "del") removed++;
  }
  return { added, removed };
}
