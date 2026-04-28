import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Globe, Rocket, Layers, FileText, Store, Database,
  KeyRound, Zap, Columns3, BarChart3, Activity, CalendarDays,
  ClipboardCheck, Search, Gift, CreditCard, Settings, Users,
  ArrowRight, BookOpen, CheckCircle2, Lightbulb, AlertCircle,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ToolDoc {
  id: string;
  icon: React.ElementType;
  name: string;
  group: string;
  short: string;
  steps: string[];
  tips?: string[];
}

const TOOLS: ToolDoc[] = [
  {
    id: "dashboard", icon: LayoutDashboard, group: "Core", name: "Dashboard",
    short: "All workspace activity, recent campaigns and quick stats in one place.",
    steps: [
      "After login you land on the Dashboard by default.",
      "Top cards show total campaigns, generated pages and connected websites.",
      "Click any recent campaign card to jump straight into its detail view.",
      "Quick action buttons let you create a new campaign or template.",
    ],
    tips: ["On day one, start with 'Connect Website' from here."],
  },
  {
    id: "websites", icon: Globe, group: "Core", name: "Websites",
    short: "Connect WordPress, WooCommerce, Shopify and PrestaShop sites.",
    steps: [
      "Click the '+ Add Website' button.",
      "Pick your platform (WordPress / Shopify / WooCommerce / PrestaShop).",
      "Enter the site URL and credentials (App Password / API key).",
      "Hit 'Test Connection' — a green tick means you can save.",
      "Content from the connected site will be pulled in automatically.",
    ],
    tips: [
      "For WordPress, always use an Application Password — never the regular password.",
      "If you see an SSL error, check whether the URL needs www or not.",
    ],
  },
  {
    id: "campaigns", icon: Rocket, group: "Core", name: "Campaigns",
    short: "Create and manage campaigns for bulk page generation.",
    steps: [
      "Click 'Create Campaign'.",
      "The wizard walks you step-by-step: name → template → data → mapping → publish.",
      "Pick a template (your own, AI-generated, or from the Marketplace).",
      "Upload a CSV or generate rows with AI.",
      "Review variable mapping (auto-suggestions are provided).",
      "Choose publish mode (Draft/Live), pick the target website and click 'Generate'.",
    ],
    tips: [
      "Re-selecting a marketplace template never duplicates — it reuses the existing snapshot.",
      "Use the AI Campaign Assistant for naming, mapping and readiness checks.",
    ],
  },
  {
    id: "pages", icon: Layers, group: "Core", name: "Generated Pages",
    short: "Every generated page in one place — search, filter and bulk actions.",
    steps: [
      "Open 'Pages' from the sidebar.",
      "Filter by campaign, status or website.",
      "Click a row to preview, edit or open it on the live CMS.",
      "Bulk select rows to republish, delete or export.",
      "Run the duplicate detector to surface near-identical content.",
    ],
  },
  {
    id: "templates", icon: FileText, group: "Core", name: "Templates",
    short: "Build your own templates, generate them with AI, or scan from a URL.",
    steps: [
      "'New Template' offers 4 options: Manual, AI Generate, Scan from URL, Import.",
      "AI Generate only needs business + niche + service — design and structure are auto-built.",
      "Scan extracts design and variables from any live page.",
      "Write variables in `{variable_name}` format using lowercase_snake_case.",
      "See results instantly in the live preview.",
    ],
    tips: ["Download the CSV starter for any template — it comes pre-filled with the right columns."],
  },
  {
    id: "marketplace", icon: Store, group: "Core", name: "Template Marketplace",
    short: "Browse community templates and import them with one click.",
    steps: [
      "Filter by category (WordPress / Shopify / Personal Portfolio etc.).",
      "Hover any card to see the preview and plan badge.",
      "Click 'Use Template' — progress shows download → adapt → save.",
      "If you have already imported it, the existing copy is reused (no duplicates).",
      "Version pinning keeps your copy stable even if the marketplace template updates.",
    ],
  },
  {
    id: "data", icon: Database, group: "Core", name: "Data CSV",
    short: "Manage CSV data for variables and use AI to fill the gaps.",
    steps: [
      "Upload a CSV or build rows from scratch.",
      "Use AI to auto-fill empty cells.",
      "Add multi-value cells using a pipe (|) for variations.",
      "Save and use the dataset directly in any campaign.",
    ],
  },
  {
    id: "pgp-keywords", icon: KeyRound, group: "PGP Suite", name: "Keywords",
    short: "Manage keyword sets for programmatic SEO.",
    steps: [
      "Add keywords manually or import a CSV.",
      "Auto-extract keywords from a source URL.",
      "Assign keywords to content groups.",
    ],
  },
  {
    id: "pgp-content", icon: Layers, group: "PGP Suite", name: "Content Groups",
    short: "Cluster related keywords into content groups.",
    steps: [
      "Create a group (for example: 'Plumbing Services').",
      "Add relevant keywords into the group.",
      "Generate bulk pages directly from the group.",
    ],
  },
  {
    id: "pgp-generate", icon: Zap, group: "PGP Suite", name: "PGP Generate",
    short: "Spin up massive page sets from keyword combinations.",
    steps: [
      "Pick a content group and a template.",
      "Choose a generation method (all combos / sequential / random).",
      "Set the batch size and click 'Start' — live progress is shown.",
    ],
  },
  {
    id: "pgp-terms", icon: Database, group: "PGP Suite", name: "Terms",
    short: "A master library of variable terms (city, service, niche, etc.).",
    steps: ["Create a term type.", "Add values to it.", "Get auto-suggestions whenever the term is used in templates."],
  },
  {
    id: "pgp-logs", icon: FileText, group: "PGP Suite", name: "Logs",
    short: "Generation history with success/failure rate and error details.",
    steps: ["Browse the list of recent jobs.", "Click any failed row to see the exact error.", "Retry failed rows or export the logs."],
  },
  {
    id: "website-content", icon: Layers, group: "Discovery", name: "Website Content",
    short: "Discover, scan and SEO-optimize all pages and products on a connected site.",
    steps: [
      "Select the website.",
      "Click 'Scan' — existing content and design are extracted automatically.",
      "From any page row you can SEO-optimize, retranslate or rewrite content.",
      "Use AI to fill in missing meta tags.",
    ],
    tips: ["This replaces the old 'Scanner' and 'Discovery' tools — both are merged here."],
  },
  {
    id: "template-mapping", icon: Columns3, group: "Discovery", name: "Variable Mapping",
    short: "Map template variables to CSV columns or CMS fields.",
    steps: [
      "Pick a template and a data source.",
      "Accept the auto-mapping suggestion or adjust manually.",
      "Use the confidence indicator (high/medium/low) to make decisions.",
    ],
  },
  {
    id: "analytics", icon: BarChart3, group: "Analytics", name: "Analytics",
    short: "Overview of pages, traffic and conversions.",
    steps: ["Pick a date range.", "Review your top performing pages.", "Export to CSV when you need raw data."],
  },
  {
    id: "performance", icon: Activity, group: "Analytics", name: "Page Performance",
    short: "Per-page SEO score, load time and core web vitals.",
    steps: ["Select a page.", "Read the score breakdown and improvement tips.", "Run an AI fix in one click."],
  },
  {
    id: "content-calendar", icon: CalendarDays, group: "Analytics", name: "Content Calendar",
    short: "Schedule and plan future publishes.",
    steps: ["Pick a date.", "Drag a page or campaign onto the date.", "It auto-publishes at the scheduled time."],
  },
  {
    id: "seo-audit", icon: ClipboardCheck, group: "Analytics", name: "SEO Audit",
    short: "Site-wide SEO health check — duplicate content, missing meta, broken links.",
    steps: ["Pick a site.", "Click 'Run Audit'.", "Fix issues in priority order."],
  },
  {
    id: "indexing", icon: Search, group: "Analytics", name: "Google Indexing",
    short: "Submit generated pages directly to Google.",
    steps: ["Connect Google Search Console.", "Select pages and click 'Submit for indexing'."],
  },
  {
    id: "affiliate", icon: Gift, group: "Account", name: "Affiliate",
    short: "Share your referral link and earn commission.",
    steps: ["Copy your unique link.", "Share it with friends or clients.", "Track earnings on the dashboard."],
  },
  {
    id: "billing", icon: CreditCard, group: "Account", name: "Billing",
    short: "Plan upgrades, invoices and payment methods.",
    steps: ["Review your current plan.", "Upgrade or downgrade.", "Use the Stripe portal to download invoices."],
  },
  {
    id: "settings", icon: Settings, group: "Account", name: "Settings",
    short: "Profile, language, theme and notifications.",
    steps: ["Update profile info.", "Switch language (29 supported).", "Set notification preferences."],
  },
  {
    id: "workspace-settings", icon: Users, group: "Account", name: "Workspace Settings",
    short: "Invite team members and manage roles (Pro/Agency only).",
    steps: ["Click 'Invite Member'.", "Set the email and role (admin/editor/viewer).", "Review every action in the audit log."],
  },
];

