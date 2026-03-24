import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowRight, Check, AlertTriangle, X, Save, FolderOpen, Trash2,
  ArrowDownAZ, Hash, Link2, Type, MapPin, Target, Search as SearchIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Structured target fields ─────────────────────────────────────

interface TargetField {
  key: string;
  label: string;
  category: "content" | "seo" | "sea" | "geo" | "custom";
  description: string;
  required?: boolean;
  requiredFor?: string[]; // CMS types that require this
}

const TARGET_FIELDS: TargetField[] = [
  // Content
  { key: "title", label: "Page Title", category: "content", description: "Primary heading / H1", required: true },
  { key: "slug", label: "URL Slug", category: "content", description: "URL path segment" },
  { key: "content", label: "Body Content", category: "content", description: "Main page content" },
  { key: "excerpt", label: "Excerpt", category: "content", description: "Short summary / teaser" },
  { key: "name", label: "Name", category: "content", description: "Item / entity name" },
  { key: "description", label: "Description", category: "content", description: "Full description text" },
  { key: "keyword", label: "Keyword", category: "content", description: "Primary keyword" },
  { key: "service", label: "Service", category: "content", description: "Service name" },
  { key: "category", label: "Category", category: "content", description: "Content category" },
  { key: "tags", label: "Tags", category: "content", description: "Comma-separated tags" },
  { key: "author", label: "Author", category: "content", description: "Author name" },
  { key: "date", label: "Date", category: "content", description: "Publish / event date" },
  { key: "price", label: "Price", category: "content", description: "Display price" },
  // SEO
  { key: "seo.meta_title", label: "Meta Title", category: "seo", description: "SEO title tag (≤60 chars)" },
  { key: "seo.meta_description", label: "Meta Description", category: "seo", description: "SEO description (≤160 chars)" },
  { key: "seo.keywords", label: "Keywords", category: "seo", description: "Comma-separated keywords" },
  { key: "seo.canonical_url", label: "Canonical URL", category: "seo", description: "Override canonical URL" },
  { key: "seo.og_title", label: "OG Title", category: "seo", description: "Open Graph title" },
  { key: "seo.og_description", label: "OG Description", category: "seo", description: "Open Graph description" },
  { key: "seo.og_image", label: "OG Image URL", category: "seo", description: "Social sharing image" },
  { key: "seo.schema_type", label: "Schema Type", category: "seo", description: "Structured data type (WebPage, Product…)" },
  // SEA
  { key: "sea.utm_source", label: "UTM Source", category: "sea", description: "Traffic source (e.g. google)" },
  { key: "sea.utm_medium", label: "UTM Medium", category: "sea", description: "Marketing medium (e.g. cpc)" },
  { key: "sea.utm_campaign", label: "UTM Campaign", category: "sea", description: "Campaign name" },
  { key: "sea.utm_term", label: "UTM Term", category: "sea", description: "Paid search keyword" },
  { key: "sea.utm_content", label: "UTM Content", category: "sea", description: "Ad variation identifier" },
  { key: "sea.ad_campaign_id", label: "Ad Campaign ID", category: "sea", description: "External ad platform campaign ID" },
  { key: "sea.ad_group_id", label: "Ad Group ID", category: "sea", description: "External ad group ID" },
  // GEO
  { key: "geo.city", label: "City", category: "geo", description: "City name for local targeting" },
  { key: "geo.region", label: "Region / State", category: "geo", description: "State or region" },
  { key: "geo.country", label: "Country", category: "geo", description: "Country name" },
  { key: "geo.postcode", label: "Postal Code", category: "geo", description: "ZIP / postal code" },
  { key: "geo.latitude", label: "Latitude", category: "geo", description: "GPS latitude" },
  { key: "geo.longitude", label: "Longitude", category: "geo", description: "GPS longitude" },
  { key: "geo.county", label: "County", category: "geo", description: "County / district" },
  { key: "geo.neighborhood", label: "Neighborhood", category: "geo", description: "Neighborhood / area" },
  { key: "geo.timezone", label: "Timezone", category: "geo", description: "Local timezone" },
  { key: "geo.population", label: "Population", category: "geo", description: "City population" },
  // WordPress
  { key: "wp.post_id", label: "Post ID", category: "custom", description: "WordPress post ID" },
  { key: "wp.post_type", label: "Post Type", category: "custom", description: "page, post, custom post type" },
  { key: "wp.post_status", label: "Post Status", category: "custom", description: "draft, publish, pending" },
  { key: "wp.featured_image", label: "Featured Image", category: "custom", description: "Featured image URL" },
  { key: "wp.template", label: "Page Template", category: "custom", description: "WordPress page template" },
  { key: "wp.menu_order", label: "Menu Order", category: "custom", description: "Page menu order" },
  { key: "wp.parent_id", label: "Parent Page", category: "custom", description: "Parent page ID" },
  { key: "wp.custom_field_1", label: "Custom Field 1", category: "custom", description: "WordPress custom field" },
  { key: "wp.custom_field_2", label: "Custom Field 2", category: "custom", description: "WordPress custom field" },
  // WooCommerce
  { key: "woo.product_name", label: "Product Name", category: "custom", description: "WooCommerce product name" },
  { key: "woo.regular_price", label: "Regular Price", category: "custom", description: "Regular price" },
  { key: "woo.sale_price", label: "Sale Price", category: "custom", description: "Discounted sale price" },
  { key: "woo.sku", label: "SKU", category: "custom", description: "Stock keeping unit" },
  { key: "woo.stock_status", label: "Stock Status", category: "custom", description: "instock, outofstock, onbackorder" },
  { key: "woo.stock_quantity", label: "Stock Quantity", category: "custom", description: "Available stock count" },
  { key: "woo.weight", label: "Weight", category: "custom", description: "Product weight" },
  { key: "woo.dimensions", label: "Dimensions", category: "custom", description: "L×W×H dimensions" },
  { key: "woo.product_category", label: "Product Category", category: "custom", description: "WooCommerce category" },
  { key: "woo.product_tag", label: "Product Tag", category: "custom", description: "WooCommerce tag" },
  { key: "woo.product_image", label: "Product Image", category: "custom", description: "Main product image URL" },
  { key: "woo.product_gallery", label: "Product Gallery", category: "custom", description: "Gallery image URLs" },
  { key: "woo.short_description", label: "Short Description", category: "custom", description: "Product short description" },
  { key: "woo.product_type", label: "Product Type", category: "custom", description: "simple, variable, grouped" },
  { key: "woo.tax_class", label: "Tax Class", category: "custom", description: "Tax classification" },
  { key: "woo.shipping_class", label: "Shipping Class", category: "custom", description: "Shipping classification" },
  // Shopify
  { key: "shopify.product_title", label: "Product Title", category: "custom", description: "Shopify product title" },
  { key: "shopify.product_handle", label: "Product Handle", category: "custom", description: "URL handle / slug" },
  { key: "shopify.body_html", label: "Body HTML", category: "custom", description: "Product body HTML content" },
  { key: "shopify.vendor", label: "Vendor", category: "custom", description: "Product vendor / brand" },
  { key: "shopify.product_type", label: "Product Type", category: "custom", description: "Shopify product type" },
  { key: "shopify.tags", label: "Tags", category: "custom", description: "Comma-separated Shopify tags" },
  { key: "shopify.variant_title", label: "Variant Title", category: "custom", description: "Variant display title" },
  { key: "shopify.variant_price", label: "Variant Price", category: "custom", description: "Variant price" },
  { key: "shopify.variant_sku", label: "Variant SKU", category: "custom", description: "Variant SKU code" },
  { key: "shopify.variant_inventory", label: "Variant Inventory", category: "custom", description: "Inventory quantity" },
  { key: "shopify.compare_at_price", label: "Compare At Price", category: "custom", description: "Original / compare price" },
  { key: "shopify.barcode", label: "Barcode", category: "custom", description: "Product barcode / UPC" },
  { key: "shopify.collection", label: "Collection", category: "custom", description: "Shopify collection name" },
  { key: "shopify.image_src", label: "Image Source", category: "custom", description: "Product image URL" },
  { key: "shopify.metafield_key", label: "Metafield Key", category: "custom", description: "Custom metafield key" },
  { key: "shopify.metafield_value", label: "Metafield Value", category: "custom", description: "Custom metafield value" },
  // PrestaShop
  { key: "ps.reference", label: "Reference", category: "custom", description: "PrestaShop product reference" },
  { key: "ps.ean13", label: "EAN13", category: "custom", description: "EAN-13 barcode" },
  { key: "ps.upc", label: "UPC", category: "custom", description: "UPC barcode" },
  { key: "ps.wholesale_price", label: "Wholesale Price", category: "custom", description: "Cost / wholesale price" },
  { key: "ps.category", label: "Category", category: "custom", description: "PrestaShop category" },
  { key: "ps.manufacturer", label: "Manufacturer", category: "custom", description: "Brand / manufacturer" },
  { key: "ps.supplier", label: "Supplier", category: "custom", description: "Product supplier" },
  { key: "ps.condition", label: "Condition", category: "custom", description: "new, used, refurbished" },
  { key: "ps.quantity", label: "Quantity", category: "custom", description: "Available stock quantity" },
  { key: "ps.weight", label: "Weight", category: "custom", description: "Product weight" },
  { key: "ps.meta_title", label: "Meta Title", category: "custom", description: "PrestaShop SEO title" },
  { key: "ps.meta_description", label: "Meta Description", category: "custom", description: "PrestaShop SEO description" },
  { key: "ps.link_rewrite", label: "Friendly URL", category: "custom", description: "URL slug / link rewrite" },
  { key: "ps.cover_image", label: "Cover Image", category: "custom", description: "Main product image" },
  { key: "ps.delivery_time", label: "Delivery Time", category: "custom", description: "Estimated delivery" },
  // Media
  { key: "media.image_url", label: "Image URL", category: "custom", description: "Primary image URL" },
  { key: "media.image_alt", label: "Image Alt", category: "custom", description: "Image alt text" },
  { key: "media.logo_url", label: "Logo URL", category: "custom", description: "Logo image URL" },
  { key: "media.video_url", label: "Video URL", category: "custom", description: "Embedded video URL" },
  { key: "media.gallery", label: "Gallery", category: "custom", description: "Multiple image URLs" },
  { key: "media.thumbnail_url", label: "Thumbnail", category: "custom", description: "Thumbnail image URL" },
  // Business
  { key: "biz.company", label: "Company", category: "custom", description: "Company / business name" },
  { key: "biz.phone", label: "Phone", category: "custom", description: "Phone number" },
  { key: "biz.email", label: "Email", category: "custom", description: "Contact email" },
  { key: "biz.address", label: "Address", category: "custom", description: "Street address" },
  { key: "biz.website", label: "Website", category: "custom", description: "Website URL" },
  { key: "biz.opening_hours", label: "Opening Hours", category: "custom", description: "Business hours" },
  { key: "biz.rating", label: "Rating", category: "custom", description: "Star rating" },
  { key: "biz.reviews_count", label: "Reviews Count", category: "custom", description: "Number of reviews" },
];

