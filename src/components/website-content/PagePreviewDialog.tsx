import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { HeadingOutline } from "@/components/HeadingOutline";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: "page" | "product" | "post" | "category";
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
      <DialogContent className="sm:max-w-3xl h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="text-base truncate pr-6">{decodeHtmlEntities(page.title) || "(Untitled)"}</DialogTitle>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
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
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <HeadingOutline html={page.content} hideWhenEmpty className="mb-4" />
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
