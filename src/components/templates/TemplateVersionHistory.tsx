import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History, Eye, RotateCcw, Clock } from "lucide-react";
import { TemplatePreview } from "./TemplatePreview";

export interface TemplateVersion {
  id: string;
  content: string;
  name: string;
  variables: string[];
  savedAt: string;
  seo_title_pattern?: string;
  seo_description_pattern?: string;
}

interface TemplateVersionHistoryProps {
  templateId: string;
  onRestore: (version: TemplateVersion) => void;
}

const STORAGE_KEY = "tpl-versions";

function getVersions(templateId: string): TemplateVersion[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return (all[templateId] || []) as TemplateVersion[];
  } catch {
    return [];
  }
}

export function saveVersion(templateId: string, version: Omit<TemplateVersion, "id" | "savedAt">) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const versions = (all[templateId] || []) as TemplateVersion[];
    // Don't save if content hasn't changed
    if (versions.length > 0 && versions[0].content === version.content) return;
    versions.unshift({
      ...version,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    });
    // Keep last 20 versions
    all[templateId] = versions.slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full or unavailable
  }
}

export function TemplateVersionHistory({ templateId, onRestore }: TemplateVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<TemplateVersion | null>(null);
  const versions = getVersions(templateId);

  if (versions.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1.5"
        onClick={() => setOpen(true)}
      >
        <History className="h-3 w-3" /> History ({versions.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Version History
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-3">
            <div className="space-y-2">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{v.name}</span>
                      {i === 0 && <Badge variant="secondary" className="text-[10px]">Latest</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(v.savedAt).toLocaleString()}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(v.variables || []).slice(0, 5).map((vr) => (
                        <Badge key={vr} variant="outline" className="text-[10px] font-mono">{vr}</Badge>
                      ))}
                      {(v.variables || []).length > 5 && (
                        <Badge variant="outline" className="text-[10px]">+{v.variables.length - 5}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-3 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPreviewVersion(v)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        onRestore(v);
                        setOpen(false);
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Version preview dialog */}
      <Dialog open={!!previewVersion} onOpenChange={(v) => !v && setPreviewVersion(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {previewVersion?.name} — {previewVersion && new Date(previewVersion.savedAt).toLocaleString()}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 mt-3">
            {previewVersion && <TemplatePreview html={previewVersion.content} />}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
