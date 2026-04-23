import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  ShoppingBag,
  Store,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Provider = "shopify" | "prestashop";

interface ConnectionSetupGuideProps {
  provider: Provider;
  /** Site URL/domain entered by the user — used to build deep-links to the admin panel. */
  siteHint?: string;
}

interface Step {
  title: string;
  body: string;
  /** Optional dynamic link built from the user's site hint. */
  link?: { label: string; url: string };
  /** Optional code/value snippet the user can copy. */
  copyValue?: string;
}

function normalizeShopifyDomain(raw?: string): string | null {
  const v = (raw || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!v) return null;
  if (!/\.myshopify\.com$/i.test(v)) return null;
  return v;
}

function normalizeUrl(raw?: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v}`);
    return u.origin;
  } catch {
    return null;
  }
}

function getShopifySteps(siteHint?: string): Step[] {
  const domain = normalizeShopifyDomain(siteHint);
  const adminBase = domain ? `https://${domain}/admin` : "https://admin.shopify.com";
  return [
    {
      title: "১. Shopify Admin-এ যান",
      body: "আপনার Shopify স্টোরের Admin প্যানেল খুলুন। (নিচের বাটনে ক্লিক করলে সরাসরি Apps সেকশনে যাবেন)",
      link: {
        label: domain ? "Open Apps & Sales Channels" : "Open Shopify Admin",
        url: `${adminBase}/settings/apps/development`,
      },
    },
    {
      title: "২. Custom App তৈরি করুন",
      body:
        "Settings → Apps and sales channels → 'Develop apps' এ যান → 'Create an app' এ ক্লিক করুন → একটি নাম দিন (যেমন: Lovable Connector)।",
    },
    {
      title: "৩. API Scopes দিন",
      body:
        "'Configuration' ট্যাব → 'Admin API access scopes' → এই scopes গুলো বাছাই করুন:",
      copyValue: "read_content, write_content, read_products, write_products",
    },
    {
      title: "৪. App Install করে Token কপি করুন",
      body:
        "'Install app' এ ক্লিক করুন → 'API credentials' ট্যাবে গিয়ে 'Admin API access token' এ 'Reveal token once' এ ক্লিক করে টোকেনটি কপি করুন। টোকেনটি `shpat_` দিয়ে শুরু হবে।",
    },
    {
      title: "৫. নিচের ফিল্ডে পেস্ট করুন",
      body: "Shop Domain (যেমন: my-store.myshopify.com) এবং Access Token নিচের ফিল্ডে পেস্ট করে 'Test Connection' চাপুন।",
    },
  ];
}

function getPrestashopSteps(siteHint?: string): Step[] {
  const origin = normalizeUrl(siteHint);
  const adminLink = origin ? `${origin}/admin` : null;
  return [
    {
      title: "১. PrestaShop Back Office-এ লগইন করুন",
      body: "আপনার PrestaShop অ্যাডমিন প্যানেলে যান (সাধারণত /admin URL-এ)।",
      ...(adminLink ? { link: { label: "Open Back Office", url: adminLink } } : {}),
    },
    {
      title: "২. Webservice চালু করুন",
      body:
        "Advanced Parameters → Webservice → 'Enable PrestaShop's webservice' কে YES করুন → Save করুন।",
    },
    {
      title: "৩. নতুন API Key তৈরি করুন",
      body:
        "একই পেজে 'Add new webservice key' এ ক্লিক করুন → একটি Key জেনারেট হবে → সেটি কপি করে রাখুন।",
    },
    {
      title: "৪. Permissions দিন",
      body:
        "Resources লিস্টে নিচের গুলোতে 'GET, POST, PUT' টিক দিন: cms (পেজের জন্য), products (প্রোডাক্টের জন্য), categories। তারপর Save করুন।",
    },
    {
      title: "৫. Site URL ও API Key পেস্ট করুন",
      body:
        "Site URL (যেমন: https://my-shop.com) এবং API Key নিচের ফিল্ডে পেস্ট করে 'Test Connection' চাপুন।",
    },
  ];
}

export function ConnectionSetupGuide({ provider, siteHint }: ConnectionSetupGuideProps) {
  const [open, setOpen] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { toast } = useToast();

  const steps = provider === "shopify" ? getShopifySteps(siteHint) : getPrestashopSteps(siteHint);
  const Icon = provider === "shopify" ? ShoppingBag : Store;
  const title =
    provider === "shopify"
      ? "Shopify সংযোগের সহজ গাইড"
      : "PrestaShop সংযোগের সহজ গাইড";

  const handleCopy = async (value: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIdx(idx);
      toast({ title: "কপি হয়েছে", description: "মান ক্লিপবোর্ডে কপি করা হয়েছে।" });
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      toast({ title: "কপি করা যায়নি", variant: "destructive" });
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-primary/20 bg-primary/5">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-3 text-left transition-colors hover:bg-primary/10 rounded-lg"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ৫টি ছোট ধাপ — ২ মিনিটেই কানেক্ট
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ol className="space-y-2.5 px-3 pb-3">
            {steps.map((step, idx) => (
              <li
                key={idx}
                className="rounded-md border border-border/60 bg-background/60 p-2.5"
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="secondary"
                    className="mt-0.5 h-5 min-w-[20px] shrink-0 justify-center px-1.5 text-[10px]"
                  >
                    {idx + 1}
                  </Badge>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-xs font-medium leading-snug">{step.title}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                    {step.copyValue && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          readOnly
                          value={step.copyValue}
                          className="h-7 flex-1 text-[11px] font-mono"
                          onFocus={(e) => e.currentTarget.select()}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 shrink-0"
                          onClick={() => handleCopy(step.copyValue!, idx)}
                        >
                          {copiedIdx === idx ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                    {step.link && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[11px]"
                        asChild
                      >
                        <a href={step.link.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          {step.link.label}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
