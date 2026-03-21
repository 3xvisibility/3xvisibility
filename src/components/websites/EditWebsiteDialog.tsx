import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type Website = Tables<"websites">;

interface EditWebsiteDialogProps {
  site: Website;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWebsiteDialog({ site, open, onOpenChange }: EditWebsiteDialogProps) {
  const [name, setName] = useState(site.name);
  const [url, setUrl] = useState(site.url);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(site.name);
      setUrl(site.url);
    }
  }, [open, site]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("websites")
        .update({ name, url })
        .eq("id", site.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website updated" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Website</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="edit-name">Site Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-url">Site URL</Label>
            <Input id="edit-url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!name || !url || updateMutation.isPending}>
              {updateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
