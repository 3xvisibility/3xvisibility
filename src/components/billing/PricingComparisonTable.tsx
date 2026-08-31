import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Gift,
  Loader2,
  ArrowRight,
  Rocket,
  LayoutTemplate,
  Search,
  Globe,
  Users,
  Wrench,
  Info,
  ChevronDown,

} from "lucide-react";
import { PLAN_FEATURES, type PlanName } from "@/lib/plan-features";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { BRANDS, type BrandModel } from "./ModelBrandIcons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BrandIconTooltip, BrandTooltipProvider } from "@/components/billing/BrandIconTooltip";


interface PricingComparisonTableProps {
  activePlan: PlanName;
  currentPlan: PlanName;
  isYearly: boolean;
  loadingPlan: PlanName | null;
  onPlanClick: (name: PlanName) => void;
  onToggleYearly: () => void;
  trialEligible: boolean;
}

const YEARLY_DISCOUNT = 2 / 12;

const PLAN_ORDER: PlanName[] = ["free", "starter", "pro", "agency"];

const planMeta: {
  name: PlanName;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  descriptionKey: string;
}[] = [
  {
    name: "free",
    icon: <Gift className="h-4 w-4" />,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
    descriptionKey: "billing.planDescFree",
  },
  {
    name: "starter",
    icon: <Zap className="h-4 w-4" />,
    colorClass: "text-secondary",
    bgClass: "bg-secondary/10",
    descriptionKey: "billing.planDescStarter",
  },
  {
    name: "pro",
    icon: <Sparkles className="h-4 w-4" />,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    descriptionKey: "billing.planDescPro",
  },
  {
    name: "agency",
    icon: <Crown className="h-4 w-4" />,
    colorClass: "text-warning",
    bgClass: "bg-warning/10",
    descriptionKey: "billing.planDescAgency",
  },
];

const monthlyPrices: Record<PlanName, number> = {
  free: 0,
  starter: 19,
  pro: 59,
  agency: 149,
};

type CellValue = boolean | number | string;

interface ModelChip {
  /** Short badge label, e.g. "GPT" */
  short: string;
  /** Full model name shown on hover */
  full: string;
  /** Tailwind classes for the chip */
  tone: string;
}

interface FeatureRow {
  /** Stable id used for hover state. */
  id: string;
  /** Existing i18n key, when one exists. */
  labelKey?: string;
  /** Plain label used when no i18n key exists (auto-translated at runtime). */
  label?: string;
  /** Short explainer shown under the label (opttab-style detail). */
  hint?: string;
  /** Numeric plan-features key, or explicit per-plan values. */
  featureKey?: keyof (typeof PLAN_FEATURES)["free"];
  values?: Record<PlanName, CellValue>;
  /** Extra note rendered under a truthy check, per plan. */
  notes?: Partial<Record<PlanName, string>>;
  /** Renders model chips instead of a check/number cell. */
  models?: Record<PlanName, ModelChip[]>;
  /** Renders brand logo chips (OpenAI, Gemini, Claude…). */
  brands?: Record<PlanName, BrandModel[]>;
  /** Longer explanation shown in the row detail modal. */
  details?: string;
  /** Concrete usage examples shown in the row detail modal. */
  examples?: string[];
}



interface FeatureGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  rows: FeatureRow[];
}

/** `t` helper shorthand */
type T = (key: string, vars?: Record<string, string | number>) => string;

const tier = (free: CellValue, starter: CellValue, pro: CellValue, agency: CellValue): Record<PlanName, CellValue> => ({
  free,
  starter,
  pro,
  agency,
});

const M = {
  gptNano: { short: "5.6L", full: "GPT-5.6 Luna (fast, low cost)", tone: "bg-foreground/10 text-foreground" },
  gptMini: { short: "5.4M", full: "GPT-5.4 Mini", tone: "bg-foreground/10 text-foreground" },
  gpt55: { short: "5.5", full: "GPT-5.5 (frontier reasoning)", tone: "bg-foreground/15 text-foreground" },
  gptSol: { short: "5.6S", full: "GPT-5.6 Sol (flagship)", tone: "bg-foreground/15 text-foreground" },
  gemLite: { short: "G-L", full: "Gemini 3.1 Flash Lite", tone: "bg-primary/10 text-primary" },
  gemFlash: { short: "G-F", full: "Gemini 3.6 Flash", tone: "bg-primary/10 text-primary" },
  gemPro: { short: "G-P", full: "Gemini 3.1 Pro", tone: "bg-primary/15 text-primary" },
  imgMini: { short: "IMG", full: "GPT-Image-1 Mini (image generation)", tone: "bg-secondary/15 text-secondary" },
  img2: { short: "IMG2", full: "GPT-Image-2 (high quality images)", tone: "bg-secondary/15 text-secondary" },
  nano2: { short: "NB2", full: "Nano Banana 2 — Gemini 3.1 Flash Image", tone: "bg-warning/15 text-warning" },
  gem3ProImg: { short: "G3PI", full: "Gemini 3 Pro Image (highest fidelity)", tone: "bg-warning/15 text-warning" },
  voice: { short: "TTS", full: "Text-to-speech & speech-to-text models", tone: "bg-success/15 text-success" },
} satisfies Record<string, ModelChip>;

