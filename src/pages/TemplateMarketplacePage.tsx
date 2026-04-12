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
  { id: "wordpress", label: "WordPress", icon: FileText },
  { id: "shopify", label: "Shopify", icon: ShoppingBag },
  { id: "prestashop", label: "PrestaShop", icon: Tag },
];

// Shared responsive base styles injected into every template
const TEMPLATE_BASE_STYLES = `<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.7}
.t-container{max-width:960px;margin:0 auto;padding:0 20px}
.t-hero{padding:56px 32px;border-radius:16px;text-align:center;position:relative;overflow:hidden}
.t-hero h1{font-size:clamp(1.6rem,4vw,2.8rem);font-weight:800;line-height:1.15;margin-bottom:12px}
.t-hero p{font-size:clamp(0.95rem,2vw,1.2rem);opacity:0.92;max-width:640px;margin:0 auto}
.t-btn{display:inline-block;padding:14px 36px;border-radius:10px;font-weight:700;font-size:1rem;cursor:pointer;border:none;text-decoration:none;transition:transform .2s,box-shadow .2s}
.t-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.15)}
.t-grid{display:grid;gap:24px}
.t-grid-2{grid-template-columns:repeat(2,1fr)}
.t-grid-3{grid-template-columns:repeat(3,1fr)}
.t-grid-4{grid-template-columns:repeat(4,1fr)}
.t-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;transition:transform .2s,box-shadow .2s}
.t-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.08)}
.t-section{padding:48px 0}
.t-section h2{font-size:clamp(1.3rem,3vw,2rem);font-weight:700;margin-bottom:16px}
.t-badge{display:inline-block;padding:5px 14px;border-radius:99px;font-size:0.78rem;font-weight:600;letter-spacing:0.03em}
.t-stat{text-align:center}
.t-stat .num{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;line-height:1}
.t-stat .lbl{font-size:0.85rem;color:#64748b;margin-top:4px}
.t-testimonial{background:#f8fafc;border-radius:14px;padding:28px;border-left:4px solid #3b82f6}
.t-stars{color:#f59e0b;font-size:1.1rem;letter-spacing:2px}
.t-form-group{margin-bottom:16px}
.t-form-group label{display:block;font-weight:600;font-size:0.85rem;margin-bottom:6px;color:#475569}
.t-form-group input,.t-form-group textarea,.t-form-group select{width:100%;padding:12px 16px;border:1px solid #cbd5e1;border-radius:10px;font-size:0.95rem;font-family:inherit}
.t-footer{background:#0f172a;color:#e2e8f0;padding:40px 32px;border-radius:14px;margin-top:32px}
.t-footer a{color:#93c5fd;text-decoration:none}
.t-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#f1f5f9;border-radius:99px;font-size:0.82rem;font-weight:500;color:#475569}
@media(max-width:768px){
  .t-grid-2,.t-grid-3,.t-grid-4{grid-template-columns:1fr}
  .t-hero{padding:40px 20px;border-radius:12px}
  .t-section{padding:32px 0}
  .t-card{padding:20px}
}
@media(min-width:769px) and (max-width:1024px){
  .t-grid-3{grid-template-columns:repeat(2,1fr)}
  .t-grid-4{grid-template-columns:repeat(2,1fr)}
}
</style>`;

