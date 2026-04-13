import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PublishWebsiteSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (websiteId: string) => void;
  isPending?: boolean;
  pageCount?: number;
}

export function PublishWebsiteSelector({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  pageCount = 1,
}: PublishWebsiteSelectorProps) {
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const { currentWorkspace } = useWorkspace();

  const { data: websites, isLoading } = useQuery({
    queryKey: ["websites-for-publish", currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("websites")
        .select("id, url, type, name")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Select Website to Publish
          </DialogTitle>
          <DialogDescription>
            {pageCount > 1
              ? `These ${pageCount} pages don't have a website assigned. Select where to publish them.`
              : "This page doesn't have a website assigned. Select where to publish it."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !websites?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No websites configured. Add a website first in the Sites section.
          </p>
        ) : (
          <RadioGroup
            value={selectedWebsite}
            onValueChange={setSelectedWebsite}
            className="space-y-2 max-h-64 overflow-y-auto"
          >
            {websites.map((site) => (
              <Label
                key={site.id}
                htmlFor={`site-${site.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedWebsite === site.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <RadioGroupItem value={site.id} id={`site-${site.id}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {site.name || new URL(site.url).hostname}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {site.type}
                </Badge>
              </Label>
            ))}
          </RadioGroup>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selectedWebsite)}
            disabled={!selectedWebsite || isPending}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing...</>
            ) : (
              "Publish"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
