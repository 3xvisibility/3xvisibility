import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface PrestaShopCredentialFieldsProps {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
}

export function PrestaShopCredentialFields({
  apiKey,
  onApiKeyChange,
}: PrestaShopCredentialFieldsProps) {
  return (
    <div className="space-y-4">
      <Alert className="bg-muted/50 border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          <strong>PrestaShop prerequisites:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Enable the Webservice in Back Office → Advanced Parameters → Webservice</li>
            <li>Create an API key with permissions for <strong>cms</strong> (pages) and/or <strong>products</strong></li>
            <li>Grant <strong>GET, POST, PUT</strong> methods on the resources you need</li>
            <li>Ensure your server allows HTTP Basic authentication</li>
            <li>URL-rewriting (friendly URLs) should be enabled for correct page links</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div>
        <Label htmlFor="ps-key">Webservice API Key</Label>
        <Input
          id="ps-key"
          type="password"
          placeholder="PrestaShop API key"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Found in Back Office → Advanced Parameters → Webservice → Add new key
        </p>
      </div>
    </div>
  );
}