// Built-in community templates
const COMMUNITY_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: "local-plumber",
    name: "Local Plumber Landing",
    description: "High-converting landing page for local plumbing services with service areas, pricing, and trust signals.",
    content: `${TEMPLATE_BASE_STYLES}
<div class="t-container">
  <div class="t-hero" style="background:linear-gradient(135deg,#0f4c81,#1a73b5,#2196f3);color:#fff">
    <div style="position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2280%22 cy=%2220%22 r=%2240%22 fill=%22rgba(255,255,255,0.04)%22/><circle cx=%2220%22 cy=%2280%22 r=%2260%22 fill=%22rgba(255,255,255,0.03)%22/></svg>')"></div>
    <div style="position:relative;z-index:1">
      <span class="t-badge" style="background:rgba(255,255,255,0.15);color:#fff;margin-bottom:16px">⭐ Rated 5-Stars in {city}</span>
      <h1>{company_name} — Professional {service} in {city}</h1>
      <p>Trusted {service:lowercase} experts serving {city} and the greater {state} area. Fast response, honest pricing, guaranteed satisfaction.</p>
      <div style="margin-top:28px;display:flex;flex-wrap:wrap;justify-content:center;gap:12px">
        <a class="t-btn" style="background:#fff;color:#0f4c81">📞 Call {phone}</a>
        <a class="t-btn" style="background:rgba(255,255,255,0.15);color:#fff;border:2px solid rgba(255,255,255,0.3)">Get Free Estimate</a>
      </div>
    </div>
  </div>

  <div class="t-section">
    <h2 style="text-align:center">Why Homeowners in {city} Choose Us</h2>
    <div class="t-grid t-grid-3" style="margin-top:24px">
      <div class="t-card" style="text-align:center;border-top:4px solid #2196f3">
        <div style="font-size:2.4rem;margin-bottom:12px">⚡</div>
        <h3 style="font-weight:700;margin-bottom:8px">Same-Day Service</h3>
        <p style="color:#64748b;font-size:0.92rem">Emergency? We arrive within hours, not days. Available 24/7 in {city}.</p>
      </div>
      <div class="t-card" style="text-align:center;border-top:4px solid #10b981">
        <div style="font-size:2.4rem;margin-bottom:12px">💰</div>
        <h3 style="font-weight:700;margin-bottom:8px">Transparent Pricing</h3>
        <p style="color:#64748b;font-size:0.92rem">Free estimates upfront. No hidden fees, no surprises on your bill.</p>
      </div>
      <div class="t-card" style="text-align:center;border-top:4px solid #f59e0b">
        <div style="font-size:2.4rem;margin-bottom:12px">🛡️</div>
        <h3 style="font-weight:700;margin-bottom:8px">Licensed & Insured</h3>
        <p style="color:#64748b;font-size:0.92rem">Fully certified professionals with {years_experience}+ years of experience in {state}.</p>
      </div>
    </div>
  </div>

  <div class="t-section" style="background:#f0f9ff;padding:40px 32px;border-radius:16px">
    <h2>Our {service} Services</h2>
    <p style="color:#475569;line-height:1.8;margin-bottom:20px">{service_description}</p>
    <div class="t-grid t-grid-4" style="margin-top:20px">
      <div class="t-chip">🔧 Repairs</div>
      <div class="t-chip">🏗️ Installation</div>
      <div class="t-chip">🔍 Inspections</div>
      <div class="t-chip">🚨 Emergency</div>
    </div>
  </div>

  <div class="t-section">
    <h2 style="text-align:center">What Our Customers Say</h2>
    <div class="t-grid t-grid-2" style="margin-top:24px">
      <div class="t-testimonial">
        <div class="t-stars">★★★★★</div>
        <p style="margin-top:12px;color:#334155;font-style:italic">"Best {service:lowercase} service in {city}! Fast, professional, and fairly priced. Highly recommend {company_name}."</p>
        <p style="margin-top:12px;font-weight:600;font-size:0.85rem;color:#64748b">— Verified Customer, {city}</p>
      </div>
      <div class="t-testimonial">
        <div class="t-stars">★★★★★</div>
        <p style="margin-top:12px;color:#334155;font-style:italic">"They came out the same day and fixed our issue quickly. Will definitely use again for any future {service:lowercase} needs."</p>
        <p style="margin-top:12px;font-weight:600;font-size:0.85rem;color:#64748b">— Homeowner, {state}</p>
      </div>
    </div>
  </div>

  <div class="t-section" style="background:linear-gradient(135deg,#0f4c81,#1a73b5);padding:48px 32px;border-radius:16px;text-align:center;color:#fff">
    <h2 style="color:#fff">Need {service} in {city}?</h2>
    <p style="opacity:0.9;margin-bottom:24px">Serving {city}, {nearby_cities} and all of {state}. Available 24/7.</p>
    <a class="t-btn" style="background:#fff;color:#0f4c81;font-size:1.1rem">📞 Call {phone} Now</a>
  </div>

  <div class="t-footer">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px">
      <div><strong style="font-size:1.1rem;color:#fff">{company_name}</strong><p style="font-size:0.85rem;margin-top:4px">Licensed {service} professionals in {city}, {state}</p></div>
      <div style="text-align:right"><p style="font-size:0.85rem">📞 {phone}</p><p style="font-size:0.85rem;margin-top:4px">Serving {nearby_cities}</p></div>
    </div>
  </div>
</div>`,
    variables: ["{company_name}", "{service}", "{city}", "{state}", "{phone}", "{service_description}", "{nearby_cities}", "{years_experience}"],
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
    content: `${TEMPLATE_BASE_STYLES}
<div class="t-container">
  <div style="padding:8px 0">
    <span style="color:#64748b;font-size:0.82rem">Home / {category} / <strong style="color:#1e293b">{product_name}</strong></span>
  </div>

  <div class="t-grid t-grid-2" style="gap:48px;padding:24px 0;align-items:start">
    <div>
      <div style="background:linear-gradient(145deg,#f1f5f9,#e2e8f0);border-radius:20px;padding:60px;display:flex;align-items:center;justify-content:center;aspect-ratio:1/1">
        <p style="color:#94a3b8;font-size:1.1rem;text-align:center">📸 {product_name}</p>
      </div>
      <div class="t-grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px">
        <div style="background:#f1f5f9;border-radius:10px;aspect-ratio:1;border:2px solid #3b82f6"></div>
        <div style="background:#f1f5f9;border-radius:10px;aspect-ratio:1;border:2px solid transparent"></div>
        <div style="background:#f1f5f9;border-radius:10px;aspect-ratio:1;border:2px solid transparent"></div>
        <div style="background:#f1f5f9;border-radius:10px;aspect-ratio:1;border:2px solid transparent"></div>
      </div>
    </div>

    <div>
      <span class="t-badge" style="background:#eff6ff;color:#2563eb">{category:uppercase}</span>
      <h1 style="font-size:clamp(1.5rem,3vw,2.2rem);font-weight:800;margin:12px 0 8px">{product_name}</h1>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <span class="t-stars">★★★★★</span>
        <span style="font-size:0.85rem;color:#64748b">(128 reviews)</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:20px">
        <span style="font-size:2rem;font-weight:800;color:#0f172a">{price}</span>
        <span style="font-size:1rem;color:#94a3b8;text-decoration:line-through">{compare_price}</span>
        <span class="t-badge" style="background:#dcfce7;color:#16a34a">Save {discount}%</span>
      </div>
      <p style="color:#475569;line-height:1.8;margin-bottom:24px">{description}</p>

      <div style="background:#f8fafc;padding:20px;border-radius:14px;margin-bottom:24px">
        <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:12px">✨ Key Features</h3>
        <p style="color:#475569;font-size:0.92rem;line-height:1.8">{features}</p>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <button class="t-btn" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;flex:1;text-align:center">🛒 Add to Cart</button>
        <button class="t-btn" style="background:#f1f5f9;color:#1e293b;border:1px solid #e2e8f0">♡ Wishlist</button>
      </div>

      <div class="t-grid" style="grid-template-columns:repeat(3,1fr);gap:12px;margin-top:24px">
        <div class="t-chip" style="justify-content:center">🚚 Free Shipping</div>
        <div class="t-chip" style="justify-content:center">↩️ 30-Day Returns</div>
        <div class="t-chip" style="justify-content:center">🔒 Secure Checkout</div>
      </div>
    </div>
  </div>

  <div class="t-section" style="border-top:1px solid #e2e8f0">
    <h2>Product Details</h2>
    <p style="color:#475569;line-height:1.9">{long_description}</p>
  </div>
</div>`,
    variables: ["{product_name}", "{category}", "{price}", "{compare_price}", "{discount}", "{description}", "{features}", "{long_description}"],
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
    content: `${TEMPLATE_BASE_STYLES}
<div class="t-container">
  <div class="t-hero" style="background:linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7);color:#fff;padding:72px 32px">
    <div style="position:absolute;inset:0;opacity:0.1;background:radial-gradient(circle at 30% 50%,#fff 0%,transparent 50%),radial-gradient(circle at 70% 50%,#fff 0%,transparent 50%)"></div>
    <div style="position:relative;z-index:1">
      <span class="t-badge" style="background:rgba(255,255,255,0.15);color:#fff;margin-bottom:20px">🚀 Now available for teams</span>
      <h1 style="font-size:clamp(2rem,5vw,3.2rem)">{headline}</h1>
      <p style="margin-top:12px">{subheadline}</p>
      <div style="margin-top:32px;display:flex;flex-wrap:wrap;justify-content:center;gap:12px">
        <a class="t-btn" style="background:#fff;color:#4f46e5">{cta_text} →</a>
        <a class="t-btn" style="background:transparent;color:#fff;border:2px solid rgba(255,255,255,0.3)">Watch Demo</a>
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:24px;margin-top:28px;font-size:0.88rem;opacity:0.85">
        <span>✓ Free 14-day trial</span><span>✓ No credit card required</span><span>✓ Cancel anytime</span>
      </div>
    </div>
  </div>

  <div class="t-section" style="text-align:center">
    <span class="t-badge" style="background:#ede9fe;color:#6d28d9">Features</span>
    <h2 style="margin-top:12px">Why {product_name}?</h2>
    <p style="color:#64748b;max-width:600px;margin:8px auto 0">Everything you need to scale your business, all in one platform.</p>
    <div class="t-grid t-grid-3" style="margin-top:32px;text-align:left">
      <div class="t-card" style="border:none;background:linear-gradient(145deg,#faf5ff,#f5f3ff)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:16px">⚡</div>
        <h3 style="font-weight:700;margin-bottom:8px">{feature_1_title}</h3>
        <p style="color:#64748b;font-size:0.92rem;line-height:1.7">{feature_1_desc}</p>
      </div>
      <div class="t-card" style="border:none;background:linear-gradient(145deg,#f0fdf4,#ecfdf5)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#10b981,#34d399);display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:16px">📊</div>
        <h3 style="font-weight:700;margin-bottom:8px">{feature_2_title}</h3>
        <p style="color:#64748b;font-size:0.92rem;line-height:1.7">{feature_2_desc}</p>
      </div>
      <div class="t-card" style="border:none;background:linear-gradient(145deg,#eff6ff,#dbeafe)">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#60a5fa);display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:16px">🔒</div>
        <h3 style="font-weight:700;margin-bottom:8px">{feature_3_title}</h3>
        <p style="color:#64748b;font-size:0.92rem;line-height:1.7">{feature_3_desc}</p>
      </div>
    </div>
  </div>

  <div class="t-section">
    <div class="t-grid t-grid-4">
      <div class="t-stat"><div class="num" style="color:#4f46e5">10K+</div><div class="lbl">Active Users</div></div>
      <div class="t-stat"><div class="num" style="color:#4f46e5">99.9%</div><div class="lbl">Uptime</div></div>
      <div class="t-stat"><div class="num" style="color:#4f46e5">50M+</div><div class="lbl">API Calls/Day</div></div>
      <div class="t-stat"><div class="num" style="color:#4f46e5">4.9★</div><div class="lbl">User Rating</div></div>
    </div>
  </div>

  <div class="t-hero" style="background:linear-gradient(135deg,#4f46e5,#6d28d9);color:#fff;margin-top:8px">
    <h2 style="color:#fff;font-size:clamp(1.4rem,3vw,2.2rem)">{bottom_cta_headline}</h2>
    <p style="margin-top:8px">{bottom_cta_description}</p>
    <a class="t-btn" style="background:#fff;color:#4f46e5;margin-top:24px">{cta_text} →</a>
  </div>
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
    content: `${TEMPLATE_BASE_STYLES}
