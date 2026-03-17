import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, RefreshCw, Check, Facebook, Linkedin, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SocialCaptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: {
    title: string;
    seo_title?: string | null;
    seo_description?: string | null;
    external_url?: string | null;
  } | null;
}

const toneOptions = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "marketing", label: "Marketing" },
];

const lengthOptions = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

const shareLinks = [
  {
    name: "Facebook",
    icon: Facebook,
    getUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    getUrl: (url: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "X (Twitter)",
    icon: Twitter,
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
];

export default function SocialCaptionDialog({ open, onOpenChange, page }: SocialCaptionDialogProps) {
  const [caption, setCaption] = useState("");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    if (!page) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          title: page.seo_title || page.title,
          description: page.seo_description || "",
          url: page.external_url || "",
          tone,
          length,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCaption(data.caption || "");
    } catch (err: any) {
      toast({ title: "Caption generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Caption copied!" });
  };

  const openShare = (url: string) => {
    window.open(url, "_blank", "width=600,height=400,noopener,noreferrer");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCaption("");
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Social Media Caption</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {page?.seo_title || page?.title}
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lengthOptions.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={generate}
            disabled={loading}
            className="w-full bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : caption ? (
              <><RefreshCw className="h-4 w-4 mr-2" />Regenerate Caption</>
            ) : (
              "Generate Caption"
            )}
          </Button>

          {/* Caption output */}
          {caption && (
            <div className="space-y-3">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="text-sm resize-none"
                placeholder="Your caption will appear here..."
              />

              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={copyCaption}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>

                {page?.external_url && (
                  <div className="flex gap-1">
                    {shareLinks.map((s) => (
                      <Button
                        key={s.name}
                        size="sm"
                        variant="outline"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          openShare(
                            s.name === "X (Twitter)"
                              ? (s.getUrl as (u: string, t: string) => string)(page.external_url!, caption)
                              : (s.getUrl as (u: string) => string)(page.external_url!)
                          )
                        }
                        title={`Share on ${s.name}`}
                      >
                        <s.icon className="h-3.5 w-3.5" />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
