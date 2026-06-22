import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Download, Trash2, Store, Loader2 } from "lucide-react";
import { elementorToPreviewHtml } from "@/lib/marketplace-templates";

const CATEGORIES = [
  "business", "ecommerce", "restaurant", "health", "realestate",
  "education", "agency", "portfolio", "saas", "nonprofit", "events",
];

const urlSchema = z.string().trim().url({ message: "Enter a valid URL (https://...)" }).max(2048);

interface MarketplaceRow {
  id: string;
  name: string;
  category: string;
  source_url: string | null;
  created_at: string;
}

export function MarketplaceImportPanel() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("business");

  const { data: rows = [], isLoading, isError, error, isFetching, isSuccess, dataUpdatedAt } = useQuery({
    queryKey: ["admin-marketplace-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select("id, name, category, source_url, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MarketplaceRow[];
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const parsed = urlSchema.safeParse(url);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);

      const { data: fn, error: fnError } = await supabase.functions.invoke(
        "import-elementor-demo",
        { body: { url: parsed.data } },
      );
      if (fnError) throw new Error(fnError.message);
      if (!fn?.elementorData) throw new Error(fn?.error || "No template data returned");

      const previewHtml = elementorToPreviewHtml(fn.elementorData);
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from("marketplace_templates").insert({
        name: fn.name || "Imported Elementor Template",
        description: `Imported from ${parsed.data}`,
        category,
        elementor_data: fn.elementorData,
        variables: fn.variables || [],
        preview_html: previewHtml,
        source_url: parsed.data,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template imported to marketplace");
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-templates"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-admin-templates"] });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template removed");
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-templates"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-admin-templates"] });
    },
    onError: (e: Error) => toast.error(e.message || "Delete failed"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4" /> Import demo to marketplace
          </CardTitle>
          <CardDescription>
            Paste a live Elementor demo URL. It will be fetched, converted to native
            Elementor JSON, and added to the marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="demo-url">Demo URL</Label>
              <Input
                id="demo-url"
                placeholder="https://websitedemos.net/love-nature-02/"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || !url.trim()}
          >
            {importMutation.isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
              : <><Download className="h-4 w-4 mr-2" /> Import to marketplace</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Imported templates ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No imported templates yet.</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.source_url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">{r.category}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(r.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