<article class="t-container" style="max-width:780px;padding-top:32px;padding-bottom:48px">
  <header>
    <span class="t-badge" style="background:#eff6ff;color:#2563eb">{category:uppercase}</span>
    <h1 style="font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;margin:16px 0 12px;line-height:1.15">{title}</h1>
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid #e2e8f0">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.9rem">{author_name:charAt(0)}</div>
        <div><strong style="font-size:0.9rem">{author_name}</strong><p style="font-size:0.78rem;color:#64748b">{publish_date}</p></div>
      </div>
      <div style="display:flex;gap:12px;margin-left:auto">
        <span class="t-chip">📖 {read_time} min read</span>
      </div>
    </div>
  </header>

  <p style="font-size:1.15rem;color:#334155;line-height:1.9;margin-top:28px;padding-bottom:24px;border-bottom:1px solid #f1f5f9">{intro_paragraph}</p>

  <nav style="background:linear-gradient(145deg,#f8fafc,#f1f5f9);padding:24px 28px;border-radius:14px;margin:28px 0">
    <strong style="font-size:0.9rem;display:flex;align-items:center;gap:8px">📋 Table of Contents</strong>
    <ul style="margin-top:12px;padding-left:20px;list-style:none">
      <li style="padding:6px 0;font-size:0.92rem"><a style="color:#3b82f6;text-decoration:none;font-weight:500">1. {section_1_title}</a></li>
      <li style="padding:6px 0;font-size:0.92rem"><a style="color:#3b82f6;text-decoration:none;font-weight:500">2. {section_2_title}</a></li>
      <li style="padding:6px 0;font-size:0.92rem"><a style="color:#3b82f6;text-decoration:none;font-weight:500">3. {section_3_title}</a></li>
    </ul>
  </nav>

  <section style="margin-top:32px">
    <h2 style="display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:2px solid #3b82f6"><span style="background:#3b82f6;color:#fff;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700">1</span>{section_1_title}</h2>
    <p style="line-height:1.9;color:#374151;margin-top:16px">{section_1_content}</p>
  </section>

  <section style="margin-top:40px">
    <h2 style="display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:2px solid #8b5cf6"><span style="background:#8b5cf6;color:#fff;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700">2</span>{section_2_title}</h2>
    <p style="line-height:1.9;color:#374151;margin-top:16px">{section_2_content}</p>
  </section>

  <section style="margin-top:40px">
    <h2 style="display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:2px solid #10b981"><span style="background:#10b981;color:#fff;width:32px;height:32px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700">3</span>{section_3_title}</h2>
    <p style="line-height:1.9;color:#374151;margin-top:16px">{section_3_content}</p>
  </section>

  <div style="background:linear-gradient(145deg,#f8fafc,#f1f5f9);padding:28px;border-radius:16px;margin-top:48px;display:flex;flex-wrap:wrap;gap:20px;align-items:center">
    <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:1.6em;flex-shrink:0">✍️</div>
    <div style="flex:1;min-width:200px">
      <strong style="font-size:1rem">{author_name}</strong>
      <p style="color:#64748b;font-size:0.88rem;margin-top:4px;line-height:1.6">{author_bio}</p>
    </div>
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
    content: `${TEMPLATE_BASE_STYLES}
<div class="t-container">
  <div class="t-hero" style="background:linear-gradient(135deg,#0891b2,#06b6d4,#22d3ee);color:#fff">
    <div style="position:relative;z-index:1">
      <span class="t-badge" style="background:rgba(255,255,255,0.15);color:#fff;margin-bottom:16px">🦷 Trusted Dental Care</span>
      <h1>{clinic_name} — Your Dentist in {city}</h1>
      <p>Comprehensive dental care for the whole family in {city}, {state}. Gentle, modern dentistry you can trust.</p>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-top:28px">
        <a class="t-btn" style="background:#fff;color:#0891b2">📞 Call {phone}</a>
        <a class="t-btn" style="background:rgba(255,255,255,0.15);color:#fff;border:2px solid rgba(255,255,255,0.3)">Book Online</a>
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:24px;margin-top:24px;font-size:0.88rem">
        <span>📍 {address}</span><span>⏰ Mon–Fri 9am–6pm</span>
      </div>
    </div>
  </div>

  <div class="t-section" style="text-align:center">
    <span class="t-badge" style="background:#ecfeff;color:#0891b2">Our Services</span>
    <h2 style="margin-top:12px">Dental Services in {city}</h2>
    <div class="t-grid t-grid-3" style="margin-top:28px">
      <div class="t-card" style="text-align:center;border:none;background:#f0fdfa">
        <div style="font-size:2.2rem;margin-bottom:12px">😁</div>
        <h3 style="font-weight:700;margin-bottom:8px">General Dentistry</h3>
        <p style="color:#64748b;font-size:0.88rem">Cleanings, fillings, and preventive care for healthy smiles.</p>
      </div>
      <div class="t-card" style="text-align:center;border:none;background:#eff6ff">
        <div style="font-size:2.2rem;margin-bottom:12px">✨</div>
        <h3 style="font-weight:700;margin-bottom:8px">Cosmetic Dentistry</h3>
        <p style="color:#64748b;font-size:0.88rem">Whitening, veneers, and smile makeovers for a confident you.</p>
      </div>
      <div class="t-card" style="text-align:center;border:none;background:#fef3c7">
        <div style="font-size:2.2rem;margin-bottom:12px">🔧</div>
        <h3 style="font-weight:700;margin-bottom:8px">Restorative</h3>
        <p style="color:#64748b;font-size:0.88rem">Crowns, bridges, implants to restore your smile's function.</p>
      </div>
    </div>
    <p style="color:#475569;margin-top:24px;line-height:1.8">{services_list}</p>
  </div>

  <div class="t-section" style="background:linear-gradient(145deg,#f0fdfa,#ecfeff);padding:40px 32px;border-radius:16px">
    <div class="t-grid t-grid-2" style="align-items:center;gap:40px">
      <div>
        <span class="t-badge" style="background:#ccfbf1;color:#0d9488">Meet Your Doctor</span>
        <h2 style="margin-top:12px">Dr. {doctor_name}</h2>
        <p style="color:#475569;line-height:1.8;margin-top:12px">{doctor_bio}</p>
        <div class="t-grid" style="grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px">
          <div class="t-stat"><div class="num" style="color:#0891b2;font-size:1.6rem">15+</div><div class="lbl">Years Exp.</div></div>
          <div class="t-stat"><div class="num" style="color:#0891b2;font-size:1.6rem">5K+</div><div class="lbl">Patients</div></div>
          <div class="t-stat"><div class="num" style="color:#0891b2;font-size:1.6rem">4.9★</div><div class="lbl">Rating</div></div>
        </div>
      </div>
      <div style="background:#fff;border-radius:20px;padding:48px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.06)">
        <div style="font-size:4rem">🩺</div>
        <p style="color:#94a3b8;margin-top:12px;font-size:0.9rem">Dr. {doctor_name}</p>
      </div>
    </div>
  </div>

  <div class="t-hero" style="background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;margin-top:48px">
    <h2 style="color:#fff">Ready for a Healthier Smile?</h2>
    <p>Book your appointment at {clinic_name} in {city} today.</p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:24px">
      <a class="t-btn" style="background:#fff;color:#0891b2">📞 Call {phone}</a>
      <a class="t-btn" style="background:rgba(255,255,255,0.15);color:#fff;border:2px solid rgba(255,255,255,0.3)">📍 Get Directions</a>
    </div>
    <p style="margin-top:16px;font-size:0.88rem;opacity:0.8">Also serving {nearby_areas}</p>
  </div>
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
    content: `${TEMPLATE_BASE_STYLES}
