import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Globe, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

type Website = Tables<"websites">;
type WebsiteType = Database["public"]["Enums"]["website_type"];

export default function WebsitesPage() {
  const [open, setOpen] = useState(false);
  const [siteType, setSiteType] = useState<WebsiteType | "">("");
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: websites = [], isLoading } = useQuery({
    queryKey: ["websites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Website[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const credentials = siteType === "wordpress"
        ? { username, app_password: appPassword }
        : { admin_api_token: shopifyToken };
      const { error } = await supabase.from("websites").insert({
        name: siteName || new URL(siteUrl).hostname,
        url: siteUrl,
        type: siteType as WebsiteType,
        credentials,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website connected", description: `Successfully connected to ${siteUrl}.` });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("websites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setOpen(false);
    setSiteUrl("");
    setSiteName("");
    setUsername("");
    setAppPassword("");
    setShopifyToken("");
    setSiteType("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Websites</h1>
          <p className="text-muted-foreground mt-1">Connect your websites for page publishing.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
              <Plus className="mr-2 h-4 w-4" /> Connect Website
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connect Website</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Platform</Label>
                <Select value={siteType} onValueChange={(v) => setSiteType(v as WebsiteType)}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                    <SelectItem value="shopify">Shopify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="site-name">Site Name</Label>
                <Input id="site-name" placeholder="My Blog" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="site-url">Site URL</Label>
                <Input id="site-url" placeholder="https://example.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
              </div>
              {siteType === "wordpress" && (
                <>
                  <div>
                    <Label htmlFor="wp-user">Username</Label>
                    <Input id="wp-user" placeholder="admin" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="wp-pass">Application Password</Label>
                    <Input id="wp-pass" type="password" placeholder="xxxx xxxx xxxx xxxx" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} />
                  </div>
                </>
              )}
              {siteType === "shopify" && (
                <div>
                  <Label htmlFor="shopify-token">Admin API Access Token</Label>
                  <Input id="shopify-token" type="password" placeholder="shpat_xxxxx" value={shopifyToken} onChange={(e) => setShopifyToken(e.target.value)} />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!siteUrl || !siteType || createMutation.isPending}>
                  {createMutation.isPending ? "Connecting..." : "Connect"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : websites.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No websites connected. Connect your first website to start publishing.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((site) => (
            <Card key={site.id} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{site.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    {site.status === "connected" ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(site.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground truncate">{site.url}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-xs">{site.type}</Badge>
                  <Badge variant={site.status === "connected" ? "secondary" : "destructive"} className={site.status === "connected" ? "bg-success/10 text-success" : ""}>
                    {site.status}
                  </Badge>
                </div>
                {site.last_sync && (
                  <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                    Last sync: {new Date(site.last_sync).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
