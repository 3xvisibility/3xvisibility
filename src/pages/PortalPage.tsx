import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, FileText, Globe, LogIn, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";

interface Tile {
  title: string;
  description: string;
  to: string;
  icon: typeof CreditCard;
  cta: string;
}

const TILES: Tile[] = [
  {
    title: "Subscription",
    description: "See your current plan, usage and renewal date, upgrade or cancel at any time.",
    to: "/billing",
    icon: CreditCard,
    cta: "Manage subscription",
  },
  {
    title: "Invoices & payments",
    description: "Download every invoice as a PDF, review payments and update your saved card.",
    to: "/billing",
    icon: FileText,
    cta: "View invoices",
  },
  {
    title: "Connect your site",
    description: "Link your WordPress, Shopify, WooCommerce or PrestaShop site to start publishing.",
    to: "/websites",
    icon: Globe,
    cta: "Connect a site",
  },
  {
    title: "Plans & pricing",
    description: "Compare what each plan includes before you change or start a subscription.",
    to: "/pricing",
    icon: Rocket,
    cta: "See plans",
  },
];

export default function PortalPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSignedIn(!!data.session);
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <Seo
        title="Customer Portal"
        path="/portal"
        description="Sign in to manage your 3XVISIBILITY subscription, invoices, payments and connected sites in one place."
      />
      <main className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <header className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Customer portal</h1>
            <p className="text-muted-foreground text-sm">
              Manage your subscription, invoices, payments and connected sites in one place.
            </p>
            {email && (
              <p className="text-xs text-muted-foreground" data-no-autotranslate>
                Signed in as {email}
              </p>
            )}
          </header>

          {signedIn === false && (
            <Card className="shadow-surface">
              <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                <LogIn className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Sign in to your account to manage your subscription and invoices.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <Link to="/auth">Sign in</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/auth">Create an account</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {TILES.map((tile) => (
              <Card key={tile.title} className="shadow-surface">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <tile.icon className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">{tile.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                  <Button asChild variant="outline" size="sm" disabled={signedIn === null}>
                    <Link to={signedIn ? tile.to : "/auth"}>{tile.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