const CATEGORY_META: Record<string, { icon: any; label: string; color: string }> = {
  content: { icon: Type, label: "Content", color: "text-primary" },
  seo: { icon: SearchIcon, label: "SEO", color: "text-success" },
  sea: { icon: Target, label: "SEA", color: "text-warning" },
  geo: { icon: MapPin, label: "GEO", color: "text-secondary" },
  custom: { icon: Hash, label: "Platform", color: "text-muted-foreground" },
};

const TRANSFORMS = [
  { value: "", label: "None" },
  { value: "lowercase", label: "Lowercase" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "capitalize", label: "Capitalize Words" },
  { value: "slug", label: "Slugify" },
  { value: "truncate(60)", label: "Truncate (60)" },
  { value: "truncate(160)", label: "Truncate (160)" },
  { value: "extract(5)", label: "First 5 Words" },
];

// ─── Types ────────────────────────────────────────────────────────

export interface MappingEntry {
  variable: string;
  column: string | null;
  customValue?: string;
  targetField?: string;
  transform?: string;
}

interface MappingStepProps {
  csvHeaders: string[];
  templateVars: string[];
  campaignTypes: string[];
  websiteType?: string;
  manualMappings: Record<string, string>;
  setManualMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  customValues: Record<string, string>;
  setCustomValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  transforms: Record<string, string>;
  setTransforms: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  targetFieldMappings: Record<string, string>;
  setTargetFieldMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  workspaceId: string;
}

