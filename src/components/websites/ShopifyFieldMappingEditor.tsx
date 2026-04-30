import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Info, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Shape stored in `shopify_field_mappings.field_map`.
 * Each value is a literal OR a token like "{variable_name}" that will be
 * interpolated from CSV row data at publish time.
 */
export interface ShopifyFieldMap {
  title?: string;
  body_html?: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  price?: string;
  sku?: string;
  images?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
}

export interface ShopifyVariantMap {
  option1?: string;
  option2?: string;
  option3?: string;
  compare_at_price?: string;
  inventory_quantity?: string;
  weight?: string;
  weight_unit?: string;
  barcode?: string;
}

export interface ShopifyMetafieldMap {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

const CORE_FIELDS: { key: keyof ShopifyFieldMap; label: string; hint: string }[] = [
  { key: "title", label: "Product title", hint: "Required" },
  { key: "body_html", label: "Description (body_html)", hint: "Full description (HTML allowed)" },
  { key: "handle", label: "Handle (slug)", hint: "URL handle, auto-generated from title if empty" },
  { key: "vendor", label: "Vendor / Brand", hint: "" },
  { key: "product_type", label: "Product type", hint: "Shopify product type taxonomy" },
  { key: "tags", label: "Tags", hint: "Comma-separated list" },
  { key: "price", label: "Default price", hint: "Numeric, e.g. 19.99" },
  { key: "sku", label: "SKU", hint: "Default variant SKU" },
  { key: "images", label: "Images", hint: "Comma-separated URLs" },
  { key: "seo_title", label: "SEO title", hint: "Falls back to product title" },
  { key: "seo_description", label: "SEO description", hint: "Falls back to body excerpt" },
  { key: "status", label: "Status", hint: "active | draft | archived (default: active)" },
];

const VARIANT_FIELDS: { key: keyof ShopifyVariantMap; label: string; hint: string }[] = [
  { key: "option1", label: "Option 1 (e.g. Size)", hint: "" },
  { key: "option2", label: "Option 2 (e.g. Color)", hint: "" },
  { key: "option3", label: "Option 3", hint: "" },
  { key: "compare_at_price", label: "Compare-at price", hint: "Strike-through price" },
  { key: "inventory_quantity", label: "Inventory qty", hint: "Integer" },
  { key: "weight", label: "Weight", hint: "Numeric" },
  { key: "weight_unit", label: "Weight unit", hint: "g | kg | oz | lb" },
  { key: "barcode", label: "Barcode (UPC/EAN)", hint: "" },
];

interface Props {
  workspaceId: string;
  websiteId: string;
  /** Optional: scope this editor to a single campaign override. Omit for the website default. */
  campaignId?: string | null;
  /** Available CSV/template variable names (without braces). Shown as one-click insert chips. */
  availableVariables?: string[];
  /**
   * When provided, the editor becomes "controlled" — instead of writing to Supabase
   * itself (used inside the campaign wizard before the campaign exists).
   */
  controlled?: {
    value: { field_map: ShopifyFieldMap; variant_map: ShopifyVariantMap; metafields: ShopifyMetafieldMap[] };
    onChange: (next: { field_map: ShopifyFieldMap; variant_map: ShopifyVariantMap; metafields: ShopifyMetafieldMap[] }) => void;
  };
}

export function ShopifyFieldMappingEditor({
  workspaceId,
  websiteId,
  campaignId,
  availableVariables = [],
  controlled,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isCampaign = campaignId != null;

  // Server-backed mode (used in EditWebsiteDialog or when campaignId already exists)
  const queryEnabled = !controlled && !!websiteId;
  // The new shopify_field_mappings table isn't in the generated types yet; cast the
  // client surface to a permissive any so we can read/write it without TS errors.
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (cols: string) => any;
      insert: (row: unknown) => Promise<{ error: { message: string } | null }>;
      update: (row: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
  };
  const { data: row, isLoading } = useQuery({
    enabled: queryEnabled,
    queryKey: ["shopify_field_mapping", websiteId, campaignId ?? null],
    queryFn: async () => {
      let q = sb.from("shopify_field_mappings").select("*").eq("website_id", websiteId);
      q = isCampaign ? q.eq("campaign_id", campaignId!) : q.is("campaign_id", null);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return (data ?? null) as null | {
        field_map: ShopifyFieldMap;
        variant_map: ShopifyVariantMap;
        metafields: ShopifyMetafieldMap[];
      };
    },
  });

  const [fieldMap, setFieldMap] = useState<ShopifyFieldMap>({});
  const [variantMap, setVariantMap] = useState<ShopifyVariantMap>({});
  const [metafields, setMetafields] = useState<ShopifyMetafieldMap[]>([]);

  const SAMPLE_JSON = JSON.stringify(
    {
      product_title: "Classic Cotton Tee",
      product_description: "<p>Soft 100% organic cotton t-shirt.</p>",
      product_handle: "classic-cotton-tee",
      product_brand: "Acme",
      product_type: "Apparel",
      product_tags: "cotton, summer, unisex",
      product_price: "29.99",
      product_sku: "ACME-TEE-001",
      product_image: "https://cdn.example.com/tee.jpg",
      product_size: "M",
      product_color: "Navy",
      product_inventory: "120",
      product_weight: "180",
    },
    null,
    2,
  );
  const [previewJson, setPreviewJson] = useState<string>(SAMPLE_JSON);

  // Sync from controlled or from server
  useEffect(() => {
    if (controlled) {
      setFieldMap(controlled.value.field_map || {});
      setVariantMap(controlled.value.variant_map || {});
      setMetafields(controlled.value.metafields || []);
      return;
    }
    if (row) {
      setFieldMap(row.field_map || {});
      setVariantMap(row.variant_map || {});
      setMetafields(Array.isArray(row.metafields) ? row.metafields : []);
    }
  }, [row, controlled?.value]);

  const emit = (next: Partial<{ field_map: ShopifyFieldMap; variant_map: ShopifyVariantMap; metafields: ShopifyMetafieldMap[] }>) => {
    if (!controlled) return;
    controlled.onChange({
      field_map: next.field_map ?? fieldMap,
      variant_map: next.variant_map ?? variantMap,
      metafields: next.metafields ?? metafields,
    });
  };

  const updateField = (k: keyof ShopifyFieldMap, v: string) => {
    const next = { ...fieldMap, [k]: v } as ShopifyFieldMap;
    if (!v) delete next[k];
    setFieldMap(next);
    emit({ field_map: next });
  };
  const updateVariant = (k: keyof ShopifyVariantMap, v: string) => {
    const next = { ...variantMap, [k]: v } as ShopifyVariantMap;
    if (!v) delete next[k];
    setVariantMap(next);
    emit({ variant_map: next });
  };
  const addMetafield = () => {
    const next = [...metafields, { namespace: "custom", key: "", type: "single_line_text_field", value: "" }];
    setMetafields(next);
    emit({ metafields: next });
  };
  const updateMetafield = (i: number, patch: Partial<ShopifyMetafieldMap>) => {
    const next = metafields.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
    setMetafields(next);
    emit({ metafields: next });
  };
  const removeMetafield = (i: number) => {
    const next = metafields.filter((_, idx) => idx !== i);
    setMetafields(next);
    emit({ metafields: next });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const payload = {
        workspace_id: workspaceId,
        website_id: websiteId,
        campaign_id: campaignId ?? null,
        user_id: userData.user.id,
        field_map: fieldMap,
        variant_map: variantMap,
        metafields,
      };

      // Manual upsert (the unique partial indexes don't play with .upsert onConflict)
      const baseSel = sb.from("shopify_field_mappings").select("id").eq("website_id", websiteId);
      const existingQuery = isCampaign ? baseSel.eq("campaign_id", campaignId!) : baseSel.is("campaign_id", null);
      const { data: existing, error: selErr } = await existingQuery.maybeSingle();
      if (selErr) throw selErr;

      if (existing && (existing as { id: string }).id) {
        const { error } = await sb
          .from("shopify_field_mappings")
          .update(payload)
          .eq("id", (existing as { id: string }).id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("shopify_field_mappings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopify_field_mapping", websiteId, campaignId ?? null] });
      toast({ title: "Field mapping saved" });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const variableChips = useMemo(() => {
    const seen = new Set<string>();
    return (availableVariables || [])
      .filter((v) => v && !seen.has(v) && (seen.add(v), true))
      .slice(0, 24);
  }, [availableVariables]);

  const insertToken = (target: HTMLInputElement | null, token: string) => {
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const next = target.value.slice(0, start) + `{${token}}` + target.value.slice(end);
    target.value = next;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  };

  if (queryEnabled && isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading mapping…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Alert className="bg-muted/50 border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs leading-relaxed">
          Map each Shopify field to a literal value or a template variable like{" "}
          <code className="text-[10px]">{"{product_title}"}</code>. Variables are filled from
          your CSV / template data when products are created or republished.
          {!controlled && (
            <> Empty fields fall back to the page&apos;s built-in title, content, and SEO meta.</>
          )}
        </AlertDescription>
      </Alert>

      {variableChips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {variableChips.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="cursor-pointer text-[10px] font-mono"
              onClick={() => {
                const el = document.activeElement as HTMLInputElement | null;
                if (el && el.tagName === "INPUT") insertToken(el, v);
              }}
              title="Click to insert into focused field"
            >
              {`{${v}}`}
            </Badge>
          ))}
        </div>
      )}

      <Tabs defaultValue="core" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="core">Core</TabsTrigger>
          <TabsTrigger value="variant">Variant</TabsTrigger>
          <TabsTrigger value="meta">Metafields</TabsTrigger>
          <TabsTrigger value="preview"><Eye className="h-3 w-3 mr-1" />Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="core" className="mt-3">
          <ScrollArea className="max-h-[420px] pr-2">
            <div className="space-y-3">
              {CORE_FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs">{f.label}</Label>
                  <div>
                    <Input
                      value={fieldMap[f.key] ?? ""}
                      onChange={(e) => updateField(f.key, e.target.value)}
                      placeholder={`{${f.key}} or literal value`}
                      className="h-8 text-xs font-mono"
                    />
                    {f.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="variant" className="mt-3">
          <ScrollArea className="max-h-[420px] pr-2">
            <div className="space-y-3">
              {VARIANT_FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <Label className="text-xs">{f.label}</Label>
                  <div>
                    <Input
                      value={variantMap[f.key] ?? ""}
                      onChange={(e) => updateVariant(f.key, e.target.value)}
                      placeholder={`{${f.key}} or literal value`}
                      className="h-8 text-xs font-mono"
                    />
                    {f.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</p>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="meta" className="mt-3">
          <div className="space-y-2">
            {metafields.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No metafields. Click &quot;Add metafield&quot; to attach custom Shopify metadata
                (e.g. <code>custom.warranty_months</code>).
              </p>
            )}
            {metafields.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_2fr_auto] gap-1.5 items-center">
                <Input
                  value={m.namespace}
                  onChange={(e) => updateMetafield(i, { namespace: e.target.value })}
                  placeholder="namespace"
                  className="h-8 text-xs font-mono"
                />
                <Input
                  value={m.key}
                  onChange={(e) => updateMetafield(i, { key: e.target.value })}
                  placeholder="key"
                  className="h-8 text-xs font-mono"
                />
                <Input
                  value={m.type}
                  onChange={(e) => updateMetafield(i, { type: e.target.value })}
                  placeholder="type"
                  className="h-8 text-xs font-mono w-[150px]"
                />
                <Input
                  value={m.value}
                  onChange={(e) => updateMetafield(i, { value: e.target.value })}
                  placeholder="{variable} or literal"
                  className="h-8 text-xs font-mono"
                />
                <Button size="icon" variant="ghost" onClick={() => removeMetafield(i)} className="h-8 w-8">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addMetafield} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add metafield
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Common types: <code>single_line_text_field</code>, <code>multi_line_text_field</code>,
              <code> number_integer</code>, <code>number_decimal</code>, <code>boolean</code>, <code>url</code>,
              <code> json</code>.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {!controlled && (
        <div className="flex justify-end pt-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
            {saveMutation.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Saving…</>
            ) : (
              isCampaign ? "Save campaign override" : "Save default mapping"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