const freeModels = [M.gemLite, M.gptNano];
const starterModels = [...freeModels, M.gemFlash, M.gptMini, M.imgMini];
const proModels = [...starterModels, M.gemPro, M.gpt55, M.img2, M.nano2];
const agencyModels = [...proModels, M.gptSol, M.gem3ProImg, M.voice];

const freeBrands = [BRANDS.gemini];
const starterBrands = [BRANDS.gemini, BRANDS.openai];
const proBrands = [BRANDS.gemini, BRANDS.openai, BRANDS.claude, BRANDS.perplexity];
const agencyBrands = [BRANDS.gemini, BRANDS.openai, BRANDS.claude, BRANDS.perplexity];

const featureGroups: FeatureGroup[] = [
  {
    id: "models",
    label: "AI models",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    rows: [
      {
        id: "available-brands",
        label: "Available models",
        hint: "Model providers you can generate, rewrite and score content with",
        brands: {
          free: freeBrands,
          starter: starterBrands,
          pro: proBrands,
          agency: agencyBrands,
        },
      },
      {
        id: "available-models",
        label: "Included model tiers",
        hint: "Exact models unlocked on each plan",
        models: {
          free: freeModels,
          starter: starterModels,
          pro: proModels,
          agency: agencyModels,
        },
      },
      {
        id: "model-picker",
        label: "Choose model per generation",
        hint: "Pick a specific model for each campaign, rewrite or image job",
        values: tier(false, false, true, true),
      },
      {
        id: "model-fallback",
        label: "Automatic provider fallback",
        hint: "Retries on another provider if one fails or is rate-limited",
        values: tier(true, true, true, true),
      },
      {
        id: "model-image",
        label: "AI image generation",
        values: tier(false, true, true, true),
        notes: { starter: "Standard", pro: "High quality", agency: "Highest fidelity" },
      },
      {
        id: "model-voice",
        label: "Voice models (TTS / STT)",
        values: tier(false, false, false, true),
      },
      {
        id: "model-byok",
        label: "Bring your own API key",
        hint: "OpenAI, Gemini, Claude, DeepSeek, Mistral, Grok, Copilot, Llama",
        values: tier(false, false, false, true),
      },
    ],
  },
  {
    id: "tools",
    label: "Tools included",
    icon: <Wrench className="h-3.5 w-3.5" />,
    rows: [
      { id: "tool-campaigns", label: "Campaigns — bulk page generation wizard", values: tier(true, true, true, true) },

      { id: "tool-keywords", label: "Keyword Groups — reusable keyword + variable bundles", values: tier(true, true, true, true) },
      { id: "tool-locations", label: "Location Database — country / region / city", values: tier(true, true, true, true) },
      { id: "tool-templates", label: "Template Manager — edit, preview, versions", values: tier(true, true, true, true) },
      { id: "tool-marketplace", label: "Template Marketplace", values: tier(true, true, true, true) },
      { id: "tool-import", label: "Template Importer — pull HTML from any URL", values: tier(false, true, true, true) },
      { id: "tool-sitebuilder", label: "AI Site Builder", values: tier(false, false, true, true) },
      { id: "tool-seoaudit", label: "SEO Audit Suite", values: tier(true, true, true, true) },
      { id: "tool-seofix", label: "SEO Optimizer — auto-fix to 80+ score", values: tier(false, true, true, true) },
      { id: "tool-wp", label: "WP Control — WordPress publishing console", values: tier(false, true, true, true) },
      { id: "tool-shopify", label: "Shopify Manager — products & bulk SEO", values: tier(false, false, true, true) },
      { id: "tool-sitemap", label: "Sitemap & IndexNow toolkit", values: tier(false, true, true, true) },
      { id: "tool-calendar", label: "Content Calendar & scheduler", values: tier(false, false, true, true) },
      { id: "tool-translate", label: "Multi-language workspace UI", values: tier(true, true, true, true) },
      { id: "tool-api", label: "API & Webhooks console", values: tier(false, false, true, true) },
      { id: "tool-whitelabel", label: "Whitelabel & agency branding", values: tier(false, false, false, true) },
    ],
  },
  {
    id: "generation",
    label: "Generation engine",
    icon: <Rocket className="h-3.5 w-3.5" />,
    rows: [

      { id: "pages", labelKey: "billing.featurePagesMonth", featureKey: "pagesLimit", hint: "Pages you can generate every billing cycle" },
      { id: "ai", labelKey: "billing.featureAiCreditsMonth", featureKey: "aiLimit", hint: "Credits consumed by AI writing, rewriting and scoring" },
      { id: "campaigns", labelKey: "billing.featureCampaigns", featureKey: "campaigns" },
      { id: "keywordGroups", label: "Keyword groups", values: tier(1, 10, -1, -1) },
      { id: "terms-per-variable", label: "Terms per variable", hint: "How many unique values each variable can spin through", values: tier(3, 10, 25, -1) },
      { id: "batch", label: "Pages per campaign run", values: tier(10, 100, 500, -1) },
      { id: "queue", label: "Parallel generation workers", hint: "How fast large batches complete", values: tier(1, 2, 4, 8) },
      { id: "pairing", label: "Zip & Cross pairing modes", values: tier(true, true, true, true) },
      { id: "preview", label: "Live row preview before generation", values: tier(true, true, true, true) },
      { id: "csv", label: "Bulk CSV import", values: tier(true, true, true, true) },
      { id: "locations", label: "Location database (country / region / city)", values: tier(true, true, true, true) },
      {
        id: "languages",
        label: "Multi-language generation",
        values: tier(true, true, true, true),
        notes: { free: "4 languages", starter: "8 languages", pro: "26 languages", agency: "26 languages" },
      },
      { id: "spintax", label: "Spintax & block spinning", values: tier(false, true, true, true) },
      { id: "diversity", label: "Content diversity repair", hint: "Guarantees every generated page is genuinely unique", values: tier(false, true, true, true) },
      { id: "draft", label: "Draft / review mode before publish", values: tier(true, true, true, true) },
      { id: "regen", label: "Section-level regeneration", hint: "Regenerate only services, FAQ, testimonials or about", values: tier(false, false, true, true) },
      { id: "scheduling", label: "Scheduled & recurring campaigns", values: tier(false, false, true, true) },
    ],
  },
  {
    id: "templates",
    label: "Templates & design",
    icon: <LayoutTemplate className="h-3.5 w-3.5" />,
    rows: [
      { id: "templates", labelKey: "billing.featureTemplates", featureKey: "templates" },
      { id: "marketplace", label: "Marketplace templates", values: tier(true, true, true, true) },
      { id: "html", label: "HTML / CSS / JS editor", values: tier(true, true, true, true) },
      { id: "importUrl", label: "Import template from any URL", values: tier(false, true, true, true) },
      { id: "scan", label: "AI template scanner (auto variable detection)", values: tier(false, true, true, true) },
      { id: "aiBuilder", label: "AI Site Builder", values: tier(false, false, true, true) },
      { id: "aiVariables", label: "AI variable injection", values: tier(false, true, true, true) },
      { id: "assets", label: "Asset inlining (CSS/JS/fonts travel with the page)", values: tier(true, true, true, true) },
      { id: "versions", label: "Template version history", values: tier(false, false, true, true) },
      { id: "brandkit", label: "Brand kit (colors, fonts, logo)", values: tier(false, false, true, true) },
      { id: "whitelabel", label: "Whitelabel branding", values: tier(false, false, false, true) },
    ],
  },
  {
    id: "scores",
    label: "SEO, SEA & GEO optimization",
    icon: <Search className="h-3.5 w-3.5" />,
    rows: [
      {
        id: "seo-score",
        label: "SEO scoring — search engine optimization",
        hint: "Title, meta, headings, density, readability, links, schema",
        values: tier(true, true, true, true),
        notes: { free: "Score only", starter: "Score + auto-fix", pro: "Auto-fix + section rewrite", agency: "Full suite + bulk" },
      },
      {
        id: "sea-score",
        label: "SEA scoring — ad / landing page readiness",
        hint: "Message match, CTA strength, conversion elements",
        values: tier(false, true, true, true),
        notes: { starter: "Score only", pro: "Score + auto-fix", agency: "Auto-fix + bulk" },
      },
      {
        id: "geo-score",
        label: "GEO scoring — AI / generative engine visibility",
        hint: "Answerability, entities, citations, structured facts",
        values: tier(false, false, true, true),
        notes: { pro: "Score + auto-fix", agency: "Auto-fix + bulk" },
      },
      { id: "credit-cost", label: "Optimization credit cost", hint: "Credits deducted per optimization run", values: tier("—", "SEO 2", "SEO 2 / SEA 3", "SEO 2 / SEA 3 / GEO 4") },
      { id: "score-badges", label: "Live SEO / SEA / GEO badges on every page", values: tier(true, true, true, true) },
      { id: "score-target", label: "Guaranteed 80+ multi-pass optimization", values: tier(false, false, true, true) },
      { id: "score-diff", label: "Before / after diff preview", values: tier(false, true, true, true) },
      { id: "score-bulk", label: "Bulk SEO / SEA / GEO optimization across campaigns", values: tier(false, false, false, true) },
    ],
  },
  {
    id: "seo",
    label: "SEO & content quality",
    icon: <Search className="h-3.5 w-3.5" />,
    rows: [
      { id: "audit", label: "SEO audit suite", values: tier(true, true, true, true) },
      { id: "quality", label: "Content quality scoring", values: tier(true, true, true, true) },
      { id: "readability", label: "Readability & keyword density analysis", values: tier(true, true, true, true) },
      { id: "entities", label: "Entity & topic coverage discovery", values: tier(false, true, true, true) },
      { id: "autofix", label: "Auto-fix SEO score (80+ target)", values: tier(false, true, true, true) },
      { id: "section", label: "Section-scoped rewriting", values: tier(false, false, true, true) },
      { id: "duplicate", label: "Duplicate content & slug detection", values: tier(false, true, true, true) },
      { id: "schema", label: "Schema / JSON-LD generation", values: tier(false, true, true, true) },
      { id: "internalLinks", labelKey: "billing.featureInternalLinks", featureKey: "internalLinks" },
      { id: "discovery", labelKey: "billing.featureWebsiteDiscovery", featureKey: "discovery" },
      { id: "indexing", labelKey: "billing.featureGoogleIndexing", featureKey: "indexing" },
      { id: "indexnow", label: "IndexNow ping & robots.txt validation", values: tier(false, true, true, true) },
      { id: "sitemapgen", label: "XML sitemap generation per campaign", values: tier(false, true, true, true) },
    ],
  },

  {
    id: "publishing",
    label: "Publishing & integrations",
    icon: <Globe className="h-3.5 w-3.5" />,
    rows: [
      { id: "websites", labelKey: "billing.featureWebsites", featureKey: "websites" },
      { id: "html-pub", label: "HTML / CSS direct publishing", values: tier(true, true, true, true) },
      { id: "wordpress", labelKey: "billing.featureWordPress", featureKey: "wordpress" },
      { id: "woocommerce", labelKey: "billing.featureWooCommerce", featureKey: "woocommerce" },
      { id: "shopify", labelKey: "billing.featureShopify", featureKey: "shopify" },
      { id: "prestashop", labelKey: "billing.featurePrestaShop", featureKey: "prestashop" },
      { id: "gsc", label: "Google Search Console connection", values: tier(false, true, true, true) },
      { id: "bulk-publish", label: "One-click bulk publishing", values: tier(false, true, true, true) },
      { id: "rollback", label: "Publish logs & rollback", values: tier(false, false, true, true) },
      { id: "calendar", label: "Content calendar & scheduling", values: tier(false, false, true, true) },
      { id: "webhooks", label: "Automation webhooks (HMAC signed)", values: tier(false, false, true, true) },
    ],
  },
  {
    id: "team",
    label: "Team, API & support",
    icon: <Users className="h-3.5 w-3.5" />,
    rows: [
      { id: "workspaces", label: "Workspaces", values: tier(1, 2, 5, -1) },
      { id: "seats", label: "Team seats", values: tier(1, 1, 3, -1) },
      { id: "collab", labelKey: "billing.featureTeamCollaboration", featureKey: "teamCollaboration" },
      { id: "roles", label: "Roles & permissions", values: tier(false, false, true, true) },
      { id: "api", labelKey: "billing.featureApiAccess", featureKey: "apiAccess" },
      { id: "rate", label: "API rate limit", hint: "Requests per minute", values: tier("—", "60/min", "300/min", "1,000/min") },
      { id: "auditLog", label: "Audit log", values: tier(false, false, true, true) },
      { id: "invoices", label: "Automated invoices (PDF + email)", values: tier(false, true, true, true) },
      { id: "trial", label: "Free trial", values: tier("—", "7 days", "7 days", "7 days") },
      { id: "onboarding", label: "Onboarding", values: tier("Self-serve", "Self-serve", "Guided walkthrough", "Dedicated onboarding") },
      {
        id: "support",
        labelKey: "billing.support",
        values: tier("__email__", "__email__", "__priority__", "__dedicated__"),
      },
    ],
  },
];