// ─── Component ────────────────────────────────────────────────────

export function MappingStep({
  csvHeaders,
  templateVars,
  campaignTypes,
  websiteType,
  manualMappings,
  setManualMappings,
  customValues,
  setCustomValues,
  transforms,
  setTransforms,
  targetFieldMappings,
  setTargetFieldMappings,
  workspaceId,
}: MappingStepProps) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [saveProfileName, setSaveProfileName] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ─── Profiles ────────────────────────────────────────────────────

  const { data: profiles = [] } = useQuery({
    queryKey: ["mapping-profiles", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mapping_profiles" as any)
        .select("id, name, mappings, transforms, campaign_type, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const mappingsData = templateVars.map(v => ({
        variable: v,
        column: manualMappings[v] || null,
        customValue: customValues[v] || null,
        targetField: targetFieldMappings[v] || null,
        transform: transforms[v] || null,
      }));
      const { error } = await (supabase.from("mapping_profiles" as any) as any).insert({
        workspace_id: workspaceId,
        user_id: user.id,
        name,
        mappings: mappingsData,
        transforms,
        campaign_type: campaignTypes[0] || "seo",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-profiles"] });
      toast({ title: "Profile saved" });
      setProfileDialogOpen(false);
      setSaveProfileName("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("mapping_profiles" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-profiles"] });
      toast({ title: "Profile deleted" });
    },
  });

  const loadProfile = (profile: any) => {
    const mappings = profile.mappings as any[];
    const newManual: Record<string, string> = {};
    const newCustom: Record<string, string> = {};
    const newTargets: Record<string, string> = {};
    const newTransforms: Record<string, string> = {};
    for (const m of mappings) {
      if (m.column && csvHeaders.includes(m.column)) newManual[m.variable] = m.column;
      if (m.customValue) newCustom[m.variable] = m.customValue;
      if (m.targetField) newTargets[m.variable] = m.targetField;
      if (m.transform) newTransforms[m.variable] = m.transform;
    }
    setManualMappings(newManual);
    setCustomValues(newCustom);
    setTargetFieldMappings(newTargets);
    setTransforms(newTransforms);
    toast({ title: "Profile loaded", description: `"${profile.name}" applied.` });
  };

  // ─── Computed mapping ────────────────────────────────────────────

  const resolvedMapping: MappingEntry[] = useMemo(() => {
    return templateVars.map(v => {
      if (customValues[v]) return { variable: v, column: null, customValue: customValues[v], targetField: targetFieldMappings[v], transform: transforms[v] };
      if (manualMappings[v] && csvHeaders.includes(manualMappings[v])) return { variable: v, column: manualMappings[v], targetField: targetFieldMappings[v], transform: transforms[v] };
      const vLower = v.toLowerCase();
      const exact = csvHeaders.find(h => h.toLowerCase() === vLower);
      if (exact) return { variable: v, column: exact, targetField: targetFieldMappings[v], transform: transforms[v] };
      const fuzzy = csvHeaders.find(h => h.toLowerCase().includes(vLower) || vLower.includes(h.toLowerCase()));
      return { variable: v, column: fuzzy || null, targetField: targetFieldMappings[v], transform: transforms[v] };
    });
  }, [templateVars, csvHeaders, manualMappings, customValues, targetFieldMappings, transforms]);

  const allMatched = resolvedMapping.every(m => m.column || m.customValue || isSpecialVar(m.variable));
  const unmatchedColumns = csvHeaders.filter(h => !resolvedMapping.some(m => m.column === h));

  // ─── Filtered target fields by campaign type ─────────────────────

  const relevantTargets = useMemo(() => {
    return TARGET_FIELDS.filter(f => {
      if (f.category === "content" || f.category === "seo") return true;
      if (f.category === "sea") return campaignTypes.includes("sea");
      if (f.category === "geo") return campaignTypes.includes("geo");
      return true;
    });
  }, [campaignTypes]);

  // ─── CMS mandatory validation ────────────────────────────────────

  const mandatoryWarnings = useMemo(() => {
    const warnings: string[] = [];
    const mappedTargets = new Set(Object.values(targetFieldMappings).filter(Boolean));
    const hasTitle = resolvedMapping.some(m => (m.column || m.customValue) && ["title", "name", "h1", "page_title"].includes(m.variable.toLowerCase()));
    if (!hasTitle) warnings.push("No title/name variable is mapped — pages may have generic titles.");

    if (websiteType === "wordpress") {
      if (!mappedTargets.has("slug") && !resolvedMapping.some(m => (m.column || m.customValue) && m.variable.toLowerCase() === "slug"))
        warnings.push("WordPress: Slug mapping recommended for clean URLs.");
    }
    if (websiteType === "shopify") {
      const hasPrice = resolvedMapping.some(m => (m.column || m.customValue) && m.variable.toLowerCase().includes("price"));
      if (!hasPrice) warnings.push("Shopify: Price variable recommended for product pages.");
    }
    return warnings;
  }, [resolvedMapping, targetFieldMappings, websiteType]);

  // ─── Filter by category ──────────────────────────────────────────

  const filteredMapping = useMemo(() => {
    if (filterCategory === "all") return resolvedMapping;
    return resolvedMapping.filter(m => {
      const target = targetFieldMappings[m.variable];
      if (!target) return filterCategory === "all";
      const field = TARGET_FIELDS.find(f => f.key === target);
      return field?.category === filterCategory;
    });
  }, [resolvedMapping, filterCategory, targetFieldMappings]);

  if (templateVars.length === 0 || csvHeaders.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 sticky top-0 z-10 bg-muted/20 backdrop-blur-sm -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 -mt-3 sm:-mt-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Column Mapping</h4>
          {allMatched ? (
            <Badge variant="secondary" className="bg-success/10 text-success text-[10px] border-success/20 border">
              <Check className="h-3 w-3 mr-1" /> All matched
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px] border-destructive/20 border">
              <AlertTriangle className="h-3 w-3 mr-1" /> Unmatched
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {profiles.length > 0 && (
            <Select onValueChange={(id) => { const p = profiles.find((pr: any) => pr.id === id); if (p) loadProfile(p); }}>
              <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg">
                <FolderOpen className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Load profile…" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p: any) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{p.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1 rounded-lg" onClick={() => setProfileDialogOpen(true)}>
            <Save className="h-3 w-3" /> Save
          </Button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          All ({resolvedMapping.length})
        </button>
        {Object.entries(CATEGORY_META).filter(([k]) => k !== "custom").map(([key, meta]) => {
          const count = resolvedMapping.filter(m => {
            const t = targetFieldMappings[m.variable];
            const f = TARGET_FIELDS.find(tf => tf.key === t);
            return f?.category === key;
          }).length;
          if (key === "sea" && !campaignTypes.includes("sea")) return null;
          if (key === "geo" && !campaignTypes.includes("geo")) return null;
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filterCategory === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <meta.icon className="h-3 w-3 inline mr-1" />
              {meta.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* CMS / Mandatory warnings */}
      {mandatoryWarnings.length > 0 && (
        <div className="space-y-1.5">
          {mandatoryWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mapping rows — Two-column layout */}
      <div className="space-y-2.5">
        {/* Column headers */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr_140px_100px] gap-2 px-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          <span>Template Variable</span>
          <span></span>
          <span>CSV Column / Value</span>
          <span>Map To</span>
          <span>Transform</span>
        </div>

        {filteredMapping.map(({ variable, column, customValue, targetField, transform }) => {
          const isAiBlock = variable.toLowerCase().startsWith("ai:") || variable.toLowerCase().startsWith("ai_image:");
          const isSchemaBlock = variable.includes("@context") || variable.includes("@type") || variable.includes("schema.org");
          const isSpecial = isAiBlock || isSchemaBlock;

          return (
            <div key={variable} className="rounded-lg border border-border/60 bg-background/50 p-2.5 sm:p-3">
              {/* Mobile: stacked, Desktop: grid */}
              <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr_140px_100px] gap-2 sm:items-center">
                {/* Variable name */}
                <Badge variant="outline" className="font-mono shrink-0 rounded-lg text-[11px] py-1 px-2 w-fit" title={`{${variable}}`}>
                  {`{${variable}}`}
                </Badge>

                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 hidden sm:block" />

                {/* Column mapping / Custom value */}
                <div className="space-y-1.5">
                  {isSpecial && !column && !(variable in customValues) ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary font-mono rounded-lg text-[11px] py-1 px-2">
                      <Check className="h-3 w-3 mr-1" /> Auto-generated
                    </Badge>
                  ) : variable in customValues ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-8 text-xs rounded-lg border-primary/30 focus:border-primary flex-1"
                        placeholder="Custom value…"
                        value={customValues[variable] || ""}
                        onChange={e => {
                          setCustomValues(prev => ({ ...prev, [variable]: e.target.value }));
                          if (e.target.value) setManualMappings(prev => { const next = { ...prev }; delete next[variable]; return next; });
                        }}
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setCustomValues(prev => { const next = { ...prev }; delete next[variable]; return next; })}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : column ? (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="bg-success/10 text-success font-mono rounded-lg text-[11px] py-1 px-2">
                        <Check className="h-3 w-3 mr-1" /> {column}
                      </Badge>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setManualMappings(prev => ({ ...prev, [variable]: "__none__" }))}>
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Select
                        value={manualMappings[variable] || ""}
                        onValueChange={val => {
                          if (val === "__custom__") {
                            setCustomValues(prev => ({ ...prev, [variable]: "" }));
                            setManualMappings(prev => { const next = { ...prev }; delete next[variable]; return next; });
                          } else {
                            setManualMappings(prev => ({ ...prev, [variable]: val }));
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-full text-xs rounded-lg border-destructive/40 bg-destructive/5">
                          <SelectValue placeholder="Select column…" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvHeaders.map(h => (
                            <SelectItem key={h} value={h} className="text-xs font-mono">{h}</SelectItem>
                          ))}
                          <SelectItem value="__custom__" className="text-xs italic text-primary">✎ Custom value…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Target field */}
                <Select
                  value={targetFieldMappings[variable] || "__auto__"}
                  onValueChange={val => {
                    if (val === "__auto__") {
                      setTargetFieldMappings(prev => {
                        const next = { ...prev };
                        delete next[variable];
                        return next;
                      });
                      return;
                    }

                    setTargetFieldMappings(prev => ({ ...prev, [variable]: val }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue placeholder="Target…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__" className="text-xs italic text-muted-foreground">Auto (template)</SelectItem>
                    {Object.entries(CATEGORY_META).filter(([k]) => k !== "custom").map(([catKey, catMeta]) => {
                      const fields = relevantTargets.filter(f => f.category === catKey);
                      if (fields.length === 0) return null;
                      return fields.map(f => (
                        <SelectItem key={f.key} value={f.key} className="text-xs">
                          <span className={`${catMeta.color} mr-1`}>●</span> {f.label}
                        </SelectItem>
                      ));
                    })}
                  </SelectContent>
                </Select>

                {/* Transform */}
                <Select
                  value={transforms[variable] || ""}
                  onValueChange={val => setTransforms(prev => ({ ...prev, [variable]: val }))}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSFORMS.map(t => (
                      <SelectItem key={t.value} value={t.value || "__none__"} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unmapped CSV columns */}
      {unmatchedColumns.length > 0 && (
        <div className="text-xs bg-muted/50 border border-border rounded-lg px-3 py-2">
          <p className="font-medium text-muted-foreground mb-1">
            Unused CSV columns ({unmatchedColumns.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unmatchedColumns.map(h => (
              <Badge key={h} variant="outline" className="text-[10px] font-mono">{h}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Save Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Mapping Profile</DialogTitle>
            <DialogDescription>Save this mapping configuration to reuse in other campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Profile Name</Label>
              <Input
                value={saveProfileName}
                onChange={e => setSaveProfileName(e.target.value)}
                placeholder="e.g. Real Estate SEO Mapping"
                className="mt-1.5"
              />
            </div>

            {/* Existing profiles */}
            {profiles.length > 0 && (
              <div>
                <Label className="text-sm text-muted-foreground">Existing Profiles</Label>
                <div className="mt-1.5 space-y-1.5 max-h-32 overflow-y-auto">
                  {profiles.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-xs">
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground ml-2">{p.campaign_type?.toUpperCase()}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteProfileMutation.mutate(p.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
              <Button
                disabled={!saveProfileName.trim() || saveProfileMutation.isPending}
                onClick={() => saveProfileMutation.mutate(saveProfileName.trim())}
                className="bg-gradient-primary hover:brightness-110"
              >
                {saveProfileMutation.isPending ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isSpecialVar(variable: string): boolean {
  const v = variable.toLowerCase();
  return v.startsWith("ai:") || v.startsWith("ai_image:") || v.includes("@context") || v.includes("@type") || v.includes("schema");
}
