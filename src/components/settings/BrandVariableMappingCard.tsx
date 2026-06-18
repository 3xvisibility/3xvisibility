import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, X, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/contexts/BrandingContext";
import {
  loadBrandMapping,
  saveBrandMapping,
  normalizeBrandKey,
  DEFAULT_BRAND_MAPPING,
  type BrandVariableMapping,
} from "@/lib/brand-variable-mapping";

/**
 * Settings UI to map brand/company/website name variables into the SEO title
 * suffix, page slug, and meta description used when seeding template defaults.
 */
export default function BrandVariableMappingCard() {
  const { toast } = useToast();
  const { appName } = useBranding();
  const [mapping, setMapping] = useState<BrandVariableMapping>(() => loadBrandMapping());
  const [newKey, setNewKey] = useState("");

  const persist = (next: BrandVariableMapping) => {
    setMapping(next);
    saveBrandMapping(next);
  };

  const addKey = () => {
    const key = normalizeBrandKey(newKey);
    if (!key) return;
    if (mapping.keys.includes(key)) {
      toast({ title: "Already mapped", description: `"${key}" is already in the list.` });
      setNewKey("");
      return;
    }
    persist({ ...mapping, keys: [...mapping.keys, key] });
    setNewKey("");
  };

  const removeKey = (key: string) => {
    persist({ ...mapping, keys: mapping.keys.filter((k) => k !== key) });
  };

  const resetDefaults = () => {
    persist({ ...DEFAULT_BRAND_MAPPING });
    toast({ title: "Reset", description: "Brand variable mapping restored to defaults." });
  };

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Brand name mapping
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Choose which template variables resolve to your brand name (
          <span className="font-medium text-foreground">{appName}</span>) and where it
          is applied when SEO defaults are generated.
        </p>

        {/* Mapped variable names */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Mapped variables</Label>
          <div className="flex flex-wrap gap-2">
            {mapping.keys.length === 0 && (
              <span className="text-xs text-muted-foreground">No variables mapped yet.</span>
            )}
            {mapping.keys.map((key) => (
              <Badge key={key} variant="secondary" className="gap-1 font-mono text-[11px]">
                {`{${key}}`}
                <button
                  type="button"
                  onClick={() => removeKey(key)}
                  className="ml-0.5 rounded-sm hover:text-destructive"
                  aria-label={`Remove ${key}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKey();
                }
              }}
              placeholder="e.g. company_name"
              className="h-8 text-sm font-mono"
            />
            <Button type="button" size="sm" variant="outline" onClick={addKey} className="flex-none">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Apply targets */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Apply brand name to</Label>
          {([
            ["applyToTitle", "SEO title suffix"],
            ["applyToSlug", "Page slug"],
            ["applyToDescription", "Meta description"],
          ] as const).map(([field, label]) => (
            <div key={field} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">{label}</span>
              <Switch
                checked={mapping[field]}
                onCheckedChange={(checked) => persist({ ...mapping, [field]: checked })}
              />
            </div>
          ))}
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={resetDefaults}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset to defaults
        </Button>
      </CardContent>
    </Card>
  );
}
