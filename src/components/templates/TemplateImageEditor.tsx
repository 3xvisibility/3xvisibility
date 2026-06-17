import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface TemplateImageEditorProps {
  html: string;
  onChange: (html: string) => void;
}

interface FoundImage {
  url: string;
  /** "img" for <img src> / "bg" for CSS url(...) */
  kind: "img" | "bg";
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB — keep inline data URLs sane

// Extract every distinct image reference from the HTML: <img src> + CSS url(...).
function extractImages(html: string): FoundImage[] {
  const seen = new Map<string, FoundImage>();

  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const url = m[1];
    if (url && !seen.has(url)) seen.set(url, { url, kind: "img" });
  }

  const bgRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = bgRe.exec(html))) {
    const url = m[1];
    if (url && !url.startsWith("data:") && !seen.has(url)) seen.set(url, { url, kind: "bg" });
  }

  return [...seen.values()];
}

// Replace every occurrence of an exact URL across the HTML (img src + CSS url()).
function replaceUrl(html: string, oldUrl: string, newUrl: string): string {
  if (!newUrl || oldUrl === newUrl) return html;
  return html.split(oldUrl).join(newUrl);
}

export function TemplateImageEditor({ html, onChange }: TemplateImageEditorProps) {
  const { toast } = useToast();
  const images = useMemo(() => extractImages(html), [html]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const applyUrl = (oldUrl: string, newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    onChange(replaceUrl(html, oldUrl, trimmed));
    setDrafts((d) => {
      const next = { ...d };
      delete next[oldUrl];
      return next;
    });
    toast({ title: "Image replaced", description: "The template image was updated." });
  };

  const handleFile = (oldUrl: string, file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "Image too large", description: "Please use an image under 2MB or paste a URL.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChange(replaceUrl(html, oldUrl, dataUrl));
      toast({ title: "Image replaced", description: "Your uploaded image is now in the template." });
    };
    reader.readAsDataURL(file);
  };

  if (images.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        <ImageIcon className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No images found in this template.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        🖼️ Replace any image below by pasting a new URL or uploading a file (max 2MB). Changes apply to the template immediately.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {images.map(({ url, kind }) => {
          const draft = drafts[url] ?? "";
          return (
            <div key={url} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="aspect-video w-full overflow-hidden rounded-md bg-muted flex items-center justify-center">
                <img
                  src={url}
                  alt="Template asset"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  {kind === "bg" ? "Background" : "Image"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[60%]" title={url}>
                  {url.startsWith("data:") ? "uploaded image" : url.split("/").pop()}
                </span>
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [url]: e.target.value }))}
                  placeholder="Paste new image URL..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") applyUrl(url, draft); }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 px-2 shrink-0"
                  disabled={!draft.trim()}
                  onClick={() => applyUrl(url, draft)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => (fileInputs.current[url] = el)}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(url, file);
                    e.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-xs"
                  onClick={() => fileInputs.current[url]?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
