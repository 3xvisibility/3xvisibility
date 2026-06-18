import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Link2, AlertCircle, CheckCircle2 } from "lucide-react";
import { applyTemplateDefaults, type MarketplaceTemplate } from "@/lib/marketplace-templates";
import { useBranding } from "@/contexts/BrandingContext";

/** Turn arbitrary text into a clean URL slug. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

const BRAND_NAME_KEYS = [
  "company_name",
  "brand_name",
  "firm_name",
  "business_name",
  "restaurant_name",
  "clinic_name",
  "product_name",
  "site_name",
  "website_name",
  "agency_name",
  "store_name",
];

interface SeoDefaultsEditorProps {
  template: MarketplaceTemplate;
}

/**
 * Editable SEO defaults (title, meta description, page slug) for a marketplace
 * template. Patterns are resolved with the template's defaultValues so the
 * generated page starts with correct, ready-to-edit SEO metadata.
 */
export function SeoDefaultsEditor({ template }: SeoDefaultsEditorProps) {
  const { appName } = useBranding();

  const defaults = useMemo(() => {
    // Override the template's placeholder brand defaults (e.g. "Lums") with the
    // user's own company / brand / website name so the SEO title suffix and slug
    // reflect their business instead of the template theme.
    const brandName = (appName || "").trim();
    const dv = { ...template.defaultValues } as Record<string, string>;
    if (brandName) {
      for (const key of BRAND_NAME_KEYS) {
        if (key in dv) dv[key] = brandName;
      }
    }
    const rawTitle = applyTemplateDefaults(template.seo_title_pattern ?? template.name, dv).trim();
    const rawDesc = applyTemplateDefaults(template.seo_description_pattern ?? template.description, dv).trim();
    const rawSlug = applyTemplateDefaults(template.slug_pattern ?? template.name, dv);

    const titleHasBrand = brandName && new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(rawTitle);
    return {
      title: brandName && !titleHasBrand ? `${rawTitle} — ${brandName}` : rawTitle,
      description: brandName && !rawDesc.toLowerCase().includes(brandName.toLowerCase())
        ? `${rawDesc} ${brandName}.`.trim()
        : rawDesc,
      slug: slugify(brandName ? `${rawSlug} ${brandName}` : rawSlug),
    };
  }, [template, appName]);

  const [title, setTitle] = useState(defaults.title);
  const [description, setDescription] = useState(defaults.description);
  const [slug, setSlug] = useState(defaults.slug);

  // Re-seed when a different template is opened.
  useEffect(() => {
    setTitle(defaults.title);
    setDescription(defaults.description);
    setSlug(defaults.slug);
  }, [defaults]);

  const titleLen = title.length;
  const descLen = description.length;
  const titleOk = titleLen >= 20 && titleLen <= 60;
  const descOk = descLen >= 70 && descLen <= 160;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">SEO defaults</span>
      </div>

      {/* SEO title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="seo-title" className="text-xs font-medium">SEO title</Label>
          <span className={`text-[10px] flex items-center gap-1 ${titleOk ? "text-green-600" : "text-amber-600"}`}>
            {titleOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {titleLen}/60
          </span>
        </div>
        <Input id="seo-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
      </div>

      {/* Meta description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="seo-desc" className="text-xs font-medium">Meta description</Label>
          <span className={`text-[10px] flex items-center gap-1 ${descOk ? "text-green-600" : "text-amber-600"}`}>
            {descOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {descLen}/160
          </span>
        </div>
        <Textarea id="seo-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-sm resize-none" />
      </div>

      {/* Page slug */}
      <div className="space-y-1">
        <Label htmlFor="seo-slug" className="text-xs font-medium">Page slug</Label>
        <div className="flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-none" />
          <Input
            id="seo-slug"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            onBlur={(e) => setSlug(slugify(e.target.value))}
            className="h-8 text-sm font-mono"
          />
        </div>
        <p className="text-[10px] text-muted-foreground truncate">/{slug || "your-page"}</p>
      </div>

      {/* Live Google-style preview */}
      <div className="rounded-md border border-border bg-background p-3">
        <p className="text-[11px] text-muted-foreground truncate">example.com › {slug || "your-page"}</p>
        <p className="text-[15px] text-[#1a0dab] dark:text-blue-400 leading-snug truncate">{title || "Untitled page"}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{description || "No meta description set."}</p>
      </div>
    </div>
  );
}
