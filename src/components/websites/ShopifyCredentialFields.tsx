import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Shield, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateShopifyDomain } from "@/lib/shopify-validation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ShopifyCredentialFieldsProps {
  shopDomain: string;
  onShopDomainChange: (v: string) => void;
  clientId?: string;
  onClientIdChange?: (v: string) => void;
  clientSecret?: string;
  onClientSecretChange?: (v: string) => void;
}

export function ShopifyCredentialFields({
  shopDomain,
  onShopDomainChange,
  clientId,
  onClientIdChange,
  clientSecret,
  onClientSecretChange,
}: ShopifyCredentialFieldsProps) {
  const domainError = shopDomain ? validateShopifyDomain(shopDomain) : null;
  const domainOk = !!shopDomain && !domainError;
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-4">
      <Alert className="bg-primary/5 border-primary/20">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs leading-relaxed">
          <strong>Per-app OAuth connection</strong> — Enter your Shopify custom app's API key &amp; secret along with your store domain.
          Shopify will ask you to authorize specific permissions.
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

      {onClientIdChange && (
        <div>
          <Label htmlFor="shopify-client-id">API Key (Client ID)</Label>
          <Input
            id="shopify-client-id"
            placeholder="e.g. 1a2b3c4d5e6f..."
            value={clientId || ""}
            onChange={(e) => onClientIdChange(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Found in your Shopify custom app → API credentials → Client ID
          </p>
        </div>
      )}

      {onClientSecretChange && (
        <div>
          <Label htmlFor="shopify-client-secret">API Secret Key (Client Secret)</Label>
          <div className="relative">
            <Input
              id="shopify-client-secret"
              type={showSecret ? "text" : "password"}
              placeholder="shpss_..."
              value={clientSecret || ""}
              onChange={(e) => onClientSecretChange(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Found in your Shopify custom app → API credentials → Client secret
          </p>
        </div>
      )}
    </div>
  );
}
