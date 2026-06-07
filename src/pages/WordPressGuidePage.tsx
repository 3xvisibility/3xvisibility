import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight, Globe, CheckCircle2, KeyRound, UserPlus, Plug,
  ShieldCheck, AlertTriangle, Rocket, ListChecks,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PREREQS = [
  "A self-hosted WordPress site (version 5.6 or newer).",
  "An admin account on that WordPress site.",
  "The REST API enabled (it is on by default on most installs).",
];

const STEPS = [
  {
    icon: KeyRound,
    title: "Create a WordPress Application Password",
    desc: "Application Passwords let 3XVISIBILITY publish pages securely without sharing your main login.",
    bullets: [
      "Log in to your WordPress admin dashboard (yoursite.com/wp-admin).",
      "Go to Users → Profile (or Users → Your Profile).",
      "Scroll down to the Application Passwords section.",
      "Type a name like “3XVISIBILITY” and click Add New Application Password.",
      "Copy the generated password immediately — WordPress shows it only once.",
    ],
  },
  {
    icon: Plug,
    title: "Open the Websites page in 3XVISIBILITY",
    desc: "This is where every connected site lives.",
    bullets: [
      "From the sidebar, click Websites.",
      "Click the Connect Website button in the top-right.",
      "Choose WordPress from the platform dropdown.",
    ],
  },
  {
    icon: UserPlus,
    title: "Enter your site details",
    desc: "Fill in the connection form with your site and the credentials you just created.",
    bullets: [
      "Site name: anything you like (e.g. “My Blog”).",
      "Site URL: your full site address, including https:// (e.g. https://yoursite.com).",
      "Auth method: keep Application Password (recommended).",
      "Username: your WordPress admin username.",
      "Application Password: paste the password copied in step 1.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Test and save the connection",
    desc: "We verify the credentials before storing anything.",
    bullets: [
      "Pick the site's primary language (or use Auto-detect from site).",
      "Click Connect / Save.",
      "A green “Connected” badge confirms everything works.",
    ],
  },
  {
    icon: Rocket,
    title: "Start publishing",
    desc: "Your WordPress site is now a publishing target for any campaign.",
    bullets: [
      "Build or import a template, add your data, and run a campaign.",
      "Generated pages are pushed straight to WordPress as drafts or published posts.",
      "Re-run anytime — new rows become new pages automatically.",
    ],
  },
];

const TROUBLESHOOT = [
  {
    q: "“401 / Unauthorized” error",
    a: "Double-check the username and re-paste the Application Password (no spaces). Make sure you used an Application Password, not your normal login password.",
  },
  {
    q: "“SSL / SNI” or certificate error",
    a: "Confirm whether your site needs the www prefix in the URL. If it is an SNI mismatch, contact your hosting provider to align the SSL certificate.",
  },
  {
    q: "Application Passwords section is missing",
    a: "Update WordPress to 5.6 or newer, and make sure your site is served over HTTPS — Application Passwords are disabled on non-secure sites.",
  },
  {
    q: "Pages not appearing on the site",
    a: "Check that the REST API is reachable at yoursite.com/wp-json. Some security plugins block it — temporarily allow REST access and reconnect.",
  },
];

export default function WordPressGuidePage() {
  useEffect(() => {
    document.title = "Connect WordPress — 3XVISIBILITY";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", "Step-by-step guide to connect your WordPress site to 3XVISIBILITY and publish pages at scale.");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Connect WordPress"
        description="A step-by-step guide to connecting your WordPress website to 3XVISIBILITY using Application Passwords, then publishing programmatic pages."
        path="/guides/wordpress"
      />
      <LandingNav />

      <main className="container mx-auto px-4 lg:px-8 pt-28 pb-16" data-auto-translate>
        {/* Hero */}
        <header className="max-w-3xl mx-auto text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Globe className="h-3 w-3 mr-1" /> WordPress Integration
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Connect your WordPress site
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Link WordPress in under 5 minutes and start publishing pages directly from 3XVISIBILITY — no plugins to install.
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
            Open the app, head to Websites, and connect WordPress in a few clicks.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Go to the app <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/guides/shopify">Connect Shopify instead</Link>
            </Button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
