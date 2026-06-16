import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  RotateCcw,
  Megaphone,
  BarChart3,
  Briefcase,
  MessageSquareQuote,
  Sparkles,
  Type,
} from "lucide-react";

interface ContentFieldsPanelProps {
  /** Raw template HTML — used to detect which text variables are present. */
  templateContent: string;
  /** Template default values (original copy lives here). */
  defaultValues?: Record<string, string>;
  /** Current per-variable overrides for text content. */
  values: Record<string, string>;
  /** Called when a single text variable changes. */
  onChange: (variable: string, value: string) => void;
  /** Reset all text overrides back to defaults. */
  onReset?: () => void;
  className?: string;
}

/** Image-like variables are handled by ImageVariablePanel — skip them here. */
const isImageVar = (name: string) =>
  /(image|img|photo|avatar|thumbnail|thumb|logo|picture|gallery|banner|hero_image)/i.test(name);

const prettify = (v: string) =>
  v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Long-form fields render as a textarea instead of a single-line input. */
const isLongText = (name: string) =>
  /(subtitle|description|desc|body|quote|testimonial|intro|content|paragraph|about|summary|text)/i.test(name);

type GroupKey = "hero" | "stats" | "services" | "testimonials" | "cta" | "other";

interface GroupDef {
  key: GroupKey;
  label: string;
  icon: typeof Megaphone;
  match: (name: string) => boolean;
}

const GROUPS: GroupDef[] = [
  { key: "hero", label: "Hero", icon: Megaphone, match: (n) => /hero|headline|tagline|subtitle/.test(n) },
  { key: "stats", label: "Stats", icon: BarChart3, match: (n) => /stat|metric|count|number|years|clients/.test(n) },
  { key: "services", label: "Services", icon: Briefcase, match: (n) => /service|feature|offer|practice/.test(n) },
  { key: "testimonials", label: "Testimonials", icon: MessageSquareQuote, match: (n) => /testimonial|review|quote|author|client_name/.test(n) },
  { key: "cta", label: "Call to action", icon: Sparkles, match: (n) => /cta|call_to_action|button|contact|phone|email|address/.test(n) },
  { key: "other", label: "General", icon: Type, match: () => true },
];

const groupFor = (name: string): GroupKey => {
  for (const g of GROUPS) if (g.match(name)) return g.key;
  return "other";
};

/**
 * CMS-style editor for a template's text content. Detects every text variable
 * straight from the template, groups them into Hero / Stats / Services /
 * Testimonials / CTA / General sections, and lets users edit copy inline.
 * Works for any template that uses {variable} placeholders.
 */
export function ContentFieldsPanel({
  templateContent,
  defaultValues = {},
  values,
  onChange,
  onReset,
  className = "",
}: ContentFieldsPanelProps) {
  const textVars = useMemo(() => {
    const matches = templateContent.match(/\{([a-z_][a-z0-9_]*?)(?::[\w()., ]+)?\}/gi) || [];
    const set = new Set<string>();
    matches.forEach((m) => {
      const name = m.replace(/^\{/, "").replace(/(:.*?)?\}$/, "").toLowerCase();
      if (!isImageVar(name)) set.add(name);
    });
    return Array.from(set);
  }, [templateContent]);

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, string[]>();
    textVars.forEach((v) => {
      const key = groupFor(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return GROUPS.map((g) => ({ ...g, vars: map.get(g.key) ?? [] })).filter((g) => g.vars.length > 0);
  }, [textVars]);

  if (textVars.length === 0) return null;

  const hasOverrides = textVars.some(
    (v) => values[v] !== undefined && values[v] !== (defaultValues[v] ?? "")
  );

  return (
    <Card className={`border-0 shadow-surface ${className}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Content Fields
          </span>
          {hasOverrides && onReset && (
            <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={onReset}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset content
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Edit the copy for each section — hero, stats, services, testimonials and the call to action. The preview updates instantly.
        </p>
        {grouped.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">{g.label}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {g.vars.map((v) => {
                  const val = values[v] ?? defaultValues[v] ?? "";
                  const long = isLongText(v);
                  return (
                    <div
                      key={v}
                      className={`space-y-1 ${long ? "sm:col-span-2" : ""}`}
                    >
                      <Label className="text-[11px] font-medium text-foreground block truncate">
                        {prettify(v)}
                      </Label>
                      {long ? (
                        <Textarea
                          className="text-xs resize-none"
                          rows={2}
                          value={val}
                          placeholder={defaultValues[v] ?? ""}
                          onChange={(e) => onChange(v, e.target.value)}
                        />
                      ) : (
                        <Input
                          className="h-8 text-xs"
                          value={val}
                          placeholder={defaultValues[v] ?? ""}
                          onChange={(e) => onChange(v, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
