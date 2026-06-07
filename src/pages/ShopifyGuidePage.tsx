import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight, Store, CheckCircle2, Plug, ShieldCheck,
  AlertTriangle, Rocket, ListChecks, Link2, MousePointerClick,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PREREQS = [
  "An active Shopify store (any paid plan or trial).",
  "Admin / owner access to that store.",
  "A Pro plan on 3XVISIBILITY (Shopify is a Pro feature).",
];

const STEPS = [
  {
    icon: Store,
    title: "Find your store domain",
    desc: "Shopify connects through a secure OAuth flow — you only need your store's .myshopify.com domain.",
    bullets: [
      "Log in to your Shopify admin.",
      "Go to Settings → Domains.",
      "Note your permanent domain — it looks like my-store.myshopify.com.",
    ],
  },
  {
    icon: Plug,
    title: "Open the Websites page in 3XVISIBILITY",
    desc: "All your connected stores and sites are managed here.",
    bullets: [
      "From the sidebar, click Websites.",
      "Click Connect Website in the top-right.",
      "Select Shopify from the platform dropdown.",
    ],
  },
  {
    icon: Link2,
    title: "Enter your store domain",
    desc: "We use this to start the secure authorization with Shopify.",
    bullets: [
      "Store name: anything you like (e.g. “My Shop”).",
      "Store domain: paste your full my-store.myshopify.com address.",
      "Pick the store's primary language.",
    ],
  },
  {
    icon: MousePointerClick,
    title: "Authorize via Shopify OAuth",
    desc: "No API keys to copy — Shopify handles permissions for you.",
    bullets: [
      "Click Connect — you'll be redirected to Shopify.",
      "Review the requested permissions and click Install app / Authorize.",
      "You'll be sent back to 3XVISIBILITY automatically once approved.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Confirm the connection",
    desc: "Verify everything is linked before you start.",
    bullets: [
      "A green “Connected” badge appears on the store card.",
      "Your product count and store details load automatically.",
      "If it ever expires, click Reconnect to re-authorize.",
    ],
  },
  {
    icon: Rocket,
    title: "Publish products & pages",
    desc: "Your Shopify store is now a publishing and SEO target.",
    bullets: [
      "Generate landing pages and push them to Shopify.",
      "Bulk-optimize product SEO (titles, meta descriptions) from the app.",
      "Re-run campaigns anytime to scale your catalog content.",
    ],
  },
];

const TROUBLESHOOT = [
  {
    q: "Shopify option is locked / 🔒 Pro",
    a: "Shopify is available on the Pro plan. Upgrade under Sidebar → Billing → Upgrade plan to unlock it.",
  },
  {
    q: "“Shopify OAuth is not configured”",
    a: "This means the integration wasn't fully set up for your workspace. Refresh and try again, or contact support if it persists.",
  },
  {
    q: "“Domain must end with .myshopify.com”",
    a: "Use your permanent store domain (my-store.myshopify.com), not your custom domain like www.mystore.com.",
  },
  {
    q: "Connection shows as expired",
    a: "Access tokens can expire or be revoked. Open the store card and click Reconnect to re-authorize via Shopify.",
  },
];

export default function ShopifyGuidePage() {
  useEffect(() => {
    document.title = "Connect Shopify — 3XVISIBILITY";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", "Step-by-step guide to connect your Shopify store to 3XVISIBILITY via OAuth and publish pages and product SEO at scale.");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" data-auto-translate>
      <Seo
        title="Connect Shopify"
        description="A step-by-step guide to connecting your Shopify store to 3XVISIBILITY through secure OAuth, then publishing pages and optimizing product SEO."
        path="/guides/shopify"
      />
      <LandingNav />

      <main className="container mx-auto px-4 lg:px-8 pt-28 pb-16">
        {/* Hero */}
        <header className="max-w-3xl mx-auto text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Store className="h-3 w-3 mr-1" /> Shopify Integration
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Connect your Shopify store
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Authorize Shopify securely with one click — no API keys to copy — and publish pages and product SEO straight from 3XVISIBILITY.
          </p>
        </header>

        {/* Prerequisites */}
        <section className="max-w-4xl mx-auto mb-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" /> Before you start
            </h2>
            <ul className="grid sm:grid-cols-3 gap-3">
              {PREREQS.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Steps */}
        <section className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">Step-by-step setup</h2>
          <div className="relative space-y-5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <article
                  key={i}
                  className="relative rounded-2xl border border-border bg-card p-6 md:p-7 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="mt-2 text-xs font-bold text-muted-foreground">Step {i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg">{s.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">{s.desc}</p>
                      <ol className="space-y-2">
                        {s.bullets.map((b, j) => (
                          <li key={j} className="flex gap-2 text-sm">
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                              {j + 1}
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" /> Troubleshooting
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {TROUBLESHOOT.map((t, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-medium text-sm mb-1.5">{t.q}</h3>
                <p className="text-sm text-muted-foreground">{t.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to connect?</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Open the app, head to Websites, and authorize Shopify in a few clicks.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Go to the app <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/guides/wordpress">Connect WordPress instead</Link>
            </Button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
