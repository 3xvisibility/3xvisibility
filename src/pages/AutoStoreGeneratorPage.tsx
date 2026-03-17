import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store, Sparkles, Loader2, CheckCircle, XCircle, Package, FolderTree,
  FileText, Play, Trash2, Eye, ChevronDown, ChevronUp, RefreshCw, Upload
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StoreGeneration {
  id: string;
  niche: string;
  keywords: string[];
  product_count: number;
  price_min: number;
  price_max: number;
  content_tone: string;
  language: string;
  status: string;
  categories: any[];
  products: any[];
  progress: {
    categories_created: number;
    products_created: number;
    pages_created: number;
    total_categories: number;
    total_products: number;
  };
  error_message: string | null;
  website_id: string | null;
  created_at: string;
}

const toneOptions = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "luxury", label: "Luxury" },
  { value: "fun", label: "Fun & Playful" },
  { value: "technical", label: "Technical" },
];

const languageOptions = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
];

export default function AutoStoreGeneratorPage() {
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [productCount, setProductCount] = useState(10);
  const [priceMin, setPriceMin] = useState(9.99);
  const [priceMax, setPriceMax] = useState(99.99);
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [websiteId, setWebsiteId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch websites for platform selection
  const { data: websites = [] } = useQuery({
    queryKey: ["websites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch store generations
  const { data: generations = [], isLoading } = useQuery({
    queryKey: ["store-generations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_generations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as StoreGeneration[];
    },
  });

  // Realtime subscription for progress updates
  useEffect(() => {
    const channel = supabase
      .channel("store-gen-updates")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "store_generations",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["store-generations"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const keywordsArr = keywords.split(",").map(k => k.trim()).filter(Boolean);

      // Insert the generation record
      const { data: gen, error: insertError } = await supabase
        .from("store_generations")
        .insert({
          user_id: user.id,
          niche,
          keywords: keywordsArr,
          product_count: productCount,
          price_min: priceMin,
          price_max: priceMax,
          content_tone: tone,
          language,
          website_id: websiteId || null,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger the edge function
      const { data, error } = await supabase.functions.invoke("generate-store", {
        body: { generation_id: gen.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["store-generations"] });
      toast({
        title: "Store generated!",
        description: `${data.categories} categories and ${data.products} products created.`,
      });
      setNiche("");
      setKeywords("");
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["store-generations"] });
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_generations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-generations"] });
      toast({ title: "Generation deleted" });
    },
  });

  const [regeneratingIdx, setRegeneratingIdx] = useState<string | null>(null);
  const fileInputRef = useState<Record<string, HTMLInputElement | null>>({});

  const uploadImageMutation = useMutation({
    mutationFn: async ({ generationId, productIndex, file }: {
      generationId: string; productIndex: number; file: File;
    }) => {
      setRegeneratingIdx(`${generationId}-${productIndex}`);

      // Convert to base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Get current generation
      const { data: gen, error: fetchErr } = await supabase
        .from("store_generations")
        .select("products")
        .eq("id", generationId)
        .single();
      if (fetchErr) throw fetchErr;

      const products = (gen.products as any[]) || [];
      products[productIndex] = { ...products[productIndex], image: dataUrl };

      const { error } = await supabase
        .from("store_generations")
        .update({ products })
        .eq("id", generationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-generations"] });
      toast({ title: "Image uploaded" });
      setRegeneratingIdx(null);
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setRegeneratingIdx(null);
    },
  });

  const regenerateImageMutation = useMutation({
    mutationFn: async ({ generationId, productIndex, productName, niche }: {
      generationId: string; productIndex: number; productName: string; niche: string;
    }) => {
      setRegeneratingIdx(`${generationId}-${productIndex}`);
      const { data, error } = await supabase.functions.invoke("regenerate-product-image", {
        body: { generation_id: generationId, product_index: productIndex, product_name: productName, niche },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-generations"] });
      toast({ title: "Image regenerated" });
      setRegeneratingIdx(null);
    },
    onError: (err: Error) => {
      toast({ title: "Image regeneration failed", description: err.message, variant: "destructive" });
      setRegeneratingIdx(null);
    },
  });

  const getProgressPercent = (gen: StoreGeneration) => {
    const total = (gen.progress.total_categories || 1) + (gen.progress.total_products || 1);
    const done = gen.progress.categories_created + gen.progress.products_created;
    return Math.round((done / total) * 100);
  };

  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    pending: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "bg-muted text-muted-foreground" },
    processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "bg-primary/10 text-primary" },
    completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-success/10 text-success" },
    failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-destructive/10 text-destructive" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Auto Store Generator</h1>
        <p className="text-muted-foreground mt-1">
          Generate a complete ecommerce store with AI-powered products, categories, and SEO content.
        </p>
      </div>

      {/* Generator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            New Store Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="niche">Store Niche *</Label>
              <Input
                id="niche"
                placeholder="e.g. Pet Products, Fitness Equipment, Electronics"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (optional, comma-separated)</Label>
              <Input
                id="keywords"
                placeholder="e.g. organic, premium, affordable"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Target Website</Label>
              <Select value={websiteId} onValueChange={setWebsiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select website" />
                </SelectTrigger>
                <SelectContent>
                  {websites.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Number of Products: {productCount}</Label>
              <Slider
                value={[productCount]}
                onValueChange={([v]) => setProductCount(v)}
                min={5}
                max={50}
                step={5}
                className="mt-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-min">Min Price ($)</Label>
              <Input
                id="price-min"
                type="number"
                min={0}
                step={0.01}
                value={priceMin}
                onChange={(e) => setPriceMin(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-max">Max Price ($)</Label>
              <Input
                id="price-max"
                type="number"
                min={0}
                step={0.01}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!niche || createMutation.isPending}
              className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200"
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Store...</>
              ) : (
                <><Store className="h-4 w-4 mr-2" />Generate Store</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generation History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Generation History</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : generations.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No store generations yet. Create your first one above!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {generations.map((gen) => {
              const status = statusConfig[gen.status] || statusConfig.pending;
              const progress = getProgressPercent(gen);
              const isExpanded = expandedId === gen.id;

              return (
                <Card key={gen.id} className="shadow-surface hover:shadow-surface-hover transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Store className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-semibold truncate">{gen.niche}</h3>
                          <Badge className={`${status.color} text-xs shrink-0`}>
                            {status.icon}
                            <span className="ml-1 capitalize">{gen.status}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <FolderTree className="h-3 w-3" />
                            {gen.progress.categories_created} categories
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {gen.progress.products_created} / {gen.progress.total_products} products
                          </span>
                          <span className="tabular-nums">
                            {new Date(gen.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {(gen.status === "processing" || gen.status === "pending") && (
                          <div className="mt-3">
                            <Progress value={progress} className="h-1.5" />
                            <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
                          </div>
                        )}

                        {gen.error_message && (
                          <p className="mt-2 text-xs text-destructive">{gen.error_message}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedId(isExpanded ? null : gen.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(gen.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && gen.status === "completed" && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        {/* Categories */}
                        {gen.categories?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                              <FolderTree className="h-3.5 w-3.5 text-primary" />
                              Categories ({gen.categories.length})
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {gen.categories.map((cat: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {cat.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Products */}
                        {gen.products?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                              <Package className="h-3.5 w-3.5 text-primary" />
                              Products ({gen.products.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                              {gen.products.map((prod: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-border bg-muted/30 p-3 text-xs flex gap-3"
                                >
                                  <div className="relative shrink-0 group/img">
                                    {prod.image ? (
                                      <img
                                        src={prod.image}
                                        alt={prod.name}
                                        className="w-14 h-14 rounded-md object-cover bg-muted"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      id={`upload-${gen.id}-${idx}`}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          uploadImageMutation.mutate({
                                            generationId: gen.id,
                                            productIndex: idx,
                                            file,
                                          });
                                        }
                                        e.target.value = "";
                                      }}
                                    />
                                    <div className="absolute -bottom-1 -right-1 flex gap-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-5 w-5 rounded-full shadow-sm"
                                            disabled={regeneratingIdx === `${gen.id}-${idx}`}
                                            onClick={() => document.getElementById(`upload-${gen.id}-${idx}`)?.click()}
                                          >
                                            <Upload className="h-2.5 w-2.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">Upload image</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-5 w-5 rounded-full shadow-sm"
                                            disabled={regeneratingIdx === `${gen.id}-${idx}`}
                                            onClick={() => regenerateImageMutation.mutate({
                                              generationId: gen.id,
                                              productIndex: idx,
                                              productName: prod.name,
                                              niche: gen.niche,
                                            })}
                                          >
                                            {regeneratingIdx === `${gen.id}-${idx}` ? (
                                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                            ) : (
                                              <RefreshCw className="h-2.5 w-2.5" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">Regenerate image</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium truncate">{prod.name}</div>
                                    <div className="flex items-center justify-between mt-1 text-muted-foreground">
                                      <span>${prod.price}</span>
                                      <Badge variant="outline" className="text-[10px] h-4">
                                        {prod.category}
                                      </Badge>
                                    </div>
                                    {prod.seo_title && (
                                      <div className="mt-1.5 text-muted-foreground truncate">
                                        SEO: {prod.seo_title}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Settings Summary */}
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                          <span>Tone: {gen.content_tone}</span>
                          <span>Language: {gen.language}</span>
                          <span>Price: ${gen.price_min} - ${gen.price_max}</span>
                          {gen.keywords?.length > 0 && (
                            <span>Keywords: {gen.keywords.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
