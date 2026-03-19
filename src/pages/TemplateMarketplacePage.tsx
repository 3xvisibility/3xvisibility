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

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: string[];
  category: string;
  tags: string[];
  author: string;
  downloads: number;
  rating: number;
  ratingCount?: number;
  seo_title_pattern?: string;
  seo_description_pattern?: string;
  schema_type?: string;
  isShared?: boolean; // from shared_templates table
  shared_id?: string;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: Store },
  { id: "local-seo", label: "Local SEO", icon: MapPin },
  { id: "ecommerce", label: "E-Commerce", icon: ShoppingBag },
  { id: "saas", label: "SaaS / Tech", icon: Globe },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "health", label: "Health", icon: Heart },
];

// Built-in community templates
const COMMUNITY_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: "local-plumber",
    name: "Local Plumber Landing",
    description: "High-converting landing page for local plumbing services with service areas, pricing, and trust signals.",
    content: `<div class="template">
<header style="background:linear-gradient(135deg,#1e3a5f,#2d5a8e);color:#fff;padding:48px 32px;border-radius:12px">
  <h1 style="font-size:2.5em;margin-bottom:8px">{company_name} — {service} in {city}</h1>
  <p style="font-size:1.2em;opacity:0.9">Trusted {service:lowercase} experts serving {city} and surrounding areas</p>
  <p style="margin-top:16px;font-size:1.4em;font-weight:700">📞 Call Now: {phone}</p>
</header>
<section style="padding:32px 0">
  <h2>Why Choose {company_name}?</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:16px">
    <div style="padding:20px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
      <p style="font-size:2em">⚡</p><h3>Fast Response</h3><p>Same-day service in {city}</p>
    </div>
    <div style="padding:20px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
      <p style="font-size:2em">💰</p><h3>Fair Pricing</h3><p>Free estimates, no hidden fees</p>
    </div>
    <div style="padding:20px;border:1px solid #e5e7eb;border-radius:8px;text-align:center">
      <p style="font-size:2em">⭐</p><h3>5-Star Rated</h3><p>Hundreds of happy customers in {state}</p>
    </div>
  </div>
</section>
<section style="background:#f8fafc;padding:32px;border-radius:8px;margin-top:24px">
  <h2>Our {service} Services in {city}, {state}</h2>
  <p>{service_description}</p>
  <p style="margin-top:16px"><strong>Service Area:</strong> {city}, {nearby_cities}</p>
</section>
</div>`,
    variables: ["{company_name}", "{service}", "{city}", "{state}", "{phone}", "{service_description}", "{nearby_cities}"],
    category: "local-seo",
    tags: ["plumbing", "local", "services", "landing"],
    author: "Community",
    downloads: 1247,
    rating: 4.8,
    seo_title_pattern: "{service} in {city}, {state} | {company_name}",
    seo_description_pattern: "Professional {service:lowercase} services in {city}, {state}. Call {company_name} at {phone} for fast, reliable service.",
    schema_type: "LocalBusiness",
  },
  {
    id: "product-page",
    name: "E-Commerce Product Page",
    description: "Clean product page with features, pricing, and social proof for online stores.",
    content: `<div class="template">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:32px">
  <div style="background:#f1f5f9;border-radius:12px;padding:48px;display:flex;align-items:center;justify-content:center">
    <p style="color:#94a3b8;font-size:1.2em">Product Image: {product_name}</p>
  </div>
  <div>
    <span style="color:#3b82f6;font-size:0.85em;font-weight:600">{category:uppercase}</span>
    <h1 style="font-size:2em;margin:8px 0">{product_name}</h1>
    <p style="font-size:1.8em;font-weight:700;color:#16a34a">{price}</p>
    <p style="margin-top:16px;color:#64748b;line-height:1.7">{description}</p>
    <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px">
      <h3>Key Features</h3>
      <p>{features}</p>
    </div>
    <button style="margin-top:24px;background:#3b82f6;color:#fff;border:none;padding:14px 32px;border-radius:8px;font-size:1.1em;cursor:pointer;width:100%">Add to Cart</button>
  </div>
</div>
<section style="padding:32px;border-top:1px solid #e5e7eb;margin-top:24px">
  <h2>Product Details</h2>
  <p>{long_description}</p>
</section>
</div>`,
    variables: ["{product_name}", "{category}", "{price}", "{description}", "{features}", "{long_description}"],
    category: "ecommerce",
    tags: ["product", "shop", "ecommerce"],
    author: "Community",
    downloads: 892,
    rating: 4.6,
    seo_title_pattern: "{product_name} — Buy Online | {category}",
    seo_description_pattern: "{description:truncate(155)}",
    schema_type: "Product",
  },
  {
    id: "saas-landing",
    name: "SaaS Feature Landing",
    description: "Modern landing page for SaaS product features with comparison and CTA sections.",
    content: `<div class="template">
<header style="text-align:center;padding:64px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:12px">
  <h1 style="font-size:2.8em;margin-bottom:12px">{headline}</h1>
  <p style="font-size:1.3em;opacity:0.9;max-width:600px;margin:0 auto">{subheadline}</p>
  <button style="margin-top:28px;background:#fff;color:#6366f1;border:none;padding:14px 36px;border-radius:8px;font-size:1.1em;font-weight:600;cursor:pointer">{cta_text}</button>
</header>
<section style="padding:48px 32px">
  <h2 style="text-align:center;margin-bottom:32px">Why {product_name}?</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
    <div style="text-align:center;padding:24px"><h3>{feature_1_title}</h3><p style="color:#64748b">{feature_1_desc}</p></div>
    <div style="text-align:center;padding:24px"><h3>{feature_2_title}</h3><p style="color:#64748b">{feature_2_desc}</p></div>
    <div style="text-align:center;padding:24px"><h3>{feature_3_title}</h3><p style="color:#64748b">{feature_3_desc}</p></div>
  </div>
</section>
<section style="background:#f8fafc;padding:48px 32px;text-align:center;border-radius:12px">
  <h2>{bottom_cta_headline}</h2>
  <p style="color:#64748b;margin:12px 0">{bottom_cta_description}</p>
  <button style="background:#6366f1;color:#fff;border:none;padding:14px 36px;border-radius:8px;font-size:1.1em;cursor:pointer">{cta_text}</button>
</section>
</div>`,
    variables: ["{headline}", "{subheadline}", "{product_name}", "{cta_text}", "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}", "{bottom_cta_headline}", "{bottom_cta_description}"],
    category: "saas",
    tags: ["saas", "landing", "features", "startup"],
    author: "Community",
    downloads: 1563,
    rating: 4.9,
    seo_title_pattern: "{headline} | {product_name}",
    seo_description_pattern: "{subheadline}",
    schema_type: "WebPage",
  },
  {
    id: "blog-post",
    name: "SEO Blog Post",
    description: "Structured blog post template with author bio, table of contents, and rich formatting.",
    content: `<article class="template" style="max-width:720px;margin:0 auto;padding:32px">
<header>
  <span style="color:#3b82f6;font-size:0.85em;font-weight:600">{category:uppercase}</span>
  <h1 style="font-size:2.4em;margin:8px 0;line-height:1.2">{title}</h1>
  <div style="display:flex;align-items:center;gap:12px;margin-top:16px;color:#64748b;font-size:0.9em">
    <span>By {author_name}</span><span>•</span><span>{publish_date}</span><span>•</span><span>{read_time} min read</span>
  </div>
</header>
<p style="font-size:1.15em;color:#374151;line-height:1.8;margin-top:24px">{intro_paragraph}</p>
<nav style="background:#f8fafc;padding:20px;border-radius:8px;margin:24px 0">
  <strong>Table of Contents</strong>
  <ul style="margin-top:8px;padding-left:20px"><li>{section_1_title}</li><li>{section_2_title}</li><li>{section_3_title}</li></ul>
</nav>
<section><h2>{section_1_title}</h2><p style="line-height:1.8">{section_1_content}</p></section>
<section style="margin-top:24px"><h2>{section_2_title}</h2><p style="line-height:1.8">{section_2_content}</p></section>
<section style="margin-top:24px"><h2>{section_3_title}</h2><p style="line-height:1.8">{section_3_content}</p></section>
<div style="background:#f1f5f9;padding:24px;border-radius:8px;margin-top:32px;display:flex;gap:16px;align-items:center">
  <div style="width:56px;height:56px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:1.4em">✍️</div>
  <div><strong>{author_name}</strong><p style="color:#64748b;font-size:0.85em;margin-top:4px">{author_bio}</p></div>
</div>
</article>`,
    variables: ["{title}", "{category}", "{author_name}", "{publish_date}", "{read_time}", "{intro_paragraph}", "{section_1_title}", "{section_1_content}", "{section_2_title}", "{section_2_content}", "{section_3_title}", "{section_3_content}", "{author_bio}"],
    category: "marketing",
    tags: ["blog", "content", "seo", "article"],
    author: "Community",
    downloads: 2108,
    rating: 4.7,
    seo_title_pattern: "{title} | {category}",
    seo_description_pattern: "{intro_paragraph:truncate(155)}",
    schema_type: "Article",
  },
  {
    id: "dental-clinic",
    name: "Dental Clinic Location",
    description: "Professional dental practice page with services, team, and booking CTA for local SEO.",
    content: `<div class="template">
<header style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;padding:48px 32px;border-radius:12px">
  <h1 style="font-size:2.4em;margin-bottom:8px">{clinic_name} — Dentist in {city}</h1>
  <p style="font-size:1.1em;opacity:0.9">Quality dental care for the whole family in {city}, {state}</p>
  <p style="margin-top:20px;font-size:1.3em">📞 {phone} &nbsp; | &nbsp; 📍 {address}</p>
</header>
<section style="padding:32px 0">
  <h2>Our Dental Services</h2>
  <p style="color:#64748b">{services_list}</p>
</section>
<section style="background:#f0f9ff;padding:32px;border-radius:8px">
  <h2>Meet Dr. {doctor_name}</h2>
  <p>{doctor_bio}</p>
</section>
<section style="padding:32px 0;text-align:center">
  <h2>Book Your Appointment Today</h2>
  <p style="color:#64748b">Serving patients in {city}, {nearby_areas}</p>
  <p style="margin-top:16px;font-size:1.2em;font-weight:600">Call {phone} or visit us at {address}</p>
</section>
</div>`,
    variables: ["{clinic_name}", "{city}", "{state}", "{phone}", "{address}", "{services_list}", "{doctor_name}", "{doctor_bio}", "{nearby_areas}"],
    category: "health",
    tags: ["dental", "clinic", "local", "health"],
    author: "Community",
    downloads: 734,
    rating: 4.5,
    seo_title_pattern: "{clinic_name} — Dentist in {city}, {state}",
    seo_description_pattern: "Visit {clinic_name} for quality dental care in {city}. Services: {services_list:truncate(100)}. Call {phone}.",
    schema_type: "LocalBusiness",
  },
  {
    id: "course-landing",
    name: "Online Course Landing",
    description: "Conversion-focused landing page for online courses with curriculum, instructor, and enrollment CTA.",
    content: `<div class="template">
<header style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:56px 32px;text-align:center;border-radius:12px">
  <span style="background:rgba(255,255,255,0.2);padding:4px 14px;border-radius:20px;font-size:0.85em">{category:uppercase}</span>
  <h1 style="font-size:2.6em;margin:16px 0">{course_title}</h1>
  <p style="font-size:1.2em;opacity:0.9;max-width:600px;margin:0 auto">{course_subtitle}</p>
  <div style="margin-top:24px;display:flex;justify-content:center;gap:24px;font-size:0.95em">
    <span>🎓 {lessons_count} Lessons</span><span>⏱️ {duration}</span><span>📊 {level}</span>
  </div>
  <button style="margin-top:28px;background:#fff;color:#d97706;border:none;padding:14px 40px;border-radius:8px;font-size:1.1em;font-weight:700;cursor:pointer">Enroll Now — {price}</button>
</header>
<section style="padding:40px 32px">
  <h2>What You'll Learn</h2>
  <p style="color:#64748b;line-height:1.8">{learning_outcomes}</p>
</section>
<section style="background:#fffbeb;padding:32px;border-radius:8px">
  <h2>Your Instructor: {instructor_name}</h2>
  <p style="color:#64748b">{instructor_bio}</p>
</section>
</div>`,
    variables: ["{course_title}", "{course_subtitle}", "{category}", "{lessons_count}", "{duration}", "{level}", "{price}", "{learning_outcomes}", "{instructor_name}", "{instructor_bio}"],
    category: "education",
    tags: ["course", "education", "landing", "online"],
    author: "Community",
    downloads: 956,
    rating: 4.7,
    seo_title_pattern: "{course_title} — Online Course | {category}",
    seo_description_pattern: "{course_subtitle}. {lessons_count} lessons, {duration}. Taught by {instructor_name}.",
    schema_type: "Course",
  },
  {
    id: "law-firm",
    name: "Law Firm Practice Area",
    description: "Professional law firm page for specific practice areas with credentials and consultation CTA.",
    content: `<div class="template">
<header style="background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:48px 32px;border-radius:12px">
  <h1 style="font-size:2.4em;margin-bottom:8px">{practice_area} Attorney in {city}</h1>
  <p style="font-size:1.1em;opacity:0.85">{firm_name} — Experienced {practice_area:lowercase} lawyers serving {city}, {state}</p>
  <button style="margin-top:24px;background:#f59e0b;color:#1e293b;border:none;padding:14px 32px;border-radius:8px;font-size:1.1em;font-weight:700;cursor:pointer">Free Consultation: {phone}</button>
</header>
<section style="padding:32px 0">
  <h2>How We Can Help</h2>
  <p style="line-height:1.8">{practice_description}</p>
</section>
<section style="background:#f8fafc;padding:32px;border-radius:8px">
  <h2>Why {firm_name}?</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:16px">
    <div style="text-align:center"><p style="font-size:2em;font-weight:700">{years_experience}+</p><p style="color:#64748b">Years Experience</p></div>
    <div style="text-align:center"><p style="font-size:2em;font-weight:700">{cases_won}+</p><p style="color:#64748b">Cases Won</p></div>
    <div style="text-align:center"><p style="font-size:2em;font-weight:700">5.0</p><p style="color:#64748b">Client Rating</p></div>
  </div>
</section>
</div>`,
    variables: ["{practice_area}", "{city}", "{state}", "{firm_name}", "{phone}", "{practice_description}", "{years_experience}", "{cases_won}"],
    category: "professional",
    tags: ["law", "attorney", "legal", "professional"],
    author: "Community",
    downloads: 621,
    rating: 4.4,
    seo_title_pattern: "{practice_area} Lawyer in {city}, {state} | {firm_name}",
    seo_description_pattern: "Experienced {practice_area:lowercase} attorney in {city}. {firm_name} has {years_experience}+ years of experience. Call {phone} for a free consultation.",
    schema_type: "LocalBusiness",
  },
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
    </div>
  );
}
