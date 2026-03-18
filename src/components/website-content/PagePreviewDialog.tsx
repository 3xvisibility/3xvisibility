import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: "page" | "product";
  status: string;
  content: string;
  excerpt: string;
  modified: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return text;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

interface PagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: ContentItem;
}

export function PagePreviewDialog({ open, onOpenChange, page }: PagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base truncate">{decodeHtmlEntities(page.title) || "(Untitled)"}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] capitalize">{page.type}</Badge>
            <Badge variant="outline" className="text-[10px]">{page.status}</Badge>
            {page.url && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] gap-1 text-muted-foreground"
                onClick={() => window.open(page.url, "_blank")}
              >
                <ExternalLink className="h-3 w-3" /> Visit
              </Button>
            )}
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-3">
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
