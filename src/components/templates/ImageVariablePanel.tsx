import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, RotateCcw } from "lucide-react";

interface ImageVariablePanelProps {
  /** Raw template HTML — used to detect which image variables are present. */
  templateContent: string;
  /** Template default values (original image URLs live here). */
  defaultValues?: Record<string, string>;
  /** Current per-variable overrides for image URLs. */
  values: Record<string, string>;
  /** Called when a single image variable changes. */
  onChange: (variable: string, url: string) => void;
  /** Reset all image overrides back to defaults. */
  onReset?: () => void;
  className?: string;
}

/** Human-friendly labels for known Refit image variables. */
const LABELS: Record<string, string> = {
  hero_image: "Hero kitchen photo",
  about_image_1: "About gallery — 1",
  about_image_2: "About gallery — 2",
  about_image_3: "About gallery — 3",
  about_image_4: "About gallery — 4",
  work_1_image: "Project showcase — 1",
  work_2_image: "Project showcase — 2",
  work_3_image: "Project showcase — 3",
  review_1_avatar: "Review thumbnail — 1",
  review_2_avatar: "Review thumbnail — 2",
  review_3_avatar: "Review thumbnail — 3",
};

/** Detect image variables by name convention. */
const isImageVar = (name: string) =>
  /(image|img|photo|avatar|thumbnail|thumb|logo|picture|gallery|banner|hero_)/i.test(name);

const prettify = (v: string) =>
  LABELS[v] ?? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isAvatar = (v: string) => /avatar|thumbnail|thumb/i.test(v);

/**
 * Dedicated panel to swap image URLs (hero, gallery, project, review thumbnails)
 * with a live thumbnail preview for each. Detects image variables straight from
 * the template so it works for any template that uses image placeholders.
 */
export function ImageVariablePanel({
  templateContent,
  defaultValues = {},
  values,
  onChange,
  onReset,
  className = "",
}: ImageVariablePanelProps) {
  const imageVars = useMemo(() => {
    const matches = templateContent.match(/\{([a-z_][a-z0-9_]*?)(?::[\w()., ]+)?\}/gi) || [];
    const set = new Set<string>();
    matches.forEach((m) => {
      const name = m.replace(/^\{/, "").replace(/(:.*?)?\}$/, "").toLowerCase();
      if (isImageVar(name)) set.add(name);
    });
    return Array.from(set);
  }, [templateContent]);

  if (imageVars.length === 0) return null;

  const hasOverrides = imageVars.some(
    (v) => values[v] !== undefined && values[v] !== (defaultValues[v] ?? "")
  );

  return (
    <Card className={`border-0 shadow-surface ${className}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> Image Variables
          </span>
          {hasOverrides && onReset && (
            <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={onReset}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset images
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Paste a new image URL to replace the hero photo, gallery shots or review thumbnails. The preview updates instantly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {imageVars.map((v) => {
            const url = values[v] ?? defaultValues[v] ?? "";
            return (
              <div key={v} className="flex gap-3 items-start p-2.5 rounded-lg border border-border bg-muted/30">
                <div
                  className={`flex-none overflow-hidden bg-muted border border-border ${
                    isAvatar(v) ? "h-12 w-12 rounded-full" : "h-16 w-16 rounded-md"
                  }`}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={prettify(v)}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                      }}
                      onLoad={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility = "visible";
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <Label className="text-[11px] font-medium text-foreground block truncate">
                    {prettify(v)}
                  </Label>
                  <code className="text-[10px] text-muted-foreground font-mono block truncate">{`{${v}}`}</code>
                  <Input
                    className="h-7 text-xs"
                    value={url}
                    onChange={(e) => onChange(v, e.target.value)}
                    placeholder="https://image-url..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
