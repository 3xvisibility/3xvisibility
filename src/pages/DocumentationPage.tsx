import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Globe, Rocket, Layers, FileText, Store, Database,
  KeyRound, Zap, Columns3, BarChart3, Activity, FlaskConical, CalendarDays,
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
    short: "Workspace এর সব activity, recent campaigns, quick stats এক জায়গায় দেখুন।",
    steps: [
      "Login করার পর প্রথমেই Dashboard এ আসবেন।",
      "Top cards এ আপনার total campaigns, generated pages, websites এর count দেখা যাবে।",
      "Recent campaigns থেকে এক click এ যেকোনো campaign এ ঢুকতে পারবেন।",
      "Quick action buttons দিয়ে নতুন campaign বা template বানাতে পারবেন।",
    ],
    tips: ["প্রথম দিন এ এখান থেকেই 'Connect Website' দিয়ে শুরু করুন।"],
  },
  {
    id: "websites", icon: Globe, group: "Core", name: "Websites",
    short: "WordPress, WooCommerce, Shopify, PrestaShop সাইট connect করুন।",
    steps: [
      "'+ Add Website' button এ click করুন।",
      "Platform select করুন (WordPress / Shopify / WooCommerce / PrestaShop)।",
      "Site URL এবং credentials (App Password / API key) দিন।",
      "'Test Connection' দিয়ে verify করুন — green tick এলে save করুন।",
      "Connected site থেকে content automatically pull হবে।",
    ],
    tips: [
      "WordPress এর জন্য Application Password ব্যবহার করুন (regular password নয়)।",
      "SSL error এলে site URL এ www আছে কিনা check করুন।",
    ],
  },
  {
    id: "campaigns", icon: Rocket, group: "Core", name: "Campaigns",
    short: "Bulk page generation এর জন্য campaign তৈরি ও manage করুন।",
    steps: [
      "'Create Campaign' click করুন।",
      "Wizard step-by-step গাইড করবে: name → template → data → mapping → publish।",
      "Template select করুন (নিজের, AI-generated, বা Marketplace থেকে)।",
      "CSV upload বা AI দিয়ে rows generate করুন।",
      "Variable mapping check করুন (auto-suggest থাকবে)।",
      "Publish mode (Draft/Live) ও target website বেছে 'Generate' করুন।",
    ],
    tips: [
      "Marketplace template select করলে duplicate import হয় না — পুরোনো snapshot reuse হবে।",
      "AI Campaign Assistant দিয়ে name, mapping, readiness check করুন।",
    ],
  },
  {
    id: "pages", icon: Layers, group: "Core", name: "Generated Pages",
    short: "Generate হওয়া সব page এক জায়গায় — search, filter, bulk actions।",
    steps: [
      "Sidebar থেকে 'Pages' এ যান।",
      "Filter দিয়ে campaign / status / website অনুযায়ী খুঁজুন।",
      "Page এর row এ click করে preview, edit, বা CMS এ open করুন।",
      "Bulk select করে republish, delete, বা export করতে পারবেন।",
      "Duplicate detector চালিয়ে similar content খুঁজে বের করুন।",
    ],
  },
  {
    id: "templates", icon: FileText, group: "Core", name: "Templates",
    short: "নিজের template বানান, AI দিয়ে generate করুন, বা scan করুন।",
    steps: [
      "'New Template' এ ৪টা option পাবেন: Manual, AI Generate, Scan from URL, Import।",
      "AI Generate দিলে business + niche + service লিখলেই design সহ template তৈরি হবে।",
      "Scan দিলে যেকোনো live page থেকে design + variables auto-extract হবে।",
      "Variables লিখুন `{variable_name}` format এ — lowercase_snake_case।",
      "Live preview এ instantly result দেখুন।",
    ],
    tips: ["Variables এর জন্য CSV starter download করুন — ready-made columns পাবেন।"],
  },
  {
    id: "marketplace", icon: Store, group: "Core", name: "Template Marketplace",
    short: "Community templates browse করুন, এক click এ import করুন।",
    steps: [
      "Category (WordPress / Shopify / Personal Portfolio ইত্যাদি) filter করুন।",
      "Card এ hover দিলে preview ও plan badge দেখা যাবে।",
      "'Use Template' click করলে progress দেখাবে: download → adapt → save।",
      "Already imported থাকলে existing copy reuse হবে — duplicate তৈরি হবে না।",
      "Version pinning থাকায় marketplace update হলেও আপনার copy unchanged থাকবে।",
    ],
  },
  {
    id: "data", icon: Database, group: "Core", name: "Data CSV",
    short: "Variables এর জন্য CSV data manage ও AI-fill করুন।",
    steps: [
      "CSV upload বা scratch থেকে rows বানান।",
      "Empty cells এ AI দিয়ে auto-fill করুন।",
      "Multi-value columns এ pipe (|) দিয়ে variations দিন।",
      "Save করে campaign এ সরাসরি use করুন।",
    ],
  },
  {
    id: "pgp-keywords", icon: KeyRound, group: "PGP Suite", name: "Keywords",
    short: "Programmatic SEO এর জন্য keyword set manage করুন।",
    steps: [
      "Keywords manually add করুন বা CSV import করুন।",
      "Source URL দিয়ে auto-extract করুন।",
      "Keywords কে content groups এ assign করুন।",
    ],
  },
  {
    id: "pgp-content", icon: Layers, group: "PGP Suite", name: "Content Groups",
    short: "Related keywords একসাথে গুছিয়ে content cluster বানান।",
    steps: [
      "Group তৈরি করুন (যেমন: 'Plumbing Services')।",
      "সেই group এ relevant keywords add করুন।",
      "Group থেকে directly bulk pages generate করতে পারবেন।",
    ],
  },
  {
    id: "pgp-generate", icon: Zap, group: "PGP Suite", name: "PGP Generate",
    short: "Keyword combinations থেকে বিপুল pages তৈরি করুন।",
    steps: [
      "Content group + template select করুন।",
      "Generation method (all combos / sequential / random) বেছে নিন।",
      "Batch size set করে 'Start' করুন — live progress দেখাবে।",
    ],
  },
  {
    id: "pgp-terms", icon: Database, group: "PGP Suite", name: "Terms",
    short: "Variable terms (city, service, niche ইত্যাদি) এর master library।",
    steps: ["Term type create করুন।", "Values add করুন।", "Template এ ব্যবহার হলে auto-suggest পাবেন।"],
  },
  {
    id: "pgp-logs", icon: FileText, group: "PGP Suite", name: "Logs",
    short: "Generation history, success/failure rate, error details।",
    steps: ["Recent jobs এর list দেখুন।", "Failed rows এ click করে exact error দেখুন।", "Retry বা export logs করতে পারবেন।"],
  },
  {
    id: "website-content", icon: Layers, group: "Discovery", name: "Website Content",
    short: "Connected site এর সব pages/products discover, scan ও SEO optimize করুন।",
    steps: [
      "Site select করুন।",
      "'Scan' দিলে existing content + design auto-extract হবে।",
      "Pages থেকে directly SEO optimize, retranslate, বা rewrite করতে পারবেন।",
      "AI দিয়ে missing meta tags পূর্ণ করুন।",
    ],
    tips: ["এটাই আগের 'Scanner' + 'Discovery' — দুটোই এখানে merged।"],
  },
  {
    id: "template-mapping", icon: Columns3, group: "Discovery", name: "Variable Mapping",
    short: "Template variables কে CSV columns বা CMS fields এর সাথে map করুন।",
    steps: [
      "Template + data source select করুন।",
      "Auto-mapping suggestion accept করুন বা manually adjust করুন।",
      "Confidence indicator (high/medium/low) দেখে decide করুন।",
    ],
  },
  {
    id: "analytics", icon: BarChart3, group: "Analytics", name: "Analytics",
    short: "Pages, traffic, conversion এর overview।",
    steps: ["Date range select করুন।", "Top performing pages দেখুন।", "CSV export নিতে পারবেন।"],
  },
  {
    id: "performance", icon: Activity, group: "Analytics", name: "Page Performance",
    short: "Per-page SEO score, load time, core web vitals।",
    steps: ["Page select করুন।", "Score breakdown ও improvement tips দেখুন।", "এক click এ AI fix চালান।"],
  },
  {
    id: "ab-testing", icon: FlaskConical, group: "Analytics", name: "A/B Testing",
    short: "Two variants এর pages compare করুন।",
    steps: ["Variant A + B তৈরি করুন।", "Traffic split set করুন।", "Winner auto-promote হবে।"],
  },
  {
    id: "content-calendar", icon: CalendarDays, group: "Analytics", name: "Content Calendar",
    short: "Future publishes schedule ও plan করুন।",
    steps: ["Date select করুন।", "Page/campaign drag করে date এ rakhun।", "Auto-publish হবে scheduled time এ।"],
  },
  {
    id: "seo-audit", icon: ClipboardCheck, group: "Analytics", name: "SEO Audit",
    short: "Site-wide SEO health check — duplicate content, missing meta, broken links।",
    steps: ["Site select করুন।", "'Run Audit' দিন।", "Issues priority অনুযায়ী fix করুন।"],
  },
  {
    id: "indexing", icon: Search, group: "Analytics", name: "Google Indexing",
    short: "Generate করা pages directly Google এ submit করুন।",
    steps: ["Google Search Console connect করুন।", "Pages select করে 'Submit for indexing' দিন।"],
  },
  {
    id: "affiliate", icon: Gift, group: "Account", name: "Affiliate",
    short: "Referral link share করে commission earn করুন।",
    steps: ["আপনার unique link copy করুন।", "Friends/clients কে share করুন।", "Earnings dashboard এ track করুন।"],
  },
  {
    id: "billing", icon: CreditCard, group: "Account", name: "Billing",
    short: "Plan upgrade, invoice, payment method।",
    steps: ["Current plan দেখুন।", "Upgrade/downgrade করুন।", "Stripe portal দিয়ে invoices download করুন।"],
  },
  {
    id: "settings", icon: Settings, group: "Account", name: "Settings",
    short: "Profile, language, theme, notifications।",
    steps: ["Profile info update করুন।", "Language switch করুন (29 languages)।", "Notification preferences set করুন।"],
  },
  {
    id: "workspace-settings", icon: Users, group: "Account", name: "Workspace Settings",
    short: "Team members invite ও role manage করুন (Pro/Agency only)।",
    steps: ["'Invite Member' এ click করুন।", "Email + role (admin/editor/viewer) set করুন।", "Audit log এ সব activity দেখুন।"],
  },
];

