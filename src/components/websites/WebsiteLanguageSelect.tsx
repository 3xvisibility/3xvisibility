import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Common language options for connected websites. Locking a language here forces
 * every AI publish / republish / SEO optimization to use that language for this
 * site, regardless of the source page or workspace default.
 */
export const SITE_LANGUAGE_OPTIONS = [
  { value: "__auto__", label: "Auto-detect from page content" },
  { value: "English", label: "English" },
  { value: "French", label: "Français (French)" },
  { value: "Spanish", label: "Español (Spanish)" },
  { value: "German", label: "Deutsch (German)" },
  { value: "Italian", label: "Italiano (Italian)" },
  { value: "Portuguese", label: "Português (Portuguese)" },
  { value: "Dutch", label: "Nederlands (Dutch)" },
  { value: "Polish", label: "Polski (Polish)" },
  { value: "Arabic", label: "العربية (Arabic)" },
  { value: "Hindi", label: "हिन्दी (Hindi)" },
  { value: "Bengali", label: "বাংলা (Bengali)" },
  { value: "Chinese", label: "中文 (Chinese)" },
  { value: "Japanese", label: "日本語 (Japanese)" },
  { value: "Korean", label: "한국어 (Korean)" },
  { value: "Russian", label: "Русский (Russian)" },
  { value: "Turkish", label: "Türkçe (Turkish)" },
];

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
}

export function WebsiteLanguageSelect({ value, onChange, id = "site-language" }: Props) {
  const current = value && value.trim().length > 0 ? value : "__auto__";
  return (
    <div>
      <Label htmlFor={id}>Site Language</Label>
      <Select
        value={current}
        onValueChange={(v) => onChange(v === "__auto__" ? null : v)}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Auto-detect from page content" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {SITE_LANGUAGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground mt-1">
        Locks all AI-generated content (titles, descriptions, rewrites) to this language for every page on this site.
      </p>
    </div>
  );
}