const GROUPS = ["Core", "PGP Suite", "Discovery", "Analytics", "Account"] as const;
const QUICK_FLOW = [
  { step: 1, title: "Connect a website", desc: "Sidebar → Websites → Add → enter credentials." },
  { step: 2, title: "Build or import a template", desc: "Pick a ready design from Templates or the Marketplace." },
  { step: 3, title: "Add data", desc: "Upload a CSV or generate rows with AI." },
  { step: 4, title: "Run the campaign", desc: "Map variables and click 'Generate' — pages go straight to your site." },
];

export default function DocumentationPage() {
  const [active, setActive] = useState<string>("getting-started");

  useEffect(() => {
    document.title = "Documentation — PageGen";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", "Complete guide to PageGen tools — learn how to use campaigns, templates, websites and AI features.");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />

      <main className="container mx-auto px-4 lg:px-8 pt-28 pb-16">
        {/* Hero */}
        <header className="max-w-3xl mx-auto text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <BookOpen className="h-3 w-3 mr-1" /> Documentation
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Complete guide to every tool
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Step-by-step instructions for every feature in your workspace.
          </p>
        </header>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar TOC */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="space-y-1 text-sm">
              <a href="#getting-started" onClick={() => setActive("getting-started")}
                className={`block px-3 py-2 rounded-md transition-colors ${active === "getting-started" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                🚀 Getting Started
              </a>
              {GROUPS.map((g) => (
                <a key={g} href={`#group-${g.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => setActive(g)}
                  className={`block px-3 py-2 rounded-md transition-colors ${active === g ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                  {g}
                </a>
              ))}
              <a href="#faq" onClick={() => setActive("faq")}
                className={`block px-3 py-2 rounded-md transition-colors ${active === "faq" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                ❓ FAQ
              </a>
            </nav>
          </aside>

          {/* Content */}
          <div className="space-y-12 min-w-0">
            {/* Getting Started */}
            <section id="getting-started" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Rocket className="h-6 w-6 text-primary" /> Getting Started — 4 quick steps
              </h2>
              <p className="text-muted-foreground mb-6">
                New here? Follow this sequence and your first batch of pages will be live in about 10 minutes.
              </p>
              <ol className="space-y-3">
                {QUICK_FLOW.map((s) => (
                  <li key={s.step} className="flex gap-4 p-4 rounded-lg border border-border bg-card">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {s.step}
                    </div>
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{s.desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Tool groups */}
            {GROUPS.map((group) => (
              <section key={group} id={`group-${group.replace(/\s+/g, "-").toLowerCase()}`} className="scroll-mt-24">
                <h2 className="text-2xl font-bold mb-6 border-b border-border pb-2">{group}</h2>
                <div className="space-y-6">
                  {TOOLS.filter((t) => t.group === group).map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <article key={tool.id} id={tool.id} className="scroll-mt-24 rounded-xl border border-border bg-card p-5 md:p-6">
                        <header className="flex items-start gap-3 mb-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg">{tool.name}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">{tool.short}</p>
                          </div>
                        </header>

                        <div className="ml-0 md:ml-13">
                          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 mt-4">
                            How to use it
                          </h4>
                          <ol className="space-y-1.5">
                            {tool.steps.map((s, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ol>

                          {tool.tips && tool.tips.length > 0 && (
                            <div className="mt-4 rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                                <Lightbulb className="h-3.5 w-3.5" /> Tips
                              </div>
                              <ul className="space-y-1 text-xs text-muted-foreground">
                                {tool.tips.map((tip, i) => <li key={i}>• {tip}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* FAQ */}
            <section id="faq" className="scroll-mt-24">
              <h2 className="text-2xl font-bold mb-6 border-b border-border pb-2 flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-primary" /> FAQ
              </h2>
              <div className="space-y-4">
                {[
                  { q: "How are AI credits kept low?", a: "Light tasks always use Gemini Flash Lite (the cheapest model). Images fall back to Unsplash and translations to LibreTranslate whenever possible." },
                  { q: "If a marketplace template is updated, do my pages change?", a: "No. Version pinning saves your copy as a snapshot — marketplace updates do not affect it." },
                  { q: "Getting an SSL error when connecting WordPress?", a: "Check whether the site URL needs the www prefix. If it is an SNI mismatch, contact your hosting provider." },
                  { q: "Where do I upgrade my plan?", a: "Sidebar → Billing → Upgrade plan. Pro/Agency unlock more templates, credits and team features." },
                  { q: "Can a bulk delete be undone?", a: "No — bulk delete is permanent. Always read the confirmation dialog carefully." },
                ].map((f, i) => (
                  <details key={i} className="rounded-lg border border-border bg-card p-4 group">
                    <summary className="font-medium cursor-pointer list-none flex items-center justify-between">
                      <span>{f.q}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-6 md:p-8 text-center">
              <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
              <p className="text-sm text-muted-foreground mb-4">Open the app and try it directly — every page has contextual help built in.</p>
              <Button asChild>
                <Link to="/dashboard">Go to the app <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </section>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
