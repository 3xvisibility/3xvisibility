import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Search, AlertTriangle, AlertCircle, Info, CheckCircle2, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { auditPage, type AuditResult } from "@/lib/seo-audit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";

const categoryIcon = {
  critical: <AlertTriangle className="h-4 w-4 text-destructive" />,
  warning: <AlertCircle className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
  passed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
};

const categoryLabel = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
  passed: "Passed",
};

export default function SeoAuditPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["seo-audit-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, slug, content, seo_title, seo_description, seo_keywords, status, created_at")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const audits = useMemo(() => {
    return pages.map((p) => ({
      page: p,
      audit: auditPage(p),
    }));
  }, [pages]);

  const filtered = useMemo(() => {
    return audits
      .filter((a) => {
        if (filter === "critical") return a.audit.items.some((i) => i.category === "critical");
        if (filter === "warning") return a.audit.items.some((i) => i.category === "warning");
        if (filter === "perfect") return a.audit.overallScore >= 90;
        return true;
      })
      .filter(
        (a) =>
          a.page.title.toLowerCase().includes(search.toLowerCase()) ||
          a.page.slug.toLowerCase().includes(search.toLowerCase())
      );
  }, [audits, search, filter]);

  const avgScore = audits.length > 0
    ? Math.round(audits.reduce((s, a) => s + a.audit.overallScore, 0) / audits.length)
    : 0;
  const criticalCount = audits.filter((a) => a.audit.items.some((i) => i.category === "critical")).length;
  const warningCount = audits.filter((a) => a.audit.items.some((i) => i.category === "warning")).length;
  const perfectCount = audits.filter((a) => a.audit.overallScore >= 90).length;

  const scoreColor = (s: number) =>
    s >= 85 ? "text-emerald-600" : s >= 60 ? "text-primary" : s >= 35 ? "text-amber-600" : "text-destructive";

  const scoreBarColor = (s: number) =>
    s >= 85 ? "bg-emerald-500" : s >= 60 ? "bg-primary" : s >= 35 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">{t("seoAudit.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("seoAudit.description")}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className={`text-3xl font-bold tabular-nums ${scoreColor(avgScore)}`}>{avgScore}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("seoAudit.avgScore")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-destructive">{criticalCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("seoAudit.criticalIssues")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-amber-500">{warningCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-emerald-600">{perfectCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Score ≥ 90</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pages</SelectItem>
            <SelectItem value="critical">Critical Issues</SelectItem>
            <SelectItem value="warning">Warnings</SelectItem>
            <SelectItem value="perfect">Score ≥ 90</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Page list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No pages found.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filtered.map(({ page, audit }) => (
            <AccordionItem
              key={page.id}
              value={page.id}
              className="border rounded-lg px-4 bg-card"
            >
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-10 text-center shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${scoreColor(audit.overallScore)}`}>
                      {audit.overallScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full ${scoreBarColor(audit.overallScore)}`}
                      style={{ width: `${audit.overallScore}%` }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground truncate">/{page.slug}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {audit.items.some((i) => i.category === "critical") && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">
                        {audit.items.filter((i) => i.category === "critical").length} Critical
                      </Badge>
                    )}
                    {audit.items.some((i) => i.category === "warning") && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 text-amber-600">
                        {audit.items.filter((i) => i.category === "warning").length} Warn
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pb-2">
                  {audit.items
                    .filter((i) => i.category !== "passed")
                    .map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 pl-1">
                        {categoryIcon[item.category]}
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          {item.recommendation && (
                            <p className="text-xs text-muted-foreground">{item.recommendation}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  {audit.items.filter((i) => i.category === "passed").length > 0 && (
                    <div className="pt-2 border-t border-border mt-2">
                      <p className="text-xs text-muted-foreground mb-1.5">
                        ✓ {audit.items.filter((i) => i.category === "passed").length} check(s) passed
                      </p>
                      {audit.items
                        .filter((i) => i.category === "passed")
                        .map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 pl-1">
                            {categoryIcon.passed}
                            <span className="text-xs text-muted-foreground">{item.label}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
