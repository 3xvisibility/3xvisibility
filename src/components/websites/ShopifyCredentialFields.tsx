import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Shield, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateShopifyDomain } from "@/lib/shopify-validation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type ShopifyAuthMethod = "oauth" | "api_key";

interface ShopifyCredentialFieldsProps {
  shopDomain: string;
  onShopDomainChange: (v: string) => void;
  authMethod: ShopifyAuthMethod;
  onAuthMethodChange: (v: ShopifyAuthMethod) => void;
  accessToken: string;
  onAccessTokenChange: (v: string) => void;
}

export function ShopifyCredentialFields({
  shopDomain,
  onShopDomainChange,
  authMethod,
  onAuthMethodChange,
  accessToken,
  onAccessTokenChange,
}: ShopifyCredentialFieldsProps) {
  const domainError = shopDomain ? validateShopifyDomain(shopDomain) : null;
  const domainOk = !!shopDomain && !domainError;

  return (
    <div className="space-y-4">
      <Tabs value={authMethod} onValueChange={(v) => onAuthMethodChange(v as ShopifyAuthMethod)}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="oauth" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            OAuth
          </TabsTrigger>
          <TabsTrigger value="api_key" className="text-xs">
            <Key className="h-3 w-3 mr-1" />
            API Key
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oauth" className="mt-3 space-y-3">
          <Alert className="bg-primary/5 border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs leading-relaxed">
              <strong>Secure OAuth connection</strong> — Enter your store domain, then click Connect.
              Shopify will ask you to authorize access. No API keys needed.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="api_key" className="mt-3 space-y-3">
          <Alert className="bg-emerald-500/5 border-emerald-500/20">
            <Key className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-xs leading-relaxed">
              <strong>Direct API key</strong> — Enter your store domain and Admin API access token.
              Found in Shopify Admin → Settings → Apps → Develop apps → your app → API credentials.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="shopify-access-token">Admin API Access Token</Label>
            <Input
              id="shopify-access-token"
              type="password"
              placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
              value={accessToken}
              onChange={(e) => onAccessTokenChange(e.target.value)}
              className={cn(
                accessToken && accessToken.length > 10 && "border-emerald-500/60 focus-visible:ring-emerald-500/60",
              )}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Your <code>shpat_...</code> token from a custom app with <code>read_content, write_content, read_products, write_products</code> scopes.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Domain field is shared by both methods */}
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