const GROUPS = ["Core", "PGP Suite", "Discovery", "Analytics", "Account"] as const;
const QUICK_FLOW = [
  { step: 1, title: "Website connect করুন", desc: "Sidebar → Websites → Add → credentials দিন।" },
  { step: 2, title: "Template বানান বা import করুন", desc: "Templates / Marketplace থেকে ready design নিন।" },
  { step: 3, title: "Data দিন", desc: "CSV upload করুন বা AI দিয়ে rows generate করুন।" },
  { step: 4, title: "Campaign চালান", desc: "Variables map করে 'Generate' এ click — pages site এ চলে যাবে।" },
];

export default function DocumentationPage() {
  const [active, setActive] = useState<string>("getting-started");

  useEffect(() => {
    document.title = "Documentation — PageGen";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", "Complete guide to PageGen tools — শিখুন কিভাবে campaigns, templates, websites, AI features ব্যবহার করবেন।");
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
            Tools এর সম্পূর্ণ ব্যবহার গাইড
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            প্রতিটা tool কীভাবে use করবেন — step-by-step Bengali + English এ।
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
                <Rocket className="h-6 w-6 text-primary" /> Getting Started — ৪ ধাপে শুরু
              </h2>
              <p className="text-muted-foreground mb-6">
                নতুন user হলে এই sequence এ এগোন — ১০ মিনিটে আপনার first batch pages live হয়ে যাবে।
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
                            কীভাবে ব্যবহার করবেন
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
                  { q: "AI credits কিভাবে save হয়?", a: "আমরা সব light tasks এ Gemini Flash Lite (সবচেয়ে cheap model) ব্যবহার করি। Images এর জন্য Unsplash, translations এ LibreTranslate fallback আছে।" },
                  { q: "Marketplace template update হলে আমার pages কি বদলাবে?", a: "না। Version pinning এর কারণে আপনার copy snapshot হিসেবে save হয় — marketplace update affect করে না।" },
                  { q: "WordPress connect এ SSL error আসছে?", a: "Site URL এ www আছে কিনা দেখুন। SNI mismatch হলে hosting provider এর সাথে check করুন।" },
                  { q: "Plan upgrade কোথায়?", a: "Sidebar → Billing → Upgrade plan। Pro/Agency এ extra templates, credits, team features পাবেন।" },
                  { q: "Bulk delete হলে undo যায়?", a: "না — bulk delete permanent। তাই confirm dialog এ মন দিয়ে check করুন।" },
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
              <h2 className="text-xl font-bold mb-2">এখনো প্রশ্ন আছে?</h2>
              <p className="text-sm text-muted-foreground mb-4">App এ ঢুকে directly try করুন — প্রতিটা page এ contextual help থাকবে।</p>
              <Button asChild>
                <Link to="/dashboard">App এ যান <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </section>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
