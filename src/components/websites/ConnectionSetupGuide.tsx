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
      title: "Open Shopify Admin → Settings → Apps and sales channels → Develop apps.",
      link: {
        label: domain ? "Open Apps & Sales Channels" : "Open Shopify Admin",
        url: `${adminBase}/settings/apps/development`,
      },
    },
    {
      title: "Click 'Create an app', name it (e.g. Lovable Connector), then open its Configuration tab.",
    },
    {
      title: "Grant these Admin API access scopes, then save:",
      copyValue: "read_content, write_content, read_products, write_products",
    },
    {
      title: "Click 'Install app'. Then choose a connection method below — OAuth (copies API key + secret) or Manual Token (reveals the access token once).",
    },
  ];
}

function getPrestashopSteps(siteHint?: string): Step[] {
  const origin = normalizeUrl(siteHint);
  const adminLink = origin ? `${origin}/admin` : null;
  return [
    {
      title: "Log in to your PrestaShop Back Office (usually at /admin).",
      ...(adminLink ? { link: { label: "Open Back Office", url: adminLink } } : {}),
    },
    {
      title: "Go to Advanced Parameters → Webservice and set 'Enable PrestaShop's webservice' to YES, then Save.",
    },
    {
      title: "On the same page, click 'Add new webservice key' to generate a new API key and copy it.",
    },
    {
      title: "In the Resources list, grant GET, POST, PUT for: cms, products, categories. Save.",
    },
    {
      title: "Paste the site URL (e.g. https://my-shop.com) and API key below, then click Test Connection.",
    },
  ];
}

export function ConnectionSetupGuide({ provider, siteHint }: ConnectionSetupGuideProps) {
  const [open, setOpen] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { toast } = useToast();

  const steps = provider === "shopify" ? getShopifySteps(siteHint) : getPrestashopSteps(siteHint);
  const Icon = provider === "shopify" ? ShoppingBag : Store;
  const title = provider === "shopify" ? "Shopify setup" : "PrestaShop setup";
  const subtitle = provider === "shopify" ? "4 quick steps" : "5 quick steps";

  const handleCopy = async (value: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIdx(idx);
      toast({ title: "Copied" });
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
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
                <p className="text-[11px] text-muted-foreground">{subtitle}</p>
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
                    <p className="text-xs leading-snug">{step.title}</p>
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