function formatNumber(val: number, t: T): string {
  if (val === -1) return t("common.unlimited");
  return val.toLocaleString();
}

function resolveText(val: string, t: T): string {
  if (val === "__email__") return t("billing.email");
  if (val === "__priority__") return t("billing.priority");
  if (val === "__dedicated__") return t("billing.dedicated");
  return val;
}

const SUPPORT_DETAILS: Record<string, { title: string; body: string }> = {
  __email__: {
    title: "Email support",
    body: "Answers via email within 1–2 business days: setup help, troubleshooting, and how-to guidance.",
  },
  __priority__: {
    title: "Priority support",
    body: "Faster email responses (within a few hours on business days), priority queue for bug fixes, and help with templates, keywords, and publishing issues.",
  },
  __dedicated__: {
    title: "Dedicated support",
    body: "A named success manager, same-day responses, migration and onboarding assistance, custom template help, and direct escalation to engineers.",
  },
};

export function PricingComparisonTable({
  activePlan,
  currentPlan,
  isYearly,
  loadingPlan,
  onPlanClick,
  onToggleYearly,
  trialEligible,
}: PricingComparisonTableProps) {
  const { t } = useLanguage();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<{ row: FeatureRow; group: string } | null>(null);


  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const toggleRow = (key: string) =>
    setExpandedRows((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));


  const getButtonState = (name: PlanName) => {
    const idx = PLAN_ORDER.indexOf(name);
    if (idx === currentIdx) return { label: t("billing.currentPlanBtn"), disabled: true, variant: "outline" as const };
    if (idx > currentIdx) return { label: t("billing.upgrade"), disabled: false, variant: "default" as const };
    return { label: t("billing.downgrade"), disabled: false, variant: "outline" as const };
  };

  const cellValue = (row: FeatureRow, plan: PlanName): CellValue => {
    if (row.values) return row.values[plan];
    if (row.featureKey) return (PLAN_FEATURES[plan] as unknown as Record<string, CellValue>)[row.featureKey];
    return false;
  };

  const renderCell = (row: FeatureRow, plan: PlanName) => {
    if (row.brands) {
      return (
        <BrandTooltipProvider>
          <ul className="flex list-none flex-wrap items-center justify-end gap-1.5 p-0 md:justify-start md:gap-2">
            {row.brands[plan].map((b) => {
              const Icon = b.icon;
              return (
                <li key={b.id}>
                  <BrandIconTooltip
                    label={`${b.name} — ${b.detail}`}
                    title={b.name}
                    detail={b.detail}
                    className="h-9 w-9 border border-border/60 bg-muted/40 text-foreground/80 hover:border-primary/40 hover:bg-primary/10 md:h-7 md:w-7"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </BrandIconTooltip>
                </li>
              );
            })}
          </ul>
        </BrandTooltipProvider>
      );
    }



    if (row.models) {
      return (
        <BrandTooltipProvider>
          <ul className="flex list-none flex-wrap items-center justify-end gap-1.5 p-0 md:justify-start">
            {row.models[plan].map((m) => (
              <li key={m.short}>
                <BrandIconTooltip
                  label={m.full}
                  title={m.full}
                  className={cn(
                    "h-8 min-w-8 px-2 text-[11px] font-bold tracking-tight md:h-6 md:min-w-6 md:px-1.5 md:text-[10px]",
                    m.tone
                  )}
                >
                  <span aria-hidden="true">{m.short}</span>
                </BrandIconTooltip>
              </li>
            ))}
          </ul>
        </BrandTooltipProvider>
      );

    }



    const val = cellValue(row, plan);
    const note = row.notes?.[plan];


    if (typeof val === "number") {
      return <span className="text-sm font-semibold tabular-nums text-foreground/90">{formatNumber(val, t)}</span>;
    }

    if (typeof val === "string") {
      const supportDetail = row.id === "support" ? SUPPORT_DETAILS[val] : undefined;
      if (supportDetail) {
        return (
          <BrandTooltipProvider>
            <div className="inline-flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground/90">{resolveText(val, t)}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${resolveText(val, t)} support details`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  >
                    <Info className="h-3 w-3" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8} collisionPadding={12} className="max-w-xs px-3 py-2 text-xs leading-relaxed">
                  <p className="font-semibold">{supportDetail.title}</p>
                  <p className="mt-1 text-muted-foreground">{supportDetail.body}</p>
                  <TooltipArrow />
                </TooltipContent>
              </Tooltip>
            </div>
          </BrandTooltipProvider>
        );
      }
      return <span className="text-sm font-medium text-foreground/90">{resolveText(val, t)}</span>;
    }

    if (!val) {
      return (
        <>
          <X className="h-[18px] w-[18px] text-destructive" strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">{t("common.no") === "common.no" ? "Not included" : t("common.no")}</span>
        </>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5">
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-success" aria-hidden="true">
          <Check className="h-3 w-3 text-success-foreground" strokeWidth={3.5} />
        </span>
        <span className="sr-only">{t("common.yes") === "common.yes" ? "Included" : t("common.yes")}</span>
        {note && <span className="text-xs text-muted-foreground whitespace-nowrap">{note}</span>}
      </div>
    );


  };

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          {t("billing.comparePlans")}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">{t("billing.compareDesc")}</p>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Hover any feature for a quick explanation, or click the row for full details and examples.
        </p>
      </div>


      {/* Billing toggle */}
      <div className="flex md:hidden items-center justify-center gap-3">
        <span className={cn("text-sm font-medium transition-colors", !isYearly ? "text-foreground" : "text-muted-foreground")}>
          {t("billing.monthly")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isYearly}
          onClick={onToggleYearly}
          className={cn(
            "relative h-7 w-[52px] rounded-full transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            isYearly ? "bg-primary" : "bg-muted"
          )}
          aria-label={t("billing.yearly")}
        >

          <div
            className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-md transition-transform duration-300",
              isYearly ? "translate-x-[26px]" : "translate-x-0.5"
            )}
          />
        </button>
        <span className={cn("text-sm font-medium transition-colors", isYearly ? "text-foreground" : "text-muted-foreground")}>
          {t("billing.yearly")}
        </span>
        {isYearly && (
          <Badge className="bg-success/10 text-success border-success/20 text-[10px] font-bold animate-fade-in">
            {t("billing.save20")}
          </Badge>
        )}
      </div>


      {/* Mobile: stacked plan cards */}
      <div className="md:hidden space-y-4">
        <p className="text-center text-sm text-muted-foreground">{t("billing.compareDesc")}</p>
        {planMeta.map((meta) => {
          const plan = meta.name;
          const features = PLAN_FEATURES[plan];
          const basePrice = monthlyPrices[plan];
          const price = isYearly && plan !== "free" ? Math.round(basePrice * (1 - YEARLY_DISCOUNT)) : basePrice;
          const isCurrent = plan === currentPlan;
          const isPopular = plan === "pro";
          const btn = getButtonState(plan);
          const isLoading = loadingPlan === plan;

          return (
            <details
              key={plan}
              open={isCurrent || isPopular}
              className={cn(
                "group rounded-2xl border bg-card overflow-hidden shadow-sm",
                isPopular ? "border-primary/40" : "border-border"
              )}
            >
              <summary className="list-none cursor-pointer select-none px-4 py-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0", meta.bgClass, meta.colorClass)}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{features.label}</h3>
                      {isPopular && (
                        <Badge className="bg-primary text-primary-foreground text-[9px] font-bold uppercase px-1.5 py-0">
                          {t("billing.mostPopular")}
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30 bg-primary/5 px-1.5 py-0">
                          {t("billing.current")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t(meta.descriptionKey)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-extrabold tabular-nums">
                      {price === 0 ? t("common.free") : `€${price}`}
                    </span>
                    {price > 0 && <span className="text-[11px] text-muted-foreground">/mo</span>}
                  </div>
                </div>

                <Button
                  className="mt-3 w-full rounded-lg min-h-11 text-sm font-semibold active:scale-[0.98]"
                  variant={btn.variant}
                  disabled={btn.disabled || isLoading}
                  aria-label={`${btn.label} — ${features.label}`}
                  aria-busy={isLoading}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!btn.disabled) onPlanClick(plan);
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : btn.disabled ? (
                    t("billing.currentPlanBtn")
                  ) : (
                    <>
                      {btn.label} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </Button>

                <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <span className="group-open:hidden">{t("billing.comparePlans")}</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
                </div>
              </summary>

              <div className="border-t border-border">
                {featureGroups.map((group) => (
                  <section key={group.id} aria-labelledby={`${plan}-${group.id}-heading`}>
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md text-primary" aria-hidden="true">
                        {group.icon}
                      </span>
                      <h4
                        id={`${plan}-${group.id}-heading`}
                        className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {group.label}
                      </h4>
                    </div>
                    {group.rows.map((row) => {
                      const rowKey = `${plan}-${group.id}-${row.id}`;
                      const isOpen = expandedRows.includes(rowKey);
                      const explanation = row.details || row.hint;
                      const isRich = Boolean(row.brands || row.models);
                      const expandable = Boolean(explanation) || isRich;
                      const rowLabel = row.labelKey ? t(row.labelKey) : row.label;
                      return (
                        <div key={row.id} className="border-b border-border/50">
                          {expandable ? (
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-controls={`${rowKey}-panel`}
                              onClick={() => toggleRow(rowKey)}
                              className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-left outline-none active:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="text-sm font-medium text-foreground">{rowLabel}</span>
                                <Info className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
                              </span>
                              <span className="flex shrink-0 items-center gap-2 text-right">
                                {isRich ? (
                                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                                    {(row.brands?.[plan] ?? row.models?.[plan] ?? []).length}
                                  </span>
                                ) : (
                                  renderCell(row, plan)
                                )}
                                <ChevronDown
                                  aria-hidden="true"
                                  className={cn(
                                    "h-4 w-4 text-muted-foreground transition-transform",
                                    isOpen && "rotate-180"
                                  )}
                                />
                              </span>
                            </button>
                          ) : (
                            <div className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3">
                              <span className="text-sm font-medium text-foreground">{rowLabel}</span>
                              <span className="shrink-0 text-right">{renderCell(row, plan)}</span>
                            </div>
                          )}
                          {expandable && isOpen && (
                            <div
                              id={`${rowKey}-panel`}
                              className="space-y-2 bg-muted/40 px-4 pb-3 pt-2 text-xs leading-relaxed text-muted-foreground"
                            >
                              {isRich && (
                                <div className="pb-1">
                                  <span className="sr-only">{`${rowLabel} included in ${plan} plan`}</span>
                                  {renderCell(row, plan)}
                                </div>
                              )}
                              {explanation && <p>{explanation}</p>}
                              {row.examples && row.examples.length > 0 && (
                                <ul className="list-disc space-y-1 pl-4">
                                  {row.examples.slice(0, 3).map((ex, i) => (
                                    <li key={i}>{ex}</li>
                                  ))}
                                </ul>
                              )}
                              <button
                                type="button"
                                aria-haspopup="dialog"
                                onClick={() => setDetailRow({ row, group: group.label })}
                                className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                              >
                                Full details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}


                  </section>
                ))}
              </div>

            </details>
          );
        })}
      </div>

      {/* Comparison table (tablet & desktop) */}
      <div className="hidden md:block">
        <div className="overflow-x-auto pb-4" tabIndex={0} role="region" aria-label={t("billing.comparePlans")}>

          <table className="w-full min-w-[900px] border-collapse border-spacing-0">
            <caption className="sr-only">{t("billing.compareDesc")}</caption>
            <thead className="sticky top-0 z-20">
              <tr>
                <th scope="col" className="text-left p-0 w-[300px]">
                  <div className="rounded-l-2xl bg-muted/60 px-6 py-5">
                    <span className="text-[15px] font-semibold text-foreground">{t("billing.comparePlans")}</span>
                  </div>
                </th>
                {planMeta.map((meta, mi) => {
                  const plan = meta.name;
                  const features = PLAN_FEATURES[plan];
                  const isCurrent = plan === currentPlan;

                  return (
                    <th
                      key={plan}
                      scope="col"
                      aria-current={isCurrent ? "true" : undefined}
                      className="p-0 w-[180px] text-left"
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 bg-muted/60 px-6 py-5",
                          mi === planMeta.length - 1 && "rounded-r-2xl"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", meta.bgClass, meta.colorClass)}
                        >
                          {meta.icon}
                        </span>
                        <span className="text-[15px] font-semibold text-foreground">{features.label}</span>
                        {isCurrent && (
                          <Badge variant="outline" className="text-[9px] text-primary border-primary/30 bg-primary/5 px-1.5 py-0">
                            {t("billing.current")}
                          </Badge>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {featureGroups
                .flatMap((group) => group.rows.map((row) => ({ row, group: group.label })))
                .map(({ row, group }, i) => {
                  const rowLabel = row.labelKey ? t(row.labelKey) : row.label;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors cursor-pointer",
                        i % 2 === 0 ? "bg-transparent" : "bg-muted/40",
                        hoveredRow === row.id && "bg-muted/70"
                      )}
                      onMouseEnter={() => setHoveredRow(row.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => setDetailRow({ row, group })}
                    >
                      <th scope="row" className="py-5 px-6 rounded-l-2xl align-middle text-left font-normal">
                        <BrandTooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-haspopup="dialog"
                                aria-label={`${rowLabel} — ${group} — ${t("common.details") === "common.details" ? "details" : t("common.details")}`}
                                aria-describedby={row.hint ? `hint-${row.id}` : undefined}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailRow({ row, group });
                                }}
                                onFocus={() => setHoveredRow(row.id)}
                                onBlur={() => setHoveredRow(null)}
                                className="inline-flex items-center gap-1.5 rounded-md text-left text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              >
                                {rowLabel}
                                <Info
                                  aria-hidden="true"
                                  className={cn(
                                    "h-3.5 w-3.5 shrink-0 transition-opacity",
                                    hoveredRow === row.id ? "opacity-70 text-primary" : "opacity-40"
                                  )}
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8} collisionPadding={12} className="max-w-xs overflow-visible px-3 py-2 text-xs leading-relaxed">
                              <p id={`hint-${row.id}`}>{row.hint || row.details || rowLabel}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
                                Click for full details
                              </p>
                              <TooltipArrow />
                            </TooltipContent>
                          </Tooltip>
                        </BrandTooltipProvider>
                      </th>


                      {planMeta.map((meta, mi) => (
                        <td
                          key={meta.name}
                          className={cn(
                            "py-5 px-6 text-left align-middle",
                            mi === planMeta.length - 1 && "rounded-r-2xl"
                          )}
                        >
                          {renderCell(row, meta.name)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
            </tbody>



            {/* CTA footer */}
            <tbody>
              <tr>
                <th scope="row" className="py-6 px-5 text-left font-normal">
                  <span className="sr-only">{t("billing.comparePlans")}</span>
                </th>
                {planMeta.map((meta) => {
                  const btn = getButtonState(meta.name);
                  const isLoading = loadingPlan === meta.name;
                  return (
                    <td key={meta.name} className="py-6 px-5 align-top">
                      <Button
                        className="w-full rounded-lg h-10 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                        variant={btn.variant}
                        disabled={btn.disabled || isLoading}
                        aria-label={`${btn.label} — ${PLAN_FEATURES[meta.name].label}`}
                        aria-busy={isLoading}
                        onClick={() => !btn.disabled && onPlanClick(meta.name)}
                      >

                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : btn.disabled ? (
                          t("billing.currentPlanBtn")
                        ) : (
                          <>
                            {btn.label} <ArrowRight className="ml-1.5 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>


      {/* Row detail modal */}
      <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailRow && (
            <>
              <DialogHeader>
                <Badge variant="outline" className="w-fit mb-1 text-[10px] uppercase tracking-wide">
                  {detailRow.group}
                </Badge>
                <DialogTitle className="text-xl">
                  {detailRow.row.labelKey ? t(detailRow.row.labelKey) : detailRow.row.label}
                </DialogTitle>
                {(detailRow.row.details || detailRow.row.hint) && (
                  <DialogDescription className="text-sm leading-relaxed">
                    {detailRow.row.details || detailRow.row.hint}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("billing.comparePlans")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {planMeta.map((meta) => (
                    <div
                      key={meta.name}
                      className={cn(
                        "rounded-xl border p-3 flex flex-col gap-2",
                        meta.name === currentPlan ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"
                      )}
                    >
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold capitalize", meta.colorClass)}>
                        {meta.icon}
                        {meta.name}
                      </span>
                      <div>{renderCell(detailRow.row, meta.name)}</div>
                      <p className="text-[11px] leading-snug text-muted-foreground">
                        {t(meta.descriptionKey)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {detailRow.row.examples && detailRow.row.examples.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Examples
                  </p>
                  <ul className="space-y-1.5">
                    {detailRow.row.examples.map((ex, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-foreground/85">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detailRow.row.brands && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Providers by plan
                  </p>
                  <div className="space-y-3">
                    {planMeta.map((meta) => (
                      <div key={meta.name} className="space-y-1.5 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0">
                        <span className="block font-semibold capitalize text-muted-foreground sm:w-16 sm:shrink-0">{meta.name}</span>
                        <ul className="flex list-none flex-wrap gap-1.5 p-0 sm:gap-2">
                          {detailRow.row.brands![meta.name].map((b) => {
                            const Icon = b.icon;
                            return (
                              <li key={b.id}>
                                <BrandTooltipProvider>
                                  <BrandIconTooltip
                                    label={`${b.name} — ${b.detail}`}
                                    title={b.name}
                                    detail={b.detail}
                                    className="min-h-9 gap-1.5 border border-border bg-muted/40 px-2.5 py-1 text-xs hover:border-primary/40 hover:bg-primary/10"
                                  >
                                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    <span>{b.name}</span>
                                  </BrandIconTooltip>
                                </BrandTooltipProvider>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>

                </div>
              )}



              {detailRow.row.models && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Models by plan
                  </p>
                  <div className="space-y-2">
                    {planMeta.map((meta) => (
                      <div key={meta.name} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="w-16 shrink-0 font-semibold capitalize text-muted-foreground">{meta.name}</span>
                        {detailRow.row.models![meta.name].map((m) => (
                          <span key={m.short} className="rounded-md border border-border bg-muted/40 px-2 py-1">
                            {m.full}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
}
