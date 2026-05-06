import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, ExternalLink, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateShopifyDomain } from "@/lib/shopify-validation";
import { useLanguage } from "@/i18n/LanguageContext";
interface ShopifyCredentialFieldsProps {
  shopDomain: string;
  onShopDomainChange: (v: string) => void;
  /** Legacy — kept for backward compat but no longer rendered */
  accessToken?: string;
  onAccessTokenChange?: (v: string) => void;
}

export function ShopifyCredentialFields({
  shopDomain,
  onShopDomainChange,
}: ShopifyCredentialFieldsProps) {
  const domainError = shopDomain ? validateShopifyDomain(shopDomain) : null;
  const domainOk = !!shopDomain && !domainError;

  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs leading-relaxed">
          Enter your Shopify store domain and click <strong>Connect</strong>. You'll be redirected
          to Shopify to authorize access — no API token needed.
        </AlertDescription>
      </Alert>

      <div>
        <Label htmlFor="shopify-domain">Shop Domain</Label>
        <Input
          id="shopify-domain"
          placeholder="my-store.myshopify.com"
          value={shopDomain}
          onChange={(e) => onShopDomainChange(e.target.value)}
          aria-invalid={!!domainError}
          className={cn(
            domainError && "border-destructive focus-visible:ring-destructive",
            domainOk && "border-emerald-500/60 focus-visible:ring-emerald-500/60",
          )}
        />
        {domainError ? (
          <p className="text-[11px] text-destructive mt-1 flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{domainError}</span>
          </p>
        ) : domainOk ? (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Domain format looks good
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-1">
            Your <code>.myshopify.com</code> domain (found in Shopify Admin → Settings → Domains)
          </p>
        )}
      </div>
    </div>
  );
}
