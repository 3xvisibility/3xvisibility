import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  Search,
  Download,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { downloadAnalyzerPdf } from "@/lib/analyzer-pdf";
import { AnalyzerPageRecommendations } from "@/components/landing/AnalyzerPageRecommendations";



type CheckStatus = "good" | "warn" | "bad";

interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  fix: string;
}

interface Category {
  key: string;
  label: string;
  score: number;
  checks: Check[];
}

interface Report {
  url: string;
  host: string;
  title: string;
  description: string;
  overall: number;
  categories: Category[];
  issueCount: number;
  topFixes: { label: string; detail: string; fix: string }[];
}

const statusIcon: Record<CheckStatus, typeof CheckCircle2> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
};

const statusClass: Record<CheckStatus, string> = {
  good: "text-primary",
  warn: "text-amber-500",
  bad: "text-destructive",
};

function scoreTone(score: number) {
  if (score >= 80) return { label: "Strong", cls: "text-primary", ring: "hsl(var(--primary))" };
  if (score >= 50) return { label: "Needs work", cls: "text-amber-500", ring: "hsl(38 92% 50%)" };
  return { label: "Critical", cls: "text-destructive", ring: "hsl(var(--destructive))" };
}

function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const tone = scoreTone(score);
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="10" className="stroke-muted" fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          stroke={tone.ring}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(score / 100) * circ} ${circ}` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold ${tone.cls}`}>{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{tone.label}</span>
      </div>
    </div>
  );
}

export function WebsiteAnalyzerSection() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const pendingRef = useRef<string | null>(null);

  const runAnalysis = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-website-free", {
        body: { url: value },
      });
      if (fnError) throw fnError;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setReport(data as Report);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      setError(message.includes("non-2xx") ? "We couldn't analyze that URL. Check it and try again." : message);
    } finally {
      setLoading(false);
    }
  }, []);

  // The hero URL bar hands off here.
  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent<string>).detail;
      if (!value || pendingRef.current === value) return;
      pendingRef.current = value;
      setUrl(value);
      void runAnalysis(value);
    };
    window.addEventListener("analyze-website", handler);
    return () => window.removeEventListener("analyze-website", handler);
  }, [runAnalysis]);

  const analyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    pendingRef.current = url.trim();
    void runAnalysis(url);
  };


  return (
    <section id="analyze" className="relative py-20 md:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary mb-6">
            <Sparkles className="h-3 w-3" />
            <span>Free instant audit</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-[-0.03em]">
            See where your website stands <span className="text-gradient-primary">right now</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Enter your URL and get a live SEO, AI-visibility and technical health report — plus exactly which
            tool inside the platform fixes each issue.
          </p>

          <form onSubmit={analyze} className="mt-8 flex flex-col sm:flex-row items-stretch gap-3 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your website URL"
                aria-label="Website URL"
                className="h-12 pl-10 rounded-xl"
              />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="h-12 rounded-xl px-6 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Analyze my website <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {loading && (
            <p className="mt-3 text-sm text-muted-foreground">Crawling your page, headings, schema and sitemap…</p>
          )}
        </div>

        <AnimatePresence>
          {report && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-12 max-w-5xl mx-auto"
            >
              <div className="rounded-2xl border bg-card shadow-xl overflow-hidden">
                {/* header */}
                <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8 border-b">
                  <ScoreRing score={report.overall} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Website health report
                    </p>
                    <h3 className="text-2xl font-bold truncate">{report.host}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {report.title || "No page title found"}
                    </p>
                    <p className="mt-3 text-sm">
                      <span className="font-semibold text-foreground">{report.issueCount} issues</span>{" "}
                      <span className="text-muted-foreground">found that are holding back your visibility.</span>
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                    <Button asChild size="lg" className="rounded-xl font-semibold">
                      <Link to="/auth">
                        Fix these with 3xVisibility <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="rounded-xl font-semibold"
                      onClick={() => downloadAnalyzerPdf(report)}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download PDF report
                    </Button>
                  </div>

                </div>

                {/* categories */}
                <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
                  {report.categories.map((cat) => (
                    <div key={cat.key} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-sm">{cat.label}</h4>
                        <span className={`text-sm font-bold ${scoreTone(cat.score).cls}`}>{cat.score}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted mb-5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.score}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: scoreTone(cat.score).ring }}
                        />
                      </div>
                      <ul className="space-y-3">
                        {cat.checks.map((c) => {
                          const Icon = statusIcon[c.status];
                          return (
                            <li key={c.id} className="flex gap-2.5 text-sm">
                              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${statusClass[c.status]}`} />
                              <div className="min-w-0">
                                <p className="font-medium leading-tight">{c.label}</p>
                                <p className="text-xs text-muted-foreground break-words">{c.detail}</p>
                                {c.status !== "good" && (
                                  <p className="text-xs text-primary mt-0.5">{c.fix}</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* action plan */}
                {report.topFixes.length > 0 && (
                  <div className="border-t p-6 md:p-8 bg-muted/30">
                    <h4 className="font-semibold mb-4">Your improvement plan</h4>
                    <ol className="space-y-3">
                      {report.topFixes.map((f, i) => (
                        <li key={f.label} className="flex gap-3 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium">
                              {f.label} — <span className="text-muted-foreground font-normal">{f.detail}</span>
                            </p>
                            <p className="text-xs text-primary">{f.fix}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <Button asChild className="mt-6 rounded-xl font-semibold">
                      <Link to="/auth">
                        Start fixing free <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
