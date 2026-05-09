import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, FileText, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  websiteId: string | null | undefined;
  websiteType: string | null | undefined;
  pageValue: string;
  productValue: string;
  onChange: (next: { page: string; product: string }) => void;
}

const NONE = "__default__";
const CUSTOM = "__custom__";

/**
 * Picker that lets a Shopify-connected campaign choose alternate page and
 * product templates (template_suffix). Auto-fetches available templates from
 * the connected store and supports manual override.
 */
export function ShopifyTemplateSuffixPicker({
  websiteId,
  websiteType,
  pageValue,
  productValue,
  onChange,
}: Props) {
  const { toast } = useToast();
  const [pageTemplates, setPageTemplates] = useState<string[]>([]);
  const [productTemplates, setProductTemplates] = useState<string[]>([]);
  const [themeName, setThemeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const isShopify = websiteType === "shopify" && !!websiteId;

  const pageSelect = pageValue
    ? (pageTemplates.includes(pageValue) ? pageValue : CUSTOM)
    : NONE;
  const productSelect = productValue
    ? (productTemplates.includes(productValue) ? productValue : CUSTOM)
    : NONE;

  async function fetchTemplates() {
    if (!isShopify) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("shopify-products", {
        body: { action: "list_templates", website_id: websiteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPageTemplates(data?.page_templates || []);
      setProductTemplates(data?.product_templates || []);
      setThemeName(data?.theme_name || null);
      setHasFetched(true);
    } catch (e) {
      toast({
        title: "Could not load Shopify templates",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isShopify && !hasFetched) fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShopify, websiteId]);

  if (!isShopify) return null;

  const renderRow = (
    icon: React.ReactNode,
    label: string,
    description: string,
    options: string[],
    selectVal: string,
    currentText: string,
    onPick: (v: string) => void,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="text-sm font-semibold">{label}</Label>
      </div>
      <p className="text-[11px] text-muted-foreground">{description}</p>
      <div className="flex gap-2">
        <Select
          value={selectVal}
          onValueChange={(v) => {
            if (v === NONE) onPick("");
            else if (v === CUSTOM) onPick(currentText || " ");
            else onPick(v);
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Default template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Default template</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>Custom suffix…</SelectItem>
          </SelectContent>
        </Select>
        {selectVal === CUSTOM && (
          <Input
            placeholder="e.g. landing"
            value={currentText.trim()}
            onChange={(e) => onPick(e.target.value)}
            className="w-40"
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-3 rounded-xl border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Shopify templates</span>
          {themeName && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {themeName}
            </Badge>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={fetchTemplates}
          disabled={loading}
          className="h-7 px-2 text-xs gap-1"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </Button>
      </div>

      {renderRow(
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />,
        "Page template",
        "Used when this run publishes pages (templates/page.<suffix>).",
        pageTemplates,
        pageSelect,
        pageValue,
        (v) => onChange({ page: v, product: productValue }),
      )}

      {renderRow(
        <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />,
        "Product template",
        "Used when this run publishes products (templates/product.<suffix>).",
        productTemplates,
        productSelect,
        productValue,
        (v) => onChange({ page: pageValue, product: v }),
      )}
    </div>
  );
}
