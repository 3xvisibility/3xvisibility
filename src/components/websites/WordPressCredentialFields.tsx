import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Lightbulb } from "lucide-react";

export type WpAuthMethod = "application_password" | "jwt";

interface WordPressCredentialFieldsProps {
  authMethod: WpAuthMethod;
  onAuthMethodChange: (method: WpAuthMethod) => void;
  username: string;
  onUsernameChange: (v: string) => void;
  appPassword: string;
  onAppPasswordChange: (v: string) => void;
  jwtToken: string;
  onJwtTokenChange: (v: string) => void;
  connectorKey?: string;
  onConnectorKeyChange?: (v: string) => void;
  /** Current site URL — used for inline validation warnings. */
  siteUrl?: string;
  /** Error message from the last failed test connection, if any. */
  testError?: string | null;
}

/** Map a raw connection error to a few likely fixes the user can act on. */
function suggestFixes(error: string): string[] {
  const e = error.toLowerCase();
  const fixes: string[] = [];

  if (e.includes("auth") || e.includes("401") || e.includes("403") || e.includes("password") || e.includes("forbidden")) {
    fixes.push("Double-check the username and that the Application Password is copied exactly (spaces are fine).");
    fixes.push("Regenerate the Application Password under WordPress → Users → Profile if it may have been revoked.");
    fixes.push("Make sure a security plugin or firewall isn't blocking REST API authentication.");
  }
  if (e.includes("404") || e.includes("not found") || e.includes("rest")) {
    fixes.push("Set Permalinks to anything other than \"Plain\" (Settings → Permalinks).");
    fixes.push("Confirm the URL points to the site root (e.g. https://example.com) with no /wp-admin path.");
    fixes.push("Ensure the WordPress REST API is enabled and reachable at /wp-json.");
  }
  if (e.includes("reach") || e.includes("network") || e.includes("timeout") || e.includes("dns") || e.includes("ssl") || e.includes("certificate")) {
    fixes.push("Verify the site URL is correct and the site is online.");
    fixes.push("Use https:// and check the SSL certificate is valid.");
  }

  if (fixes.length === 0) {
    fixes.push("Verify the site URL, username, and Application Password are all correct.");
    fixes.push("Make sure the WordPress REST API is enabled and not blocked by a security plugin.");
  }
  return fixes;
}

export function WordPressCredentialFields({
  authMethod,
  onAuthMethodChange,
  username,
  onUsernameChange,
  appPassword,
  onAppPasswordChange,
  jwtToken,
  onJwtTokenChange,
  connectorKey = "",
  onConnectorKeyChange,
  siteUrl,
  testError,
}: WordPressCredentialFieldsProps) {
  const urlTrimmed = (siteUrl ?? "").trim();
  const urlMissing = siteUrl !== undefined && urlTrimmed.length === 0;
  const urlMalformed = urlTrimmed.length > 0 && !/^https?:\/\/.+\..+/i.test(urlTrimmed);
  const connectorMissing = onConnectorKeyChange !== undefined && connectorKey.trim().length === 0;
  const legacyAuthRequired = onConnectorKeyChange === undefined;
  const usernameMissing = legacyAuthRequired && authMethod === "application_password" && username.trim().length === 0;
  const passwordMissing = legacyAuthRequired && authMethod === "application_password" && appPassword.trim().length === 0;
  const jwtMissing = legacyAuthRequired && authMethod === "jwt" && jwtToken.trim().length === 0;

  const warnings: string[] = [];
  if (urlMissing) warnings.push("Site URL is required.");
  else if (urlMalformed) warnings.push("Site URL should start with http:// or https:// and include a domain.");
  if (usernameMissing) warnings.push("Username is required for Application Password auth.");
  if (passwordMissing) warnings.push("Application Password is required.");
  if (jwtMissing) warnings.push("JWT Token is required.");
  if (connectorMissing) warnings.push("3xVisibility WordPress Connector Key is required for WordPress publishing.");

  return (
    <div className="space-y-4">
      <Alert className="bg-muted/50 border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <strong>WordPress prerequisites:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Permalinks must be set to anything other than "Plain"</li>
            <li>REST API must be accessible (not blocked by security plugins)</li>
            <li>For Application Passwords: WordPress 5.6+ required</li>
            <li>For JWT: install and configure the JWT Authentication plugin</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div>
        <Label>Authentication Method</Label>
        <Select value={authMethod} onValueChange={(v) => onAuthMethodChange(v as WpAuthMethod)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="application_password">Application Password (recommended)</SelectItem>
            <SelectItem value="jwt">JWT Token</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {authMethod === "application_password" ? (
        <>
          <div>
            <Label htmlFor="wp-user">Username</Label>
            <Input
              id="wp-user"
              placeholder="admin"
              value={username}
              aria-invalid={usernameMissing}
              onChange={(e) => onUsernameChange(e.target.value)}
            />
            {usernameMissing && (
              <p className="text-[11px] text-destructive mt-1">Enter your WordPress username.</p>
            )}
          </div>
          <div>
            <Label htmlFor="wp-pass">Application Password</Label>
            <Input
              id="wp-pass"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={appPassword}
              aria-invalid={passwordMissing}
              onChange={(e) => onAppPasswordChange(e.target.value)}
            />
            {passwordMissing ? (
              <p className="text-[11px] text-destructive mt-1">Enter an Application Password.</p>
            ) : (
              <p className="text-[11px] text-muted-foreground mt-1">
                Generate one in WordPress → Users → Profile → Application Passwords
              </p>
            )}
          </div>
        </>
      ) : (
        <div>
          <Label htmlFor="wp-jwt">JWT Token</Label>
          <Input
            id="wp-jwt"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            value={jwtToken}
            aria-invalid={jwtMissing}
            onChange={(e) => onJwtTokenChange(e.target.value)}
          />
          {jwtMissing ? (
            <p className="text-[11px] text-destructive mt-1">Enter a JWT token.</p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-1">
              Obtain a token from your WordPress JWT Authentication endpoint (usually /wp-json/jwt-auth/v1/token)
            </p>
          )}
        </div>
      )}

      {onConnectorKeyChange && (
        <div className="pt-2 border-t border-muted">
          <Label htmlFor="wp-connector-key">
            3xVisibility WordPress Connector Key <span className="text-destructive font-normal">(required)</span>
          </Label>
          <Input
            id="wp-connector-key"
            type="password"
            placeholder="Paste the API key from the plugin settings"
            value={connectorKey}
            aria-invalid={connectorMissing}
            onChange={(e) => onConnectorKeyChange(e.target.value)}
          />
          {connectorMissing ? (
            <p className="text-[11px] text-destructive mt-1">
              Paste the plugin API key. WordPress publishing no longer uses the standard REST API for Elementor pages.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-1">
              Install the <strong>3xVisibility WordPress Connector</strong> plugin, then paste its API key here to publish
              native Elementor/Gutenberg pages with CSS, media, and cache handling.
            </p>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            <strong>Before testing, complete these fields:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {testError && warnings.length === 0 && (
        <Alert variant="destructive" className="bg-destructive/5">
          <Lightbulb className="h-4 w-4" />
          <AlertDescription className="text-xs leading-relaxed">
            <strong>Connection failed — common fixes:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {suggestFixes(testError).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
