import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon, RotateCcw, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageCropDialog } from "@/components/templates/ImageCropDialog";

/**
 * Target aspect ratios (width / height) per image slot so cropping matches the
 * rendered layout. Falls back to 4:3 for any unknown image variable.
 */
const ASPECT_RATIOS: Record<string, number> = {
  hero_image_1: 3 / 4,
  hero_image_2: 1,
  hero_image_3: 1,
  menu_1_image: 3 / 4,
  menu_2_image: 3 / 4,
  menu_3_image: 3 / 4,
  chef_image: 4 / 5,
  testimonial_image: 1,
  book_image: 4 / 3,
  // Cevira cleaning
  hero_image: 16 / 9,
  about_image: 3 / 4,
  service_1_image: 7 / 5,
  service_2_image: 7 / 5,
  service_3_image: 7 / 5,
  service_4_image: 7 / 5,
  cta_image: 16 / 9,
};

const aspectFor = (v: string) => {
  if (ASPECT_RATIOS[v]) return ASPECT_RATIOS[v];
  if (/avatar|thumbnail|thumb/i.test(v)) return 1;
  return 4 / 3;
};

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
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeVarRef = useRef<string | null>(null);
  const [cropState, setCropState] = useState<{ variable: string; src: string } | null>(null);
  const [uploadingVar, setUploadingVar] = useState<string | null>(null);

  const imageVars = useMemo(() => {
    const matches = templateContent.match(/\{([a-z_][a-z0-9_]*?)(?::[\w()., ]+)?\}/gi) || [];
    const set = new Set<string>();
    matches.forEach((m) => {
      const name = m.replace(/^\{/, "").replace(/(:.*?)?\}$/, "").toLowerCase();
      if (isImageVar(name)) set.add(name);
    });
    return Array.from(set);
  }, [templateContent]);

  const pickFile = (variable: string) => {
    activeVarRef.current = variable;
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const variable = activeVarRef.current;
    e.target.value = "";
    if (!file || !variable) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Not an image", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    const src = URL.createObjectURL(file);
    setCropState({ variable, src });
  };

  const handleCropped = async (blob: Blob) => {
    if (!cropState) return;
    const variable = cropState.variable;
    setUploadingVar(variable);
    try {
      if (blob.size === 0) {
        throw new Error("The cropped image is empty. Try re-cropping the photo.");
      }
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error("Cropped image is larger than 10MB. Zoom out or pick a smaller photo.");
      }
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw new Error("Could not verify your session. Please sign in again.");
      const uid = auth.user?.id;
      if (!uid) throw new Error("You're not signed in. Please sign in to upload images.");
      const path = `${uid}/template-images/${variable}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("ai-images")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) {
        const msg = error.message || "";
        if (/exceeded|too large|payload/i.test(msg)) {
          throw new Error("File exceeds the storage size limit. Try a smaller image.");
        }
        if (/permission|unauthorized|row-level|policy/i.test(msg)) {
          throw new Error("You don't have permission to upload here. Please sign in again.");
        }
        if (/network|fetch|failed to/i.test(msg)) {
          throw new Error("Network error during upload. Check your connection and retry.");
        }
        throw new Error(msg || "Storage upload failed.");
      }
      const { data } = supabase.storage.from("ai-images").getPublicUrl(path);
      onChange(variable, data.publicUrl);
      toast({ title: "Image updated", description: "Your cropped image was uploaded." });
      URL.revokeObjectURL(cropState.src);
      setCropState(null);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload image.",
        variant: "destructive",
      });
      // Re-throw so the crop dialog surfaces the error inline with a Retry button.
      throw err instanceof Error ? err : new Error("Could not upload image.");
    } finally {
      setUploadingVar(null);
    }
  };

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileSelected}
        />
        <p className="text-xs text-muted-foreground">
          Upload &amp; crop a new image, or paste an image URL. Each slot crops to the right aspect ratio so the layout stays intact.
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
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Label className="text-[11px] font-medium text-foreground block truncate">
                    {prettify(v)}
                  </Label>
                  <code className="text-[10px] text-muted-foreground font-mono block truncate">{`{${v}}`}</code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-full text-[11px]"
                    disabled={uploadingVar === v}
                    onClick={() => pickFile(v)}
                  >
                    {uploadingVar === v ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3 mr-1" />
                    )}
                    {uploadingVar === v ? "Uploading…" : "Upload & crop"}
                  </Button>
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

      {cropState && (
        <ImageCropDialog
          open={!!cropState}
          onOpenChange={(o) => {
            if (!o) {
              URL.revokeObjectURL(cropState.src);
              setCropState(null);
            }
          }}
          imageSrc={cropState.src}
          aspect={aspectFor(cropState.variable)}
          label={prettify(cropState.variable)}
          onCropped={handleCropped}
          isSaving={uploadingVar === cropState.variable}
        />
      )}
    </Card>
  );
}
