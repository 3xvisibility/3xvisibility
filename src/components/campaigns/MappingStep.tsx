import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowRight, Check, AlertTriangle, X, Save, FolderOpen, Trash2,
  ArrowDownAZ, Hash, Link2, Type, MapPin, Target, Search as SearchIcon,
  HelpCircle, Sparkles, Lightbulb, Wand2, Loader2, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FaqMappingPanel, type FaqPair } from "./FaqMappingPanel";

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
  /** FAQ mapping — optional. When provided, renders the FAQ column mapper. */
  faqPairs?: FaqPair[];
  setFaqPairs?: React.Dispatch<React.SetStateAction<FaqPair[]>>;
  /** AI auto-fill context — when provided, enables the "AI Fill" button that
   *  generates values for unmapped variables using niche/services context. */
  aiContext?: { business?: string; niche?: string; service?: string };
  /** Target language for AI-generated values (e.g. "fr"). Defaults to English. */
  aiLanguage?: string;
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
  faqPairs,
  setFaqPairs,
  aiContext,
  aiLanguage,
}: MappingStepProps) {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [saveProfileName, setSaveProfileName] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [aiFilling, setAiFilling] = useState(false);
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

  // ─── Auto-Map: commit smart suggestions to manualMappings ────────

  const norm = (s: string) => s.toLowerCase().replace(/[\s\-_./]+/g, "");

  const SYNONYMS: Record<string, string[]> = {
    title: ["title", "name", "heading", "h1", "pagetitle", "producttitle", "productname"],
    name: ["name", "title", "fullname", "businessname", "company"],
    slug: ["slug", "url", "permalink", "handle", "path"],
    content: ["content", "body", "description", "text", "article", "bodyhtml"],
    excerpt: ["excerpt", "summary", "teaser", "shortdescription"],
    description: ["description", "desc", "summary", "about"],
    keyword: ["keyword", "kw", "primarykeyword", "focuskeyword"],
    service: ["service", "serviceoffered", "offering"],
    category: ["category", "cat", "type", "section"],
    tags: ["tags", "tag", "labels"],
    author: ["author", "writtenby", "by"],
    date: ["date", "publishdate", "createdat", "publishedat"],
    price: ["price", "cost", "amount", "regularprice"],
    city: ["city", "town", "locality"],
    region: ["region", "state", "province"],
    country: ["country", "nation"],
    postcode: ["postcode", "postalcode", "zip", "zipcode"],
    latitude: ["latitude", "lat"],
    longitude: ["longitude", "lng", "lon", "long"],
  };

  const scoreMatch = (variable: string, header: string): number => {
    const v = norm(variable);
    const h = norm(header);
    if (!v || !h) return 0;
    if (v === h) return 100;
    const syns = SYNONYMS[variable.toLowerCase()] || [];
    if (syns.includes(h)) return 95;
    for (const [key, list] of Object.entries(SYNONYMS)) {
      if (list.includes(v) && list.includes(h)) return 90;
      if (norm(key) === v && list.includes(h)) return 90;
    }
    if (v.includes(h) || h.includes(v)) return 70 + Math.min(20, Math.min(v.length, h.length));
    // token overlap
    const vTokens = variable.toLowerCase().split(/[\s\-_./]+/).filter(Boolean);
    const hTokens = header.toLowerCase().split(/[\s\-_./]+/).filter(Boolean);
    const overlap = vTokens.filter(t => hTokens.includes(t)).length;
    if (overlap > 0) return 50 + overlap * 10;
    return 0;
  };

  const handleAutoMap = () => {
    const used = new Set<string>();
    const newMappings: Record<string, string> = {};
    let confirmed = 0;
    let overridden = 0;

    // Pass 1: collect best candidate per variable
    const candidates: Array<{ v: string; h: string; score: number }> = [];
    for (const v of templateVars) {
      if (customValues[v]) continue; // skip variables with explicit custom value
      let best: { h: string; score: number } | null = null;
      for (const h of csvHeaders) {
        const s = scoreMatch(v, h);
        if (s > 0 && (!best || s > best.score)) best = { h, score: s };
      }
      if (best && best.score >= 50) candidates.push({ v, h: best.h, score: best.score });
    }
    // Sort by score desc so strongest matches reserve their column first
    candidates.sort((a, b) => b.score - a.score);
    for (const c of candidates) {
      if (used.has(c.h)) continue;
      newMappings[c.v] = c.h;
      used.add(c.h);
      if (manualMappings[c.v] && manualMappings[c.v] !== c.h && manualMappings[c.v] !== "__none__") overridden++;
      confirmed++;
    }

    if (confirmed === 0) {
      toast({
        title: "No matches found",
        description: "We couldn't auto-map any CSV columns. Map them manually below.",
        variant: "destructive",
      });
      return;
    }

    setManualMappings(prev => ({ ...prev, ...newMappings }));
    toast({
      title: `Auto-mapped ${confirmed} variable${confirmed === 1 ? "" : "s"}`,
      description: overridden > 0
        ? `${overridden} previous mapping${overridden === 1 ? "" : "s"} updated. Review and edit below.`
        : "Review the suggested mappings below — edit any if needed.",
    });
  };

  // Count how many auto-map suggestions are available (and not yet manually set)
  const autoMapSuggestionCount = useMemo(() => {
    const used = new Set<string>();
    const candidates: Array<{ v: string; h: string; score: number }> = [];
    for (const v of templateVars) {
      if (customValues[v]) continue;
      let best: { h: string; score: number } | null = null;
      for (const h of csvHeaders) {
        const s = scoreMatch(v, h);
        if (s > 0 && (!best || s > best.score)) best = { h, score: s };
      }
      if (best && best.score >= 50) candidates.push({ v, h: best.h, score: best.score });
    }
    candidates.sort((a, b) => b.score - a.score);
    let count = 0;
    for (const c of candidates) {
      if (used.has(c.h)) continue;
      used.add(c.h);
      if (manualMappings[c.v] !== c.h) count++;
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateVars, csvHeaders, customValues, manualMappings]);

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
  const autoMappedCount = resolvedMapping.filter(m => m.column && !manualMappings[m.variable] && !customValues[m.variable]).length;
  const unmatchedCount = resolvedMapping.filter(m => !m.column && !m.customValue && !isSpecialVar(m.variable)).length;

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

  // ─── AI Fill: variables eligible for on-demand AI generation ─────
  // Excludes variables that are already mapped (CSV / custom) and any
  // special tokens like {AI:…}, {MAP:…}, {YOUTUBE:…} etc.
  const aiFillCandidates = useMemo(() => {
    const reservedPrefixes = ["AI:", "AI_IMAGE:", "MAP:", "YOUTUBE:", "IMAGE:", "WEATHER:", "GEO_BLOCKS"];
    return resolvedMapping
      .filter(m => !m.column && !m.customValue)
      .filter(m => {
        const v = m.variable;
        if (!v || v.includes(":")) return false;
        if (reservedPrefixes.some(p => v.toUpperCase().startsWith(p))) return false;
        return !isSpecialVar(v);
      })
      .map(m => m.variable);
  }, [resolvedMapping]);

  const hasAiContext = !!(aiContext?.business || aiContext?.niche || aiContext?.service);
  const canAiFill = aiFillCandidates.length > 0 && hasAiContext;

  const handleAiFill = async () => {
    if (aiFillCandidates.length === 0) {
      toast({ title: "Nothing to fill", description: "Every variable is already mapped or has a custom value." });
      return;
    }
    if (!hasAiContext) {
      toast({
        title: "Add business context first",
        description: "Fill in business, niche, or services in the AI auto-fill card above so the AI knows what to generate.",
        variant: "destructive",
      });
      return;
    }
    setAiFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-fill-variables", {
        body: {
          variables: aiFillCandidates,
          context: aiContext,
          settings: { language: aiLanguage || "en", tone: "professional", contentLength: "medium" },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const values = (data?.values || {}) as Record<string, string>;
      const filledKeys = Object.keys(values);
      if (filledKeys.length === 0) {
        toast({ title: "No values generated", description: "The AI returned no usable values — try refining your niche/services.", variant: "destructive" });
        return;
      }
      setCustomValues(prev => ({ ...prev, ...values }));
      toast({
        title: "AI filled " + filledKeys.length + " variable(s)",
        description: filledKeys.join(", "),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI fill failed";
      toast({ title: "AI fill failed", description: msg, variant: "destructive" });
    } finally {
      setAiFilling(false);
    }
  };

  if (templateVars.length === 0 || csvHeaders.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-4 overflow-hidden">
      {/* ─── How it works intro with visual flow ─────────── */}
      <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/0 p-3 sm:p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="rounded-md bg-primary/10 p-1.5 shrink-0">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <h5 className="text-sm font-semibold flex items-center gap-2 flex-wrap">
              How Mapping Works
              <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] h-5">Auto-matched</Badge>
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mapping connects <strong className="text-foreground">your CSV data</strong> to <strong className="text-foreground">template placeholders</strong>.
              Each row in your CSV becomes one generated page.
            </p>
          </div>
        </div>

        {/* Visual flow diagram: CSV → Variable → Page */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 sm:gap-1.5 items-center bg-background/60 rounded-lg p-2.5 border border-border/40">
          {/* CSV source */}
          <div className="rounded-md border border-success/30 bg-success/5 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wider text-success font-semibold mb-1">1. Your CSV</div>
            <code className="text-[11px] font-mono text-foreground block truncate" title={csvHeaders[0] || "city"}>
              {csvHeaders[0] || "city"}
            </code>
            <div className="text-[9px] text-muted-foreground mt-0.5">column name</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto rotate-90 sm:rotate-0" />
          {/* Template variable */}
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wider text-primary font-semibold mb-1">2. Template</div>
            <code className="text-[11px] font-mono text-foreground block truncate">
              {`{${csvHeaders[0] || "city"}}`}
            </code>
            <div className="text-[9px] text-muted-foreground mt-0.5">placeholder</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto rotate-90 sm:rotate-0" />
          {/* Final page */}
          <div className="rounded-md border border-warning/30 bg-warning/5 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wider text-warning font-semibold mb-1">3. Live Page</div>
            <code className="text-[11px] font-mono text-foreground block truncate">
              "New York"
            </code>
            <div className="text-[9px] text-muted-foreground mt-0.5">real value</div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] gap-1 bg-success/5 border-success/30 text-success">
            <Wand2 className="h-2.5 w-2.5" /> {autoMappedCount} auto-matched
          </Badge>
          {unmatchedCount > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/5 border-destructive/30 text-destructive">
              <AlertTriangle className="h-2.5 w-2.5" /> {unmatchedCount} need your attention
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] gap-1">
            <Hash className="h-2.5 w-2.5" /> {csvHeaders.length} CSV columns available
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Type className="h-2.5 w-2.5" /> {templateVars.length} template variables
          </Badge>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 sticky top-0 z-10 bg-muted/20 backdrop-blur-sm -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Variable Mapping</h4>
          {allMatched ? (
            <Badge variant="secondary" className="bg-success/10 text-success text-[10px] border-success/20 border">
              <Check className="h-3 w-3 mr-1" /> All set
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px] border-destructive/20 border">
              <AlertTriangle className="h-3 w-3 mr-1" /> {unmatchedCount} unmapped
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 rounded-lg border-success/40 text-success hover:bg-success/10 disabled:opacity-50"
                  onClick={handleAutoMap}
                  disabled={csvHeaders.length === 0 || templateVars.length === 0}
                >
                  <Zap className="h-3 w-3" />
                  Auto-Map
                  {autoMapSuggestionCount > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5 bg-success/15 text-success border-0">
                      {autoMapSuggestionCount}
                    </Badge>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {csvHeaders.length === 0
                ? "Upload a CSV first to enable auto-mapping."
                : autoMapSuggestionCount === 0
                ? "All possible matches are already applied. Edit any mapping below if needed."
                : `Auto-match ${autoMapSuggestionCount} CSV column${autoMapSuggestionCount === 1 ? "" : "s"} to template variables. You can edit any mapping after.`}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 rounded-lg border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
                  onClick={handleAiFill}
                  disabled={aiFilling || aiFillCandidates.length === 0 || !hasAiContext}
                >
                  {aiFilling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  AI Fill
                  {aiFillCandidates.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5 bg-primary/15 text-primary border-0">
                      {aiFillCandidates.length}
                    </Badge>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {!canAiFill && aiFillCandidates.length === 0
                ? "All variables are already mapped or have a custom value."
                : !hasAiContext
                ? "Add business / niche / services context in the AI auto-fill card above to enable AI Fill."
                : `Generate values for ${aiFillCandidates.length} unmapped variable(s) using your niche & services context. Each row will reuse the same value.`}
            </TooltipContent>
          </Tooltip>
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
          <span className="flex items-center gap-1">
            Template Variable
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 cursor-help opacity-60 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Placeholders like <code className="font-mono">{`{city}`}</code> in your template that get replaced with real data.
              </TooltipContent>
            </Tooltip>
          </span>
          <span></span>
          <span className="flex items-center gap-1">
            Where data comes from
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 cursor-help opacity-60 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Pick a CSV column (e.g. <span className="font-mono">city</span>) or set a fixed custom value used for every page.
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="flex items-center gap-1">
            Map to (optional)
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 cursor-help opacity-60 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Tell the CMS what this is — e.g. SEO meta title, GEO city, or product price. Auto = used as plain template variable only.
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="flex items-center gap-1">
            Transform
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 cursor-help opacity-60 hover:opacity-100" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Optional formatting: lowercase, slugify, truncate, etc.
              </TooltipContent>
            </Tooltip>
          </span>
        </div>

        {filteredMapping.map(({ variable, column, customValue, targetField, transform }) => {
          const isAiBlock = variable.toLowerCase().startsWith("ai:") || variable.toLowerCase().startsWith("ai_image:");
          const isSchemaBlock = variable.includes("@context") || variable.includes("@type") || variable.includes("schema.org");
          const isSpecial = isAiBlock || isSchemaBlock;

          return (
            <div key={variable} className="rounded-lg border border-border/60 bg-background/50 p-2.5 sm:p-3">
              {/* Mobile: stacked, Desktop: grid */}
              <div className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr_140px_100px] gap-2 sm:items-center">
                {/* Variable name with inline help */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge variant="outline" className="font-mono shrink-0 rounded-lg text-[11px] py-1 px-2 w-fit truncate" title={`{${variable}}`}>
                    {`{${variable}}`}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs space-y-1.5">
                      <p className="font-medium">{`{${variable}}`} placeholder</p>
                      <p className="text-muted-foreground">
                        This will be replaced with data on every generated page.
                      </p>
                      <div className="pt-1 border-t border-border/50">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Example</p>
                        <p className="font-mono text-[11px]">
                          CSV column <span className="text-success">"{csvHeaders.find(h => h.toLowerCase() === variable.toLowerCase()) || variable}"</span> → <span className="text-primary">{`{${variable}}`}</span>
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>

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
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="__auto__" className="text-xs italic text-muted-foreground">Auto (template)</SelectItem>
                    {/* Core categories */}
                    {Object.entries(CATEGORY_META).filter(([k]) => k !== "custom").map(([catKey, catMeta]) => {
                      const fields = relevantTargets.filter(f => f.category === catKey);
                      if (fields.length === 0) return null;
                      return (
                        <SelectGroup key={catKey}>
                          <SelectLabel className="text-[10px] uppercase tracking-wider">{catMeta.label}</SelectLabel>
                          {fields.map(f => (
                            <SelectItem key={f.key} value={f.key} className="text-xs">
                              <span className={`${catMeta.color} mr-1`}>●</span> {f.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                    {/* Platform fields grouped by prefix */}
                    {[
                      { prefix: "wp.", label: "WordPress" },
                      { prefix: "woo.", label: "WooCommerce" },
                      { prefix: "shopify.", label: "Shopify" },
                      { prefix: "ps.", label: "PrestaShop" },
                      { prefix: "media.", label: "Media" },
                      { prefix: "biz.", label: "Business" },
                    ].map(({ prefix, label }) => {
                      const fields = TARGET_FIELDS.filter(f => f.key.startsWith(prefix));
                      if (fields.length === 0) return null;
                      return (
                        <SelectGroup key={prefix}>
                          <SelectLabel className="text-[10px] uppercase tracking-wider">{label}</SelectLabel>
                          {fields.map(f => (
                            <SelectItem key={f.key} value={f.key} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
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

      {/* FAQ column mapping (optional, controlled by parent) */}
      {setFaqPairs && (
        <FaqMappingPanel
          csvHeaders={csvHeaders}
          pairs={faqPairs ?? []}
          onChange={(next) => setFaqPairs(next)}
        />
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
