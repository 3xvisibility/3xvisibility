import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
}: WordPressCredentialFieldsProps) {
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
              onChange={(e) => onUsernameChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="wp-pass">Application Password</Label>
            <Input
              id="wp-pass"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={appPassword}
              onChange={(e) => onAppPasswordChange(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Generate one in WordPress → Users → Profile → Application Passwords
            </p>
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
            onChange={(e) => onJwtTokenChange(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Obtain a token from your WordPress JWT Authentication endpoint (usually /wp-json/jwt-auth/v1/token)
          </p>
        </div>
      )}
    </div>
  );
}
