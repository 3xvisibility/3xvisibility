import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Globe, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockWebsites = [
  { id: "1", name: "blog.example.com", type: "wordpress", status: "connected", lastSync: "2026-03-16 08:30" },
  { id: "2", name: "store.example.com", type: "shopify", status: "connected", lastSync: "2026-03-15 14:22" },
  { id: "3", name: "landing.example.com", type: "wordpress", status: "error", lastSync: "2026-03-14 09:00" },
];

export default function WebsitesPage() {
  const [open, setOpen] = useState(false);
  const [siteType, setSiteType] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const { toast } = useToast();

  const handleConnect = () => {
    toast({
      title: "Website connected",
      description: `Successfully connected to ${siteUrl}.`,
    });
    setOpen(false);
    setSiteUrl("");
    setUsername("");
    setAppPassword("");
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
                <Select value={siteType} onValueChange={setSiteType}>
                  <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wordpress">WordPress</SelectItem>
                    <SelectItem value="shopify">Shopify</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Input id="shopify-token" type="password" placeholder="shpat_xxxxx" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleConnect} disabled={!siteUrl || !siteType}>Connect</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockWebsites.map((site) => (
          <Card key={site.id} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{site.name}</h3>
                </div>
                {site.status === "connected" ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="capitalize text-xs">{site.type}</Badge>
                <Badge variant={site.status === "connected" ? "secondary" : "destructive"} className={site.status === "connected" ? "bg-success/10 text-success" : ""}>
                  {site.status}
                </Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                Last sync: {site.lastSync}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" /> Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
