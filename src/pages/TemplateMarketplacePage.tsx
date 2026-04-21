import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Store, Search, Download, Upload, Eye, Code, Star, Users, FileText,
  Tag, Globe, ShoppingBag, MapPin, Megaphone, Briefcase, GraduationCap,
  Heart, Loader2, Share2, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { COMMUNITY_TEMPLATES, type MarketplaceTemplate } from "@/lib/marketplace-templates";

const CATEGORIES = [
  { id: "all", label: "All", icon: Store },
  { id: "local-seo", label: "Local SEO", icon: MapPin },
  { id: "ecommerce", label: "E-Commerce", icon: ShoppingBag },
  { id: "saas", label: "SaaS / Tech", icon: Globe },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "health", label: "Health", icon: Heart },
  { id: "wordpress", label: "WordPress", icon: FileText },
  { id: "shopify", label: "Shopify", icon: ShoppingBag },
  { id: "prestashop", label: "PrestaShop", icon: Tag },
];

export default function TemplateMarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"browse" | "community">("browse");
  const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareForm, setShareForm] = useState({ templateId: "", description: "", category: "general", tags: "", authorName: "" });
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Fetch user's templates for sharing
  const { data: userTemplates = [] } = useQuery({
    queryKey: ["user-templates-share", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, content, variables")
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return data;
    },
  });

  // Fetch community shared templates
  const { data: sharedTemplates = [], isLoading: loadingShared } = useQuery({
    queryKey: ["shared-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shared_templates")
        .select("*")
        .eq("is_approved", true)
        .order("downloads", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch ratings for shared templates
  const { data: allRatings = [] } = useQuery({
    queryKey: ["template-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_ratings")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Convert shared templates to MarketplaceTemplate format
  const communityTemplates: MarketplaceTemplate[] = useMemo(() => {
    return sharedTemplates.map((st: any) => {
      const ratings = allRatings.filter((r: any) => r.shared_template_id === st.id);
      const avgRating = ratings.length > 0
        ? Math.round(ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length * 10) / 10
        : 0;
      return {
        id: st.id,
        shared_id: st.id,
        name: st.description ? st.description.slice(0, 40) : `Template by ${st.author_name || "Anonymous"}`,
        description: st.description,
        content: st.content,
        variables: st.variables || [],
        category: st.category,
        tags: st.tags || [],
        author: st.author_name || "Anonymous",
        downloads: st.downloads || 0,
        rating: avgRating,
        ratingCount: ratings.length,
        seo_title_pattern: st.seo_title_pattern,
        seo_description_pattern: st.seo_description_pattern,
        schema_type: st.schema_type,
        isShared: true,
      };
    });
  }, [sharedTemplates, allRatings]);

  // Merge built-in + community for "browse" tab
  const allTemplates = useMemo(() => {
    return [...COMMUNITY_TEMPLATES, ...communityTemplates];
  }, [communityTemplates]);

  const filteredTemplates = useMemo(() => {
    const source = activeTab === "community" ? communityTemplates : allTemplates;
    return source.filter((tpl) => {
      const matchesCategory = selectedCategory === "all" || tpl.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory, activeTab, allTemplates, communityTemplates]);

  const importMutation = useMutation({
    mutationFn: async (tpl: MarketplaceTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");
      const { error } = await supabase.from("templates").insert({
        name: tpl.name,
        content: tpl.content,
        variables: tpl.variables,
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: tpl.seo_title_pattern || "",
        seo_description_pattern: tpl.seo_description_pattern || "",
        schema_type: tpl.schema_type || "WebPage",
        schema_config: {},
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, tpl) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template imported!", description: `"${tpl.name}" added to your templates.` });
      setPreviewTemplate(null);
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  // Share template mutation
  const shareMutation = useMutation({
    mutationFn: async (form: typeof shareForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const template = userTemplates.find((t: any) => t.id === form.templateId);
      if (!template) throw new Error("Template not found");
      const { error } = await supabase.from("shared_templates").insert({
        template_id: form.templateId,
        user_id: user.id,
        workspace_id: wsId,
        author_name: form.authorName || "Anonymous",
        description: form.description,
        category: form.category,
        tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        content: (template as any).content,
        variables: (template as any).variables || [],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-templates"] });
      toast({ title: "Template shared!", description: "Your template is now available in the community marketplace." });
      setShareOpen(false);
      setShareForm({ templateId: "", description: "", category: "general", tags: "", authorName: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Share failed", description: err.message, variant: "destructive" });
    },
  });

  // Rate template mutation
  const rateMutation = useMutation({
    mutationFn: async ({ sharedId, rating, review }: { sharedId: string; rating: number; review: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("template_ratings").upsert({
        shared_template_id: sharedId,
        user_id: user.id,
        rating,
        review: review || null,
      } as any, { onConflict: "shared_template_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-ratings"] });
      toast({ title: "Rating submitted!" });
    },
    onError: (err: Error) => {
      toast({ title: "Rating failed", description: err.message, variant: "destructive" });
    },
  });

  const categoryIcon = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found?.label || cat;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            Template Marketplace
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Browse, share, and rate community templates.
          </p>
        </div>
        <Button onClick={() => setShareOpen(true)} variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" /> Share Template
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeTab === "browse" ? "default" : "outline"}
          onClick={() => setActiveTab("browse")}
        >
          <Store className="h-3.5 w-3.5 mr-1.5" /> All Templates
        </Button>
        <Button
          size="sm"
          variant={activeTab === "community" ? "default" : "outline"}
          onClick={() => setActiveTab("community")}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" /> Community Shared
          {communityTemplates.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px]">{communityTemplates.length}</Badge>
          )}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => (
          <Card
            key={tpl.id}
            className="shadow-surface hover:shadow-surface-hover transition-all duration-150 cursor-pointer group"
            onClick={() => setPreviewTemplate(tpl)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {tpl.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {tpl.downloads.toLocaleString()}
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">{categoryIcon(tpl.category)}</Badge>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {tpl.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="border border-border rounded-md overflow-hidden bg-muted/30 h-32">
                <div
                  className="transform scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: tpl.content }}
                />
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {tpl.variables.length} variables
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    importMutation.mutate(tpl);
                  }}
                >
                  <Download className="h-3 w-3 mr-1" /> Import
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No templates found</p>
            <p className="text-sm mt-1">Try a different search or category.</p>
          </div>
        )}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(v) => !v && setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {previewTemplate.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    {previewTemplate.rating}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Download className="h-3.5 w-3.5" />
                    {previewTemplate.downloads.toLocaleString()} imports
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {previewTemplate.author}
                  </span>
                  <Badge variant="outline" className="capitalize">{categoryIcon(previewTemplate.category)}</Badge>
                  {previewTemplate.schema_type && (
                    <Badge variant="secondary" className="text-xs">Schema: {previewTemplate.schema_type}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Variables:</span>
                  {previewTemplate.variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                  ))}
                </div>

                {previewTemplate.seo_title_pattern && (
                  <div className="text-xs space-y-1 p-3 bg-muted/50 rounded-lg">
                    <p><strong>SEO Title Pattern:</strong> {previewTemplate.seo_title_pattern}</p>
                    {previewTemplate.seo_description_pattern && (
                      <p><strong>SEO Description Pattern:</strong> {previewTemplate.seo_description_pattern}</p>
                    )}
                  </div>
                )}

                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="preview" className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" /> Code
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="mt-3">
                    <TemplatePreview html={previewTemplate.content} />
                  </TabsContent>
                  <TabsContent value="code" className="mt-3">
                    <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
                      {previewTemplate.content}
                    </pre>
                  </TabsContent>
                </Tabs>

                {/* Rating section for shared templates */}
                {previewTemplate.isShared && previewTemplate.shared_id && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Rate this template
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => setRatingValue(s)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                s <= ratingValue ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Optional review..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rateMutation.isPending}
                        onClick={() => rateMutation.mutate({
                          sharedId: previewTemplate.shared_id!,
                          rating: ratingValue,
                          review: reviewText,
                        })}
                      >
                        {rateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit"}
                      </Button>
                    </div>
                    {previewTemplate.ratingCount !== undefined && previewTemplate.ratingCount > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {previewTemplate.ratingCount} rating{previewTemplate.ratingCount !== 1 ? "s" : ""} · avg {previewTemplate.rating}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
                  <Button
                    onClick={() => importMutation.mutate(previewTemplate)}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                    ) : (
                      <><Download className="mr-2 h-4 w-4" /> Import to My Templates</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" /> Share Your Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template to Share</Label>
              <Select value={shareForm.templateId} onValueChange={(v) => setShareForm(f => ({ ...f, templateId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                <SelectContent>
                  {userTemplates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                placeholder="Your name or alias"
                value={shareForm.authorName}
                onChange={(e) => setShareForm(f => ({ ...f, authorName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this template is for..."
                value={shareForm.description}
                onChange={(e) => setShareForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={shareForm.category} onValueChange={(v) => setShareForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.id !== "all").map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  placeholder="seo, blog, local"
                  value={shareForm.tags}
                  onChange={(e) => setShareForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
              <Button
                disabled={!shareForm.templateId || !shareForm.description || shareMutation.isPending}
                onClick={() => shareMutation.mutate(shareForm)}
              >
                {shareMutation.isPending ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sharing...</>
                ) : (
                  <><Share2 className="mr-1.5 h-3.5 w-3.5" /> Share to Marketplace</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
