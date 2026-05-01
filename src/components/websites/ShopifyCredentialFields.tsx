import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle, CheckCircle2, ExternalLink, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateShopifyDomain, validateShopifyToken } from "@/lib/shopify-validation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ShopifyCredentialFieldsProps {
  shopDomain: string;
  onShopDomainChange: (v: string) => void;
  accessToken: string;
  onAccessTokenChange: (v: string) => void;
  /** OAuth fields */
  clientId?: string;
  onClientIdChange?: (v: string) => void;
  clientSecret?: string;
  onClientSecretChange?: (v: string) => void;
  authMethod?: "manual" | "oauth";
  onAuthMethodChange?: (v: "manual" | "oauth") => void;
}

export function ShopifyCredentialFields({
  shopDomain,
  onShopDomainChange,
  accessToken,
  onAccessTokenChange,
  clientId = "",
  onClientIdChange,
  clientSecret = "",
  onClientSecretChange,
  authMethod = "oauth",
  onAuthMethodChange,
}: ShopifyCredentialFieldsProps) {
  const domainError = shopDomain ? validateShopifyDomain(shopDomain) : null;
  const tokenError = accessToken ? validateShopifyToken(accessToken) : null;
  const domainOk = !!shopDomain && !domainError;
  const tokenOk = !!accessToken && !tokenError;
  const method = authMethod;

  return (
    <div className="space-y-4">
      {/* Shop Domain — shared by both methods */}
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

      <Tabs value={method} onValueChange={(v) => onAuthMethodChange?.(v as "manual" | "oauth")} className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="oauth" className="text-xs gap-1.5">
            <Shield className="h-3 w-3" />
            OAuth (Recommended)
          </TabsTrigger>
          <TabsTrigger value="manual" className="text-xs">
            Manual Token
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oauth" className="space-y-4 mt-3">
          <Alert className="bg-primary/5 border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs leading-relaxed">
              <strong>Secure OAuth connection</strong> — Shopify will ask you to authorize specific permissions.
              Your credentials stay safe; we never see your admin password.
              <div className="mt-2 text-muted-foreground">
                <strong>How to get Client ID & Secret:</strong>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                  <li>Go to <strong>Shopify Admin → Settings → Apps and sales channels → Develop apps</strong></li>
                  <li>Create a new app → Configure API scopes → Install</li>
                  <li>Copy the <strong>API key</strong> (Client ID) and <strong>API secret key</strong> (Client Secret)</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="shopify-client-id">Client ID (API Key)</Label>
            <Input
              id="shopify-client-id"
              placeholder="Your Shopify app API key"
              value={clientId}
              onChange={(e) => onClientIdChange?.(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="shopify-client-secret">Client Secret (API Secret Key)</Label>
            <Input
              id="shopify-client-secret"
              type="password"
              placeholder="Your Shopify app API secret key"
              value={clientSecret}
              onChange={(e) => onClientSecretChange?.(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Stored securely — only used once to exchange for an access token
            </p>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-3">
          <Alert className="bg-muted/50 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              <strong>Two ways to get your Admin API access token:</strong>
              <div className="mt-1.5">
                <strong className="text-foreground">Option A — Shopify Admin (custom app):</strong>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                  <li>Shopify Admin → Settings → Apps → Develop apps</li>
                  <li>Create app → grant <strong>write_content</strong> and <strong>write_products</strong> scopes</li>
                  <li>Install → copy the Admin API access token (<code className="text-[10px]">shpat_</code>)</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="shopify-token">Admin API Access Token</Label>
            <Input
              id="shopify-token"
              type="password"
              placeholder="shpat_… or shpua_… or shpca_…"
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
                Token format looks good
              </p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