<div class="t-container">
  <div class="t-hero" style="background:linear-gradient(135deg,#d97706,#f59e0b,#fbbf24);color:#fff;padding:72px 32px">
    <div style="position:relative;z-index:1">
      <span class="t-badge" style="background:rgba(255,255,255,0.2);color:#fff;margin-bottom:20px">{category:uppercase}</span>
      <h1 style="font-size:clamp(1.8rem,4.5vw,3rem)">{course_title}</h1>
      <p style="margin-top:12px">{course_subtitle}</p>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:20px;margin-top:28px">
        <span class="t-chip" style="background:rgba(255,255,255,0.2);color:#fff">🎓 {lessons_count} Lessons</span>
        <span class="t-chip" style="background:rgba(255,255,255,0.2);color:#fff">⏱️ {duration}</span>
        <span class="t-chip" style="background:rgba(255,255,255,0.2);color:#fff">📊 {level}</span>
        <span class="t-chip" style="background:rgba(255,255,255,0.2);color:#fff">📜 Certificate</span>
      </div>
      <div style="margin-top:32px;display:flex;flex-wrap:wrap;justify-content:center;gap:12px;align-items:center">
        <a class="t-btn" style="background:#fff;color:#d97706;font-size:1.1rem">Enroll Now — {price}</a>
        <span style="font-size:0.9rem;opacity:0.85">30-day money-back guarantee</span>
      </div>
    </div>
  </div>

  <div class="t-section" style="text-align:center">
    <span class="t-badge" style="background:#fef3c7;color:#b45309">Curriculum</span>
    <h2 style="margin-top:12px">What You'll Learn</h2>
    <p style="color:#64748b;max-width:600px;margin:8px auto 0">{course_subtitle}</p>
  </div>

  <div style="background:#fffbeb;padding:32px;border-radius:16px;margin-top:-16px">
    <p style="color:#475569;line-height:1.9;font-size:0.95rem">{learning_outcomes}</p>
  </div>

  <div class="t-section">
    <div class="t-grid t-grid-4">
      <div class="t-stat"><div class="num" style="color:#d97706">{lessons_count}</div><div class="lbl">Lessons</div></div>
      <div class="t-stat"><div class="num" style="color:#d97706">{duration}</div><div class="lbl">Total Duration</div></div>
      <div class="t-stat"><div class="num" style="color:#d97706">4.9★</div><div class="lbl">Average Rating</div></div>
      <div class="t-stat"><div class="num" style="color:#d97706">2K+</div><div class="lbl">Students</div></div>
    </div>
  </div>

  <div class="t-section" style="background:linear-gradient(145deg,#fffbeb,#fef3c7);padding:40px 32px;border-radius:16px">
    <div class="t-grid t-grid-2" style="align-items:center;gap:40px">
      <div style="text-align:center">
        <div style="width:120px;height:120px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:3rem;box-shadow:0 8px 32px rgba(245,158,11,0.3)">👨‍🏫</div>
      </div>
      <div>
        <span class="t-badge" style="background:#fde68a;color:#92400e">Your Instructor</span>
        <h2 style="margin-top:12px">{instructor_name}</h2>
        <p style="color:#475569;line-height:1.8;margin-top:12px">{instructor_bio}</p>
      </div>
    </div>
  </div>

  <div class="t-hero" style="background:linear-gradient(135deg,#d97706,#b45309);color:#fff;margin-top:48px">
    <h2 style="color:#fff">Start Learning Today</h2>
    <p>Join thousands of students already enrolled in {course_title}.</p>
    <a class="t-btn" style="background:#fff;color:#d97706;margin-top:24px;font-size:1.1rem">Enroll Now — {price}</a>
    <p style="margin-top:12px;font-size:0.85rem;opacity:0.8">✓ Lifetime access · ✓ Certificate included · ✓ 30-day guarantee</p>
  </div>
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
    content: `${TEMPLATE_BASE_STYLES}
<div class="t-container">
  <div class="t-hero" style="background:linear-gradient(135deg,#0f172a,#1e293b,#334155);color:#fff;padding:64px 32px">
    <div style="position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect x=%2250%22 y=%220%22 width=%221%22 height=%22100%22 fill=%22rgba(255,255,255,0.03)%22/><rect x=%220%22 y=%2250%22 width=%22100%22 height=%221%22 fill=%22rgba(255,255,255,0.03)%22/></svg>')"></div>
    <div style="position:relative;z-index:1">
      <span class="t-badge" style="background:rgba(245,158,11,0.15);color:#fbbf24;margin-bottom:16px;border:1px solid rgba(245,158,11,0.3)">⚖️ Experienced Legal Counsel</span>
      <h1>{practice_area} Attorney in {city}</h1>
      <p>{firm_name} — Experienced {practice_area:lowercase} lawyers protecting your rights in {city}, {state}</p>
      <a class="t-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;margin-top:28px;font-size:1.05rem">Free Consultation — {phone}</a>
    </div>
  </div>

  <div class="t-section">
    <div class="t-grid t-grid-3">
      <div class="t-stat" style="background:#f8fafc;padding:28px;border-radius:14px">
        <div class="num" style="color:#0f172a">{years_experience}+</div><div class="lbl">Years of Experience</div>
      </div>
      <div class="t-stat" style="background:#f8fafc;padding:28px;border-radius:14px">
        <div class="num" style="color:#0f172a">{cases_won}+</div><div class="lbl">Cases Won</div>
      </div>
      <div class="t-stat" style="background:#f8fafc;padding:28px;border-radius:14px">
        <div class="num" style="color:#0f172a">5.0★</div><div class="lbl">Client Rating</div>
      </div>
    </div>
  </div>

  <div class="t-section">
    <span class="t-badge" style="background:#f1f5f9;color:#334155">How We Help</span>
    <h2 style="margin-top:12px">{practice_area} Legal Services</h2>
    <p style="color:#475569;line-height:1.9;margin-top:12px">{practice_description}</p>
  </div>

  <div class="t-section" style="background:linear-gradient(145deg,#f8fafc,#f1f5f9);padding:40px 32px;border-radius:16px">
    <h2 style="text-align:center">Why Clients Choose {firm_name}</h2>
    <div class="t-grid t-grid-3" style="margin-top:28px">
      <div class="t-card" style="text-align:center;border:none;background:#fff">
        <div style="font-size:2.2rem;margin-bottom:12px">🏛️</div>
        <h3 style="font-weight:700;margin-bottom:8px">Proven Track Record</h3>
        <p style="color:#64748b;font-size:0.88rem">{cases_won}+ successful outcomes in {practice_area:lowercase} cases across {state}.</p>
      </div>
      <div class="t-card" style="text-align:center;border:none;background:#fff">
        <div style="font-size:2.2rem;margin-bottom:12px">🤝</div>
        <h3 style="font-weight:700;margin-bottom:8px">Personal Attention</h3>
        <p style="color:#64748b;font-size:0.88rem">Direct access to your attorney. No runaround, no junior associates.</p>
      </div>
      <div class="t-card" style="text-align:center;border:none;background:#fff">
        <div style="font-size:2.2rem;margin-bottom:12px">💼</div>
        <h3 style="font-weight:700;margin-bottom:8px">No Fee Unless We Win</h3>
        <p style="color:#64748b;font-size:0.88rem">Contingency-based representation. You pay nothing upfront.</p>
      </div>
    </div>
  </div>

  <div class="t-section">
    <h2 style="text-align:center">Client Testimonials</h2>
    <div class="t-grid t-grid-2" style="margin-top:24px">
      <div class="t-testimonial" style="border-left-color:#f59e0b">
        <div class="t-stars">★★★★★</div>
        <p style="margin-top:12px;color:#334155;font-style:italic">"Outstanding {practice_area:lowercase} representation. {firm_name} fought hard for my case and delivered results beyond my expectations."</p>
        <p style="margin-top:12px;font-weight:600;font-size:0.85rem;color:#64748b">— Former Client, {city}</p>
      </div>
      <div class="t-testimonial" style="border-left-color:#f59e0b">
        <div class="t-stars">★★★★★</div>
        <p style="margin-top:12px;color:#334155;font-style:italic">"Professional, responsive, and truly cared about my situation. Highly recommend to anyone in {state} needing a {practice_area:lowercase} lawyer."</p>
        <p style="margin-top:12px;font-weight:600;font-size:0.85rem;color:#64748b">— Verified Client</p>
      </div>
    </div>
  </div>

  <div class="t-hero" style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;margin-top:16px">
    <h2 style="color:#fff">Get Your Free {practice_area} Consultation</h2>
    <p style="opacity:0.9">Serving {city}, {state} and surrounding communities. Available 24/7 for emergencies.</p>
    <a class="t-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;margin-top:24px;font-size:1.05rem">📞 Call {phone} — Free Case Review</a>
  </div>

  <div class="t-footer">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px">
      <div><strong style="font-size:1.1rem;color:#fff">⚖️ {firm_name}</strong><p style="font-size:0.85rem;margin-top:4px">{practice_area} Attorneys • {city}, {state}</p></div>
      <div style="text-align:right"><p style="font-size:0.85rem">📞 {phone}</p><p style="font-size:0.85rem;margin-top:4px">Free consultations available</p></div>
    </div>
  </div>
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
