import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Template = Tables<"templates">;

export default function TemplatesPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const detectedVars = content.match(/\{[^}]+\}/g) || [];

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const variables = [...new Set(content.match(/\{[^}]+\}/g) || [])];
      const { error } = await supabase.from("templates").insert({
        name,
        content,
        variables,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template created", description: `"${name}" has been saved.` });
      setOpen(false);
      setName("");
      setContent("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Templates</h1>
          <p className="text-muted-foreground mt-1">Define reusable page layouts with dynamic variables.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="tpl-name">Template Name</Label>
                <Input id="tpl-name" placeholder="e.g., Course Landing" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tpl-content">Template Content</Label>
                <p className="text-xs text-muted-foreground mb-1">Use &#123;variable&#125; syntax for dynamic fields.</p>
                <Textarea
                  id="tpl-content"
                  placeholder={"<h1>{course} in {city}</h1>\n<p>Learn {course} in {city}...</p>"}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
              {detectedVars.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Detected variables:</span>
                  {[...new Set(detectedVars)].map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!name || !content || createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No templates yet. Create your first template to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{tpl.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      navigator.clipboard.writeText(tpl.content);
                      toast({ title: "Copied to clipboard" });
                    }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(tpl.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(tpl.variables || []).map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                  ))}
                </div>
                <pre className="mt-3 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto leading-relaxed">
                  {tpl.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
