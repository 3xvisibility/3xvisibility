import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateShopifyDomain, validateShopifyToken } from "@/lib/shopify-validation";

interface ShopifyCredentialFieldsProps {
  shopDomain: string;
  onShopDomainChange: (v: string) => void;
  accessToken: string;
  onAccessTokenChange: (v: string) => void;
}

export function ShopifyCredentialFields({
  shopDomain,
  onShopDomainChange,
  accessToken,
  onAccessTokenChange,
}: ShopifyCredentialFieldsProps) {
  const domainError = shopDomain ? validateShopifyDomain(shopDomain) : null;
  const tokenError = accessToken ? validateShopifyToken(accessToken) : null;
  const domainOk = !!shopDomain && !domainError;
  const tokenOk = !!accessToken && !tokenError;

  return (
    <div className="space-y-4">
      <Alert className="bg-muted/50 border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <strong>Shopify prerequisites:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Create a custom app in Shopify Admin → Settings → Apps and sales channels → Develop apps</li>
            <li>Grant the app <strong>write_content</strong> (for pages) and/or <strong>write_products</strong> scopes</li>
            <li>Install the app and copy the Admin API access token</li>
            <li>The token starts with <code className="text-[10px]">shpat_</code></li>
          </ul>
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

      <div>
        <Label htmlFor="shopify-token">Admin API Access Token</Label>
        <Input
          id="shopify-token"
          type="password"
          placeholder="shpat_xxxxx"
          value={accessToken}
          onChange={(e) => onAccessTokenChange(e.target.value)}
          aria-invalid={!!tokenError}
          className={cn(
            tokenError && "border-destructive focus-visible:ring-destructive",
            tokenOk && "border-emerald-500/60 focus-visible:ring-emerald-500/60",
          )}
        />
        {tokenError ? (
          <p className="text-[11px] text-destructive mt-1 flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{tokenError}</span>
          </p>
        ) : tokenOk ? (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            টোকেন ফরম্যাট ঠিক আছে
          </p>
        ) : null}
      </div>
    </div>
  );
}
