import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  FileText,
  ShoppingBag,
  Search,
  ExternalLink,
  Loader2,
  Sparkles,
  Eye,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { TemplateDetectorDialog } from "@/components/website-content/TemplateDetectorDialog";
import { PagePreviewDialog } from "@/components/website-content/PagePreviewDialog";

type Website = Tables<"websites">;

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

/** Decode HTML entities like &#8211; &amp; &lt; etc. */
function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return text;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

export default function WebsiteContentPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { toast } = useToast();
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"pages" | "products">("pages");
  const [search, setSearch] = useState("");
  const [templatePage, setTemplatePage] = useState<ContentItem | null>(null);
  const [previewPage, setPreviewPage] = useState<ContentItem | null>(null);

  // Fetch connected websites
  const { data: websites = [], isLoading: loadingWebsites } = useQuery({
    queryKey: ["websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Website[];
    },
  });

  // Auto-select first website
  const effectiveWebsite = selectedWebsite || websites[0]?.id || "";

  // Fetch pages
  const {
    data: pagesData,
    isLoading: loadingPages,
    refetch: refetchPages,
    error: pagesError,
  } = useQuery({
    queryKey: ["site-content", effectiveWebsite, "pages"],
    enabled: !!effectiveWebsite,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-site-content", {
        body: { website_id: effectiveWebsite, content_type: "pages" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.items as ContentItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch products
  const {
    data: productsData,
    isLoading: loadingProducts,
    refetch: refetchProducts,
    error: productsError,
  } = useQuery({
    queryKey: ["site-content", effectiveWebsite, "products"],
    enabled: !!effectiveWebsite,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-site-content", {
        body: { website_id: effectiveWebsite, content_type: "products" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.items as ContentItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const pages = pagesData || [];
  const products = productsData || [];
  const currentItems = activeTab === "pages" ? pages : products;
  const isLoading = activeTab === "pages" ? loadingPages : loadingProducts;
  const error = activeTab === "pages" ? pagesError : productsError;

  const filtered = useMemo(() => {
    if (!search) return currentItems;
    const q = search.toLowerCase();
    return currentItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q)
    );
  }, [currentItems, search]);

  const currentWebsite = websites.find((w) => w.id === effectiveWebsite);

  const platformIcon = (type: string) => {
    switch (type) {
      case "wordpress": return "🔵";
      case "shopify": return "🟢";
      case "prestashop": return "🟣";
      case "woocommerce": return "🟠";
      default: return "🌐";
    }
  };

  if (loadingWebsites) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (websites.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Globe className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Websites Connected</h2>
        <p className="text-muted-foreground text-sm max-w-md mb-4">
          Connect a WordPress, Shopify, PrestaShop, or WooCommerce website first to browse and manage its content.
        </p>
        <Button onClick={() => window.location.href = "/websites"}>
          <Globe className="h-4 w-4 mr-2" /> Connect a Website
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Website Content
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse pages & products from your connected websites
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={effectiveWebsite} onValueChange={setSelectedWebsite}>
            <SelectTrigger className="h-9 text-sm w-full sm:w-[240px]">
              <SelectValue placeholder="Select website" />
            </SelectTrigger>
            <SelectContent>
              {websites.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="flex items-center gap-2">
                    <span>{platformIcon(w.type)}</span>
                    <span className="truncate">{w.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refetchPages();
              refetchProducts();
              toast({ title: "Refreshing content..." });
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Website info banner */}
      {currentWebsite && (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl">{platformIcon(currentWebsite.type)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{currentWebsite.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentWebsite.url}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs capitalize">
                {currentWebsite.type}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${currentWebsite.status === "connected" ? "text-success border-success/30" : "text-destructive border-destructive/30"}`}
              >
                {currentWebsite.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs + Search */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pages" | "products")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pages" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Pages ({pages.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Products ({products.length})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <TabsContent value="pages" className="mt-3">
          <ContentList
            items={filtered}
            isLoading={isLoading}
            error={error}
            onDetectTemplate={setTemplatePage}
            onPreview={setPreviewPage}
          />
        </TabsContent>
        <TabsContent value="products" className="mt-3">
          <ContentList
            items={filtered}
            isLoading={isLoading}
            error={error}
            onDetectTemplate={setTemplatePage}
            onPreview={setPreviewPage}
          />
        </TabsContent>
      </Tabs>

      {/* Template Detector Dialog */}
      {templatePage && (
        <TemplateDetectorDialog
          open={!!templatePage}
          onOpenChange={(o) => !o && setTemplatePage(null)}
          page={templatePage}
          websiteId={effectiveWebsite}
          websiteType={currentWebsite?.type || "wordpress"}
        />
      )}

      {/* Page Preview Dialog */}
      {previewPage && (
        <PagePreviewDialog
          open={!!previewPage}
          onOpenChange={(o) => !o && setPreviewPage(null)}
          page={previewPage}
        />
      )}
    </div>
  );
}

// ---- Content List component ----

function ContentList({
  items,
  isLoading,
  error,
  onDetectTemplate,
  onPreview,
}: {
  items: ContentItem[];
  isLoading: boolean;
  error: Error | null;
  onDetectTemplate: (item: ContentItem) => void;
  onPreview: (item: ContentItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive font-medium">Failed to fetch content</p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No content found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-360px)]">
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className="group hover:border-primary/30 transition-colors">
            <CardContent className="py-3 px-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">
                        {decodeHtmlEntities(item.title) || "(Untitled)"}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          item.status === "publish" || item.status === "published"
                            ? "text-green-600 border-green-500/30 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      /{decodeHtmlEntities(item.slug)}
                    </p>
                  </div>
                  {item.url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => window.open(item.url, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 flex-1 sm:flex-none"
                    onClick={() => onPreview(item)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 flex-1 sm:flex-none bg-primary text-primary-foreground"
                    onClick={() => onDetectTemplate(item)}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
