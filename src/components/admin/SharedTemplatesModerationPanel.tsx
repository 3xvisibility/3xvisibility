import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Search, Check, X, Trash2, Store, Loader2, Download } from "lucide-react";

interface SharedTemplate {
  id: string;
  template_id: string;
  user_id: string;
  author_name: string;
  description: string;
  category: string;
  variables: string[];
  downloads: number;
  is_approved: boolean;
  created_at: string;
}

type StatusFilter = "__all__" | "pending" | "approved";

export function SharedTemplatesModerationPanel() {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [items, setItems] = useState<SharedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("__all__");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SharedTemplate | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shared_templates")
      .select(
        "id, template_id, user_id, author_name, description, category, variables, downloads, is_approved, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load templates", description: error.message, variant: "destructive" });
    } else {
      setItems((data as SharedTemplate[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setApproval = async (item: SharedTemplate, isApproved: boolean) => {
    setBusyId(item.id);
    const { error } = await supabase
      .from("shared_templates")
      .update({ is_approved: isApproved })
      .eq("id", item.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((t) => (t.id === item.id ? { ...t, is_approved: isApproved } : t)));
    toast({ title: isApproved ? "Template approved" : "Template rejected" });
  };

  const remove = async () => {
    if (!toDelete) return;
    const item = toDelete;
    setToDelete(null);
    setBusyId(item.id);
    const { error } = await supabase.from("shared_templates").delete().eq("id", item.id);
    setBusyId(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((t) => t.id !== item.id));
    toast({ title: "Template removed" });
  };

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (statusFilter === "pending" && t.is_approved) return false;
      if (statusFilter === "approved" && !t.is_approved) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !t.author_name.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, statusFilter, search]);

  const pendingCount = items.filter((t) => !t.is_approved).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Marketplace Moderation</h2>
          {pendingCount > 0 && (
            <Badge className="bg-primary/15 text-primary border-primary/30">{pendingCount} pending</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-full sm:w-56"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading templates...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No shared templates found.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[560px] pr-2">
          <div className="space-y-2">
            {filtered.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{t.description || "(no description)"}</span>
                      <Badge
                        variant="outline"
                        className={
                          t.is_approved
                            ? "bg-success/15 text-success border-success/30"
                            : "bg-primary/15 text-primary border-primary/30"
                        }
                      >
                        {t.is_approved ? "Approved" : "Pending"}
                      </Badge>
                      <Badge variant="outline" className="text-muted-foreground">{t.category}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="truncate">by {t.author_name}</span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {t.downloads}
                      </span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.is_approved ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === t.id}
                        onClick={() => setApproval(t, false)}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busyId === t.id}
                        onClick={() => setApproval(t, true)}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busyId === t.id}
                      onClick={() => setToDelete(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove shared template?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the template from the marketplace. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={remove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
