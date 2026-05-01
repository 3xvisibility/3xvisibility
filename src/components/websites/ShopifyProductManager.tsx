import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package, Pencil, Search, Loader2, Save, ArrowLeft, Sparkles,
  ChevronRight, ExternalLink, Tag, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Website = Tables<"websites">;

interface ShopifyProductManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  website: Website;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  status: string;
  images: Array<{ id: number; src: string; alt: string | null }>;
  variants: Array<{ id: number; price: string; sku: string; title: string }>;
}

export function ShopifyProductManager({ open, onOpenChange, website }: ShopifyProductManagerProps) {
  const [view, setView] = useState<"list" | "edit" | "bulk-seo">("list");
  const [editingProduct, setEditingProduct] = useState<ShopifyProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["shopify-products", website.id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("shopify-products", {
        body: { action: "list_products", website_id: website.id, limit: 50 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { products: ShopifyProduct[]; next_page_info: string | null };
    },
  });

  const products = productsData?.products || [];
  const filtered = searchQuery
    ? products.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSeoTitle, setEditSeoTitle] = useState("");
  const [editSeoDesc, setEditSeoDesc] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editType, setEditType] = useState("");

  const openEdit = (product: ShopifyProduct) => {
    setEditingProduct(product);
    setEditTitle(product.title);
    setEditBody(product.body_html || "");
    setEditTags(product.tags || "");
    setEditSeoTitle("");
    setEditSeoDesc("");
    setEditVendor(product.vendor || "");
    setEditType(product.product_type || "");
    setView("edit");
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingProduct) return;
      const { data, error } = await supabase.functions.invoke("shopify-products", {
        body: {
          action: "update_product",
          website_id: website.id,
          product_id: editingProduct.id,
          updates: {
            title: editTitle,
            body_html: editBody,
            tags: editTags,
            vendor: editVendor,
            product_type: editType,
            ...(editSeoTitle && { seo_title: editSeoTitle }),
            ...(editSeoDesc && { seo_description: editSeoDesc }),
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Product updated", description: `${editTitle} saved to Shopify.` });
      queryClient.invalidateQueries({ queryKey: ["shopify-products", website.id] });
      setView("list");
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  // Bulk SEO state
  const [bulkSeoData, setBulkSeoData] = useState<Record<number, { seo_title: string; seo_description: string }>>({});

  const openBulkSeo = () => {
    const initial: typeof bulkSeoData = {};
    selectedIds.forEach((id) => {
      initial[id] = { seo_title: "", seo_description: "" };
    });
    setBulkSeoData(initial);
    setView("bulk-seo");
  };

  const bulkSeoMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(bulkSeoData)
        .filter(([, v]) => v.seo_title || v.seo_description)
        .map(([id, v]) => ({ product_id: id, ...v }));
      if (!items.length) throw new Error("No SEO data to update");
      const { data, error } = await supabase.functions.invoke("shopify-products", {
        body: { action: "bulk_seo_update", website_id: website.id, products: items },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Bulk SEO updated", description: `${data.success_count}/${data.total} products updated.` });
      queryClient.invalidateQueries({ queryKey: ["shopify-products", website.id] });
      setSelectedIds(new Set());
      setView("list");
    },
    onError: (err: Error) => {
      toast({ title: "Bulk SEO failed", description: err.message, variant: "destructive" });
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const creds = website.credentials as Record<string, string> | null;
  const domain = creds?.shop_domain || website.url.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {view === "list" && "Shopify Products"}
            {view === "edit" && (
              <span className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setView("list")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Edit Product
              </span>
            )}
            {view === "bulk-seo" && (
              <span className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setView("list")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                Bulk SEO Optimization
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ---- LIST VIEW ---- */}
        {view === "list" && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              {selectedIds.size > 0 && (
                <Button size="sm" variant="secondary" className="gap-1.5 shrink-0" onClick={openBulkSeo}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Bulk SEO ({selectedIds.size})
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2" style={{ maxHeight: "55vh" }}>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  {searchQuery ? "No products match your search" : "No products found in this store"}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 pb-1">
                    <Checkbox
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                    </span>
                  </div>
                  {filtered.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
                    >
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].src}
                          alt={product.images[0].alt || product.title}
                          className="h-12 w-12 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={product.status === "active" ? "secondary" : "outline"} className="text-[10px] h-5">
                            {product.status}
                          </Badge>
                          {product.vendor && (
                            <span className="text-[11px] text-muted-foreground truncate">{product.vendor}</span>
                          )}
                          {product.variants?.[0]?.price && (
                            <span className="text-[11px] font-medium">${product.variants[0].price}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => openEdit(product)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <a
                          href={`https://${domain}/products/${product.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <p className="text-[11px] text-muted-foreground text-center">
              {products.length} product{products.length !== 1 ? "s" : ""} loaded from {domain}
            </p>
          </div>
        )}

        {/* ---- EDIT VIEW ---- */}
        {view === "edit" && editingProduct && (
          <ScrollArea className="flex-1" style={{ maxHeight: "65vh" }}>
            <div className="space-y-4 pr-3">
              <div>
                <Label>Title</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <Label>Description (HTML)</Label>
                <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} className="font-mono text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vendor</Label>
                  <Input value={editVendor} onChange={(e) => setEditVendor(e.target.value)} />
                </div>
                <div>
                  <Label>Product Type</Label>
                  <Input value={editType} onChange={(e) => setEditType(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Tags
                </Label>
                <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="tag1, tag2, tag3" />
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> SEO
                </h4>
                <div>
                  <Label>SEO Title (Meta Title)</Label>
                  <Input value={editSeoTitle} onChange={(e) => setEditSeoTitle(e.target.value)} placeholder="Leave empty to keep current" />
                  {editSeoTitle && (
                    <p className={cn("text-[11px] mt-1", editSeoTitle.length > 60 ? "text-destructive" : "text-muted-foreground")}>
                      {editSeoTitle.length}/60 characters
                    </p>
                  )}
                </div>
                <div>
                  <Label>SEO Description (Meta Description)</Label>
                  <Textarea value={editSeoDesc} onChange={(e) => setEditSeoDesc(e.target.value)} rows={3} placeholder="Leave empty to keep current" />
                  {editSeoDesc && (
                    <p className={cn("text-[11px] mt-1", editSeoDesc.length > 160 ? "text-destructive" : "text-muted-foreground")}>
                      {editSeoDesc.length}/160 characters
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1.5" /> Save to Shopify</>
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}

        {/* ---- BULK SEO VIEW ---- */}
        {view === "bulk-seo" && (
          <ScrollArea className="flex-1" style={{ maxHeight: "65vh" }}>
            <div className="space-y-4 pr-3">
              <p className="text-sm text-muted-foreground">
                Set SEO title and description for {Object.keys(bulkSeoData).length} selected products.
              </p>
              {Object.entries(bulkSeoData).map(([idStr, seo]) => {
                const id = Number(idStr);
                const product = products.find((p) => p.id === id);
                return (
                  <div key={id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{product?.title || `Product #${id}`}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          const next = { ...bulkSeoData };
                          delete next[id];
                          setBulkSeoData(next);
                          const ns = new Set(selectedIds);
                          ns.delete(id);
                          setSelectedIds(ns);
                          if (Object.keys(next).length === 0) setView("list");
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      placeholder="SEO Title"
                      value={seo.seo_title}
                      onChange={(e) =>
                        setBulkSeoData((prev) => ({
                          ...prev,
                          [id]: { ...prev[id], seo_title: e.target.value },
                        }))
                      }
                    />
                    <Textarea
                      placeholder="SEO Description"
                      rows={2}
                      value={seo.seo_description}
                      onChange={(e) =>
                        setBulkSeoData((prev) => ({
                          ...prev,
                          [id]: { ...prev[id], seo_description: e.target.value },
                        }))
                      }
                    />
                  </div>
                );
              })}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
                <Button onClick={() => bulkSeoMutation.mutate()} disabled={bulkSeoMutation.isPending}>
                  {bulkSeoMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Updating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-1.5" /> Update SEO ({Object.keys(bulkSeoData).length})</>
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
