// Marketplace template library — professional, theme-inheriting designs.
// Every template uses the shared `pgp-*` design system that:
//  • Inherits font + color from the connected website (no hardcoded text colors)
//  • Hero section uses a real Unsplash background image + dark gradient overlay
//  • Includes a testimonial carousel with avatars (i.pravatar.cc — free, fast)
//  • Niche-relevant free stock photos via Unsplash Source (no AI credits used)
//  • Buttons use `currentColor` so they pick up the host site's brand color
//
// This matches the style of AI-generated templates, ensuring visual consistency
// across the whole product.

import { FRAMER_TEMPLATES } from "@/lib/marketplace-framer-templates";
import { FRAMER_BATCH1_TEMPLATES } from "@/lib/marketplace-framer-batch1";
import { FRAMER_BATCH2_TEMPLATES } from "@/lib/marketplace-framer-batch2";
import { FRAMER_BATCH3_TEMPLATES } from "@/lib/marketplace-framer-batch3";
import { FRAMER_BATCH4_TEMPLATES } from "@/lib/marketplace-framer-batch4";
import { FRAMER_BATCH5_TEMPLATES } from "@/lib/marketplace-framer-batch5";
import { FRAMER_BATCH6_TEMPLATES } from "@/lib/marketplace-framer-batch6";
import { FRAMER_BATCH7_TEMPLATES } from "@/lib/marketplace-framer-batch7";
import { FRAMER_BATCH8_TEMPLATES } from "@/lib/marketplace-framer-batch8";
import { FRAMER_BATCH9_TEMPLATES } from "@/lib/marketplace-framer-batch9";
import { FRAMER_BATCH10_TEMPLATES } from "@/lib/marketplace-framer-batch10";
import { FRAMER_BATCH11_TEMPLATES } from "@/lib/marketplace-framer-batch11";
import { FRAMER_BATCH12_TEMPLATES } from "@/lib/marketplace-framer-batch12";
import { FRAMER_BATCH13_TEMPLATES } from "@/lib/marketplace-framer-batch13";
import { FRAMER_BATCH14_TEMPLATES } from "@/lib/marketplace-framer-batch14";
import { FRAMER_BATCH15_TEMPLATES } from "@/lib/marketplace-framer-batch15";
import { FRAMER_BATCH16_TEMPLATES } from "@/lib/marketplace-framer-batch16";
import { FRAMER_BATCH17_TEMPLATES } from "@/lib/marketplace-framer-batch17";
import { FRAMER_BATCH18_TEMPLATES } from "@/lib/marketplace-framer-batch18";
import { FRAMER_BATCH19_TEMPLATES } from "@/lib/marketplace-framer-batch19";

export interface MarketplaceTemplate {
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
  /** Open Graph / social share starter fields. */
  og_title_pattern?: string;
  og_description_pattern?: string;
  og_image_pattern?: string;
  /** URL slug pattern (lowercase, hyphenated) for the generated page. */
  slug_pattern?: string;
  schema_type?: string;
  /** Target CMS this template is designed + themed for. Derived from category. */
  platform?: "wordpress" | "shopify" | "prestashop" | "generic";
  isShared?: boolean;
  shared_id?: string;
  /** Sensible default values used to fill {variables} in the preview so no section looks empty. */
  defaultValues?: Record<string, string>;
  /** Live demo URL this template is modelled on. Used to fetch the real design on import. */
  sourceUrl?: string;
  /** Preview thumbnail image (real demo screenshot when available). */
  previewImage?: string;
}

/**
 * Replace simple {variable} placeholders with provided default values for preview
 * rendering. Leaves transforms, spintax, conditionals and dynamic blocks untouched
 * (those contain `|`, `:`, or `{{`), and keeps unknown variables as-is.
 */
export function applyTemplateDefaults(content: string, defaults?: Record<string, string>): string {
  if (!defaults) return content;
  return content.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(defaults, name) ? defaults[name] : match
  );
}



// ── Shared base styles ─────────────────────────────────────────────────────
// Modern "Lovable AI-vibe" design system: gradient meshes, glassmorphism,
// fluid typography, glowing CTAs, animated accents. Scoped to .pgp-page.
const BASE_STYLES = `<style>
@keyframes pgp-float{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-18px) translateX(8px)}}
@keyframes pgp-float-2{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(20px) translateX(-12px)}}
@keyframes pgp-fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes pgp-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes pgp-pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.35),0 12px 32px rgba(0,0,0,.18)}50%{box-shadow:0 0 0 14px rgba(99,102,241,0),0 18px 40px rgba(0,0,0,.22)}}
.pgp-page{font-family:inherit;color:inherit;line-height:1.7;max-width:100%;position:relative}
.pgp-page :where(*){box-sizing:border-box}
.pgp-page h1,.pgp-page h2,.pgp-page h3,.pgp-page h4{font-family:inherit;letter-spacing:-.025em;line-height:1.08;margin:0;font-weight:800}
.pgp-page p{margin:0;font-family:inherit}
.pgp-page a{color:inherit;text-decoration:none}
.pgp-page section{animation:pgp-fade-up .8s cubic-bezier(.2,.8,.2,1) both}
.pgp-wrap{max-width:1200px;margin:0 auto;padding:0 1.25rem;position:relative}
.pgp-section{padding:clamp(3.5rem,8vw,7rem) 0;position:relative}
.pgp-eyebrow{display:inline-flex;align-items:center;gap:.5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.22em;font-weight:700;margin-bottom:1rem;padding:.4rem .9rem;background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(217,70,239,.08));border:1px solid rgba(128,128,128,.18);border-radius:999px;backdrop-filter:blur(6px)}
.pgp-eyebrow::before{content:'';width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#d946ef);box-shadow:0 0 10px rgba(99,102,241,.6)}
.pgp-section-head{text-align:center;max-width:760px;margin:0 auto clamp(2.5rem,4.5vw,3.5rem)}
.pgp-section-head h2{font-size:clamp(1.9rem,4vw,3.2rem);margin-bottom:1rem;background:linear-gradient(135deg,currentColor 0%,currentColor 60%,rgba(128,128,128,.65) 100%);-webkit-background-clip:text;background-clip:text}
.pgp-section-head p{opacity:.72;font-size:clamp(1rem,1.25vw,1.15rem);max-width:600px;margin:0 auto}
.pgp-grid{display:grid;gap:1.5rem}
.pgp-grid-2{grid-template-columns:repeat(2,1fr)}
.pgp-grid-3{grid-template-columns:repeat(3,1fr)}
.pgp-grid-4{grid-template-columns:repeat(4,1fr)}
@media(max-width:992px){.pgp-grid-3,.pgp-grid-4{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.pgp-grid-2,.pgp-grid-3,.pgp-grid-4{grid-template-columns:1fr}}
.pgp-card{position:relative;background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(128,128,128,.06));border:1px solid rgba(128,128,128,.18);border-radius:24px;padding:2rem;transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease,border-color .35s ease;backdrop-filter:blur(12px);overflow:hidden}
.pgp-card::before{content:'';position:absolute;inset:0;border-radius:24px;padding:1px;background:linear-gradient(135deg,rgba(99,102,241,.4),transparent 40%,transparent 60%,rgba(217,70,239,.3));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .35s ease;pointer-events:none}
.pgp-card:hover{transform:translateY(-6px);box-shadow:0 24px 60px rgba(99,102,241,.18),0 8px 20px rgba(0,0,0,.08);border-color:rgba(99,102,241,.35)}
.pgp-card:hover::before{opacity:1}
.pgp-card .pgp-icon{width:56px;height:56px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(217,70,239,.14));border:1px solid rgba(99,102,241,.25);margin-bottom:1.25rem;box-shadow:0 8px 20px rgba(99,102,241,.18)}
.pgp-card h3{font-size:1.2rem;font-weight:700;margin-bottom:.6rem}
.pgp-card p{font-size:.97rem;opacity:.74;line-height:1.7}
.pgp-btn{display:inline-flex;align-items:center;gap:.55rem;padding:1rem 2.1rem;border-radius:999px;font-weight:600;font-size:.97rem;cursor:pointer;border:none;transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .25s ease,filter .25s ease;text-decoration:none;white-space:nowrap;position:relative;overflow:hidden}
.pgp-btn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);transition:left .6s ease}
.pgp-btn:hover{transform:translateY(-3px);filter:brightness(1.08)}
.pgp-btn:hover::after{left:100%}
.pgp-btn-primary{background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#d946ef 100%);color:#fff;box-shadow:0 12px 30px rgba(99,102,241,.4),inset 0 1px 0 rgba(255,255,255,.25)}
.pgp-btn-primary>*{color:#fff}
.pgp-btn-primary:hover{box-shadow:0 18px 40px rgba(99,102,241,.55),inset 0 1px 0 rgba(255,255,255,.3)}
.pgp-btn-ghost{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.35);color:#fff;backdrop-filter:blur(12px)}
.pgp-btn-ghost:hover{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.6)}
.pgp-btn-outline{background:transparent;border:1.5px solid rgba(128,128,128,.4)}
.pgp-hero{position:relative;overflow:hidden;border-radius:28px;min-height:clamp(440px,72vh,640px);display:flex;align-items:center;justify-content:center;text-align:center;background-size:cover;background-position:center;margin-top:1rem;box-shadow:0 30px 80px rgba(0,0,0,.18)}
.pgp-hero-overlay{position:absolute;inset:0;background:linear-gradient(135deg,rgba(15,23,42,.78) 0%,rgba(76,29,149,.55) 50%,rgba(15,23,42,.7) 100%);z-index:1}
.pgp-hero::before,.pgp-hero::after{content:'';position:absolute;border-radius:50%;filter:blur(80px);z-index:1;pointer-events:none}
.pgp-hero::before{width:420px;height:420px;background:radial-gradient(circle,rgba(99,102,241,.55),transparent 70%);top:-120px;left:-100px;animation:pgp-float 9s ease-in-out infinite}
.pgp-hero::after{width:380px;height:380px;background:radial-gradient(circle,rgba(217,70,239,.45),transparent 70%);bottom:-100px;right:-80px;animation:pgp-float-2 11s ease-in-out infinite}
.pgp-hero-inner{position:relative;z-index:3;padding:clamp(3rem,7vw,5.5rem) 1.5rem;max-width:920px;color:#fff;animation:pgp-fade-up 1s cubic-bezier(.2,.8,.2,1) both}
.pgp-hero-inner h1{font-size:clamp(2.4rem,6vw,4.4rem);font-weight:800;color:#fff;margin-bottom:1.25rem;letter-spacing:-.035em;text-shadow:0 4px 30px rgba(0,0,0,.4);background:linear-gradient(180deg,#fff 0%,#fff 60%,rgba(255,255,255,.75) 100%);-webkit-background-clip:text;background-clip:text}
.pgp-hero-inner p{font-size:clamp(1.05rem,1.5vw,1.3rem);color:rgba(255,255,255,.92);margin-bottom:2rem;line-height:1.6;max-width:680px;margin-left:auto;margin-right:auto}
.pgp-hero-cta{display:flex;flex-wrap:wrap;justify-content:center;gap:1rem}
.pgp-hero-cta .pgp-btn-primary{animation:pgp-pulse-glow 3.5s ease-in-out infinite}
.pgp-pill{display:inline-flex;align-items:center;gap:.5rem;padding:.55rem 1.1rem;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:999px;font-size:.82rem;font-weight:500;backdrop-filter:blur(12px);box-shadow:0 4px 16px rgba(0,0,0,.15)}
.pgp-eyebrow-light{display:inline-flex;align-items:center;gap:.5rem;color:rgba(255,255,255,.95);text-transform:uppercase;letter-spacing:.2em;font-size:.78rem;font-weight:700;margin-bottom:1.25rem;padding:.5rem 1rem;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:999px;backdrop-filter:blur(12px)}
.pgp-eyebrow-light::before{content:'';width:6px;height:6px;border-radius:50%;background:#a78bfa;box-shadow:0 0 12px rgba(167,139,250,.9)}
.pgp-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:1.5rem 3rem;padding:2rem;margin-top:-3rem;position:relative;z-index:5;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(128,128,128,.08));border:1px solid rgba(128,128,128,.18);border-radius:24px;backdrop-filter:blur(16px);max-width:900px;margin-left:auto;margin-right:auto;box-shadow:0 20px 50px rgba(0,0,0,.1)}
.pgp-trust>div{text-align:center}
.pgp-trust .num{font-size:clamp(1.6rem,2.5vw,2.4rem);font-weight:800;line-height:1;background:linear-gradient(135deg,#6366f1,#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.02em}
.pgp-trust .lbl{font-size:.74rem;opacity:.7;margin-top:.4rem;text-transform:uppercase;letter-spacing:.12em;font-weight:600}
.pgp-split{display:grid;gap:clamp(2.5rem,5vw,4.5rem);align-items:center;grid-template-columns:1fr 1fr}
@media(max-width:840px){.pgp-split{grid-template-columns:1fr}}
.pgp-split img{width:100%;border-radius:24px;aspect-ratio:4/3;object-fit:cover;box-shadow:0 30px 70px rgba(99,102,241,.18),0 8px 20px rgba(0,0,0,.1);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.pgp-split img:hover{transform:scale(1.02) rotate(-.5deg)}
.pgp-split h2{font-size:clamp(1.8rem,3.5vw,2.8rem);margin-bottom:1.25rem}
.pgp-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.pgp-gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:18px;transition:transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s ease;cursor:pointer}
.pgp-gallery img:hover{transform:scale(1.04) translateY(-4px);box-shadow:0 18px 40px rgba(99,102,241,.25)}
@media(max-width:640px){.pgp-gallery{grid-template-columns:repeat(2,1fr)}}
.pgp-carousel{display:flex;gap:1.5rem;overflow-x:auto;scroll-snap-type:x mandatory;padding:1rem .25rem 2rem;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.pgp-carousel::-webkit-scrollbar{height:6px}
.pgp-carousel::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#6366f1,#d946ef);border-radius:3px}
.pgp-tcard{flex:0 0 min(380px,86vw);scroll-snap-align:start;background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(128,128,128,.07));border:1px solid rgba(128,128,128,.18);border-radius:22px;padding:2rem;backdrop-filter:blur(12px);transition:transform .3s ease,box-shadow .3s ease}
.pgp-tcard:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(99,102,241,.18)}
.pgp-tcard .pgp-stars{background:linear-gradient(135deg,#fbbf24,#f59e0b);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:3px;font-size:1.05rem;margin-bottom:1rem}
.pgp-tcard .pgp-quote{font-style:italic;line-height:1.75;font-size:1rem;opacity:.88}
.pgp-tcard footer{display:flex;align-items:center;gap:.85rem;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(128,128,128,.18)}
.pgp-tcard footer img{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid rgba(99,102,241,.35);box-shadow:0 4px 12px rgba(99,102,241,.2)}
.pgp-tcard footer strong{display:block;font-size:.95rem;font-weight:700}
.pgp-tcard footer span{font-size:.8rem;opacity:.65}
.pgp-faq{max-width:780px;margin:0 auto}
.pgp-faq details{padding:1.25rem 1.5rem;background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(128,128,128,.06));border:1px solid rgba(128,128,128,.18);border-radius:16px;margin-bottom:.85rem;cursor:pointer;transition:border-color .3s ease,background .3s ease;backdrop-filter:blur(8px)}
.pgp-faq details:hover{border-color:rgba(99,102,241,.35)}
.pgp-faq details[open]{background:linear-gradient(145deg,rgba(99,102,241,.06),rgba(217,70,239,.04));border-color:rgba(99,102,241,.4)}
.pgp-faq summary{font-weight:600;font-size:1.02rem;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:1rem}
.pgp-faq summary::after{content:'+';font-size:1.5rem;font-weight:300;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(217,70,239,.12));transition:transform .3s ease;flex-shrink:0}
.pgp-faq details[open] summary::after{content:'−';transform:rotate(180deg)}
.pgp-faq details p{margin-top:1rem;opacity:.78;font-size:.97rem;line-height:1.75}
.pgp-cta-band{position:relative;overflow:hidden;border-radius:28px;padding:clamp(3rem,6vw,5rem) 1.5rem;text-align:center;background-size:cover;background-position:center;box-shadow:0 30px 80px rgba(99,102,241,.22)}
.pgp-cta-band::before,.pgp-cta-band::after{content:'';position:absolute;border-radius:50%;filter:blur(70px);z-index:1;pointer-events:none}
.pgp-cta-band::before{width:340px;height:340px;background:radial-gradient(circle,rgba(99,102,241,.5),transparent 70%);top:-100px;left:-80px;animation:pgp-float 8s ease-in-out infinite}
.pgp-cta-band::after{width:320px;height:320px;background:radial-gradient(circle,rgba(217,70,239,.45),transparent 70%);bottom:-90px;right:-60px;animation:pgp-float-2 10s ease-in-out infinite}
.pgp-cta-band .pgp-hero-overlay{background:linear-gradient(135deg,rgba(15,23,42,.82) 0%,rgba(76,29,149,.6) 50%,rgba(15,23,42,.78) 100%)}
.pgp-cta-band .pgp-cta-inner{position:relative;z-index:3;color:#fff;max-width:680px;margin:0 auto}
.pgp-cta-band h2{color:#fff;margin-bottom:1rem;font-size:clamp(1.8rem,3.5vw,2.8rem);background:linear-gradient(180deg,#fff,rgba(255,255,255,.8));-webkit-background-clip:text;background-clip:text}
.pgp-cta-band p{color:rgba(255,255,255,.92);margin-bottom:2rem;font-size:clamp(1rem,1.3vw,1.15rem)}
.pgp-contact{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start}
@media(max-width:768px){.pgp-contact{grid-template-columns:1fr}}
.pgp-info-row{display:flex;align-items:center;gap:1rem;padding:1rem 0;border-bottom:1px solid rgba(128,128,128,.16);transition:transform .25s ease}
.pgp-info-row:hover{transform:translateX(4px)}
.pgp-info-row:last-child{border-bottom:none}
.pgp-info-row .pgp-info-icon{width:44px;height:44px;border-radius:14px;background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(217,70,239,.12));border:1px solid rgba(99,102,241,.25);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;box-shadow:0 4px 12px rgba(99,102,241,.15)}
.pgp-form-group{margin-bottom:1.1rem}
.pgp-form-group label{display:block;font-size:.85rem;font-weight:600;margin-bottom:.5rem;opacity:.82}
.pgp-form-group input,.pgp-form-group textarea{width:100%;padding:.95rem 1.1rem;border:1px solid rgba(128,128,128,.28);border-radius:14px;font:inherit;background:rgba(128,128,128,.05);color:inherit;transition:border-color .25s ease,box-shadow .25s ease,background .25s ease}
.pgp-form-group input:focus,.pgp-form-group textarea:focus{outline:none;border-color:rgba(99,102,241,.6);background:rgba(99,102,241,.04);box-shadow:0 0 0 4px rgba(99,102,241,.12)}
.pgp-price{font-size:clamp(2.2rem,3.5vw,3rem);font-weight:800;letter-spacing:-.03em;background:linear-gradient(135deg,#6366f1,#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent}
.pgp-price small{font-size:.95rem;font-weight:500;opacity:.65;background:none;-webkit-text-fill-color:initial;color:inherit}
</style>`;

// ── Image helpers ──────────────────────────────────────────────────────────
// We use TWO free image sources that always load (no API key, no auth):
//   1. Curated Unsplash photo IDs (images.unsplash.com/photo-<id>) — niche-
//      relevant, stable CDN URLs that never break. Used when we have a good
//      keyword match in NICHE_PHOTOS below.
//   2. Picsum Photos (picsum.photos/seed/<seed>/<w>/<h>) — deterministic
//      free fallback that ALWAYS returns a valid image. Same seed = same
//      photo, so the marketplace preview is consistent.
//
// Note: source.unsplash.com was deprecated in 2024 and now returns broken
// responses — DO NOT use it.
//
// On publish, the backend `injectNicheImages` helper can still rewrite these
// URLs to be even more specific. Clients can also edit any image URL later
// in the visual / HTML editor.

// Curated free Unsplash photo IDs by niche keyword. Each entry maps a
// keyword found in `bgKeywords` to a list of stable photo IDs that we cycle
// through. All photos are licensed under the free Unsplash license.
const NICHE_PHOTOS: Record<string, string[]> = {
  plumber:    ["1581094794329-c8112a89af12", "1607472586893-edb57bdc0e39", "1585704032915-c3400ca199e7"],
  hvac:       ["1581094794329-c8112a89af12", "1558618666-fcd25c85cd64", "1504328345606-18bbc8c9d7d1"],
  cleaning:   ["1581578731548-c64695cc6952", "1556909114-f6e7ad7d3136", "1527515637462-cff94eecc1ac"],
  dental:     ["1606811971618-4486d14f3f99", "1588776814546-1ffcf47267a5", "1629909613654-28e377c37b09"],
  law:        ["1589829545856-d10d557cf95f", "1450101499163-c8848c66ca85", "1505664194779-8beaceb93744"],
  legal:      ["1589829545856-d10d557cf95f", "1450101499163-c8848c66ca85"],
  courthouse: ["1505664194779-8beaceb93744", "1589994965851-a8f479c573a9"],
  restaurant: ["1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0", "1555396273-367ea4eb4db5"],
  dinner:     ["1414235077428-338989a2e8c0", "1559339352-11d035aa65de"],
  cuisine:    ["1565299624946-b28f40a0ae38", "1504674900247-0877df9cc836"],
  fitness:    ["1517836357463-d25dfeac3438", "1571019613454-1cb2f99b2d8b", "1534438327276-14e5300c3a48"],
  gym:        ["1517836357463-d25dfeac3438", "1534438327276-14e5300c3a48"],
  realestate: ["1564013799919-ab600027ffc6", "1568605114967-8130f3a36994", "1600596542815-ffad4c1539a9"],
  property:   ["1564013799919-ab600027ffc6", "1605114760725-a8db8db5fcf2"],
  home:       ["1600596542815-ffad4c1539a9", "1583847268964-b28dc8f51f92"],
  car:        ["1503376780353-7e6692767b70", "1492144534655-ae79c964c9d7", "1494976388531-d1058494cdd8"],
  automotive: ["1492144534655-ae79c964c9d7", "1503376780353-7e6692767b70"],
  dealership: ["1567789884554-0b844b597180", "1492144534655-ae79c964c9d7"],
  hotel:      ["1566073771259-6a8506099945", "1582719508461-905c673771fd", "1551882547-ff40c63fe5fa"],
  luxury:     ["1582719508461-905c673771fd", "1564501049412-61c2a3083791"],
  travel:     ["1488646953014-85cb44e25828", "1469854523086-cc02fe5d8800"],
  fashion:    ["1483985988355-763728e1935b", "1485518882345-15568b007407", "1490481651871-ab68de25d43d"],
  shop:       ["1567401893414-76b7b1e5a7a5", "1483985988355-763728e1935b"],
  retail:     ["1441986300917-64674bd600d8", "1567401893414-76b7b1e5a7a5"],
  ecommerce:  ["1556742111-a301076d9d18", "1607082348824-0a96f2a4b9da"],
  product:    ["1542291026-7eec264c27ff", "1505740420928-5e560c06d30e", "1523275335684-37898b6baf30"],
  premium:    ["1556742049-0cfed4f6a45d", "1505740420928-5e560c06d30e"],
  saas:       ["1551434678-e076c223a692", "1460925895917-afdab827c52f", "1497366216548-37526070297c"],
  tech:       ["1518770660439-4636190af475", "1531297484001-80022131f5a1"],
  technology: ["1518770660439-4636190af475", "1517433670267-08bbd4be890f"],
  dashboard:  ["1551288049-bebda4e38f71", "1460925895917-afdab827c52f"],
  futuristic: ["1518770660439-4636190af475", "1451187580459-43490279c0fa"],
  business:   ["1556761175-5973dc0f32e7", "1521737711867-e3b97375f902", "1454165804606-c3d57bc86b40"],
  office:     ["1497366216548-37526070297c", "1497366811353-6870744d04b2"],
  professional:["1556761175-5973dc0f32e7", "1521737711867-e3b97375f902"],
  service:    ["1521791136064-7986c2920216", "1556761175-5973dc0f32e7"],
  handshake:  ["1521791136064-7986c2920216", "1556761175-5973dc0f32e7"],
  education:  ["1503676260728-1c00da094a0b", "1513258496099-48168024aec0", "1523240795612-9a054b0db644"],
  learning:   ["1513258496099-48168024aec0", "1522202176988-66273c2fd55f"],
  graduation: ["1523050854058-8df90110c9f1", "1627556704290-2b1f5853ff78"],
  online:     ["1522202176988-66273c2fd55f", "1531403009284-440f080d1e12"],
  student:    ["1523240795612-9a054b0db644", "1503676260728-1c00da094a0b"],
  course:     ["1513258496099-48168024aec0", "1522202176988-66273c2fd55f"],
  creative:   ["1513475382585-d06e58bcb0e0", "1542744173-8e7e53415bb0", "1452860606245-08befc0ff44b"],
  designer:   ["1561070791-2526d30994b8", "1542744173-8e7e53415bb0"],
  art:        ["1513475382585-d06e58bcb0e0", "1452860606245-08befc0ff44b"],
  workspace:  ["1497366216548-37526070297c", "1518770660439-4636190af475"],
  coffee:     ["1495474472287-4d71bcdd2085", "1442512595331-e89e73853f31"],
  editorial:  ["1455390582262-044cdead277a", "1481277542470-605612bd2d61"],
  article:    ["1455390582262-044cdead277a", "1481277542470-605612bd2d61"],
  photography:["1452587925148-ce544e77e70d", "1542038784456-1ea8e935640e"],
  sale:       ["1607082348824-0a96f2a4b9da", "1483985988355-763728e1935b"],
  promotion:  ["1607082348824-0a96f2a4b9da", "1556742049-0cfed4f6a45d"],
  shopping:   ["1483985988355-763728e1935b", "1567401893414-76b7b1e5a7a5"],
  collection: ["1490481651871-ab68de25d43d", "1485518882345-15568b007407"],
  brand:      ["1490481651871-ab68de25d43d", "1556742049-0cfed4f6a45d"],
  // Generic safe fallback
  default:    ["1497366216548-37526070297c", "1556761175-5973dc0f32e7", "1518770660439-4636190af475"],
};

function pickPhotoId(keywords: string, sig: number): string | null {
  const lower = keywords.toLowerCase();
  // Try to find the first niche keyword that appears in the bgKeywords string.
  for (const key of Object.keys(NICHE_PHOTOS)) {
    if (key === "default") continue;
    if (lower.includes(key)) {
      const list = NICHE_PHOTOS[key];
      return list[sig % list.length];
    }
  }
  return null;
}

const img = (keywords: string, w = 1600, h = 900, sig = 1) => {
  const id = pickPhotoId(keywords, sig);
  if (id) {
    // Stable Unsplash CDN URL — always loads, free under Unsplash license.
    return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=75`;
  }
  // Picsum fallback — deterministic by seed, always returns a real photo.
  // Seed is built from the keywords so the same template always renders the
  // same image, making the marketplace preview stable.
  const seed = encodeURIComponent(
    keywords.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "page"
  ) + `-${sig}`;
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
};

const avatar = (n: number) => `https://i.pravatar.cc/96?img=${n}`;

// ── Section builders ───────────────────────────────────────────────────────
const hero = (opts: {
  bgKeywords: string;
  badge?: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta?: string;
  sig?: number;
}) => `
<section class="pgp-hero" style="background-image:url('${img(opts.bgKeywords, 1920, 1080, opts.sig || 1)}')">
  <div class="pgp-hero-overlay"></div>
  <div class="pgp-hero-inner">
    ${opts.badge ? `<span class="pgp-eyebrow-light">${opts.badge}</span>` : ""}
    <h1>${opts.title}</h1>
    <p>${opts.subtitle}</p>
    <div class="pgp-hero-cta">
      <a href="#contact" class="pgp-btn pgp-btn-primary">${opts.primaryCta}</a>
      ${opts.secondaryCta ? `<a href="#about" class="pgp-btn pgp-btn-ghost">${opts.secondaryCta}</a>` : ""}
    </div>
  </div>
</section>`;

const trustStrip = (items: { num: string; lbl: string }[]) => `
<div class="pgp-trust">
  ${items.map((i) => `<div><div class="num">${i.num}</div><div class="lbl">${i.lbl}</div></div>`).join("")}
</div>`;

const featureGrid = (eyebrow: string, title: string, intro: string, features: { icon: string; title: string; desc: string }[]) => `
<section class="pgp-section">
  <div class="pgp-section-head">
    <span class="pgp-eyebrow">${eyebrow}</span>
    <h2>${title}</h2>
    <p>${intro}</p>
  </div>
  <div class="pgp-grid pgp-grid-${features.length === 4 ? "4" : "3"}">
    ${features.map((f) => `
      <div class="pgp-card">
        <div class="pgp-icon">${f.icon}</div>
        <h3>${f.title}</h3>
        <p>${f.desc}</p>
      </div>`).join("")}
  </div>
</section>`;

const aboutSplit = (eyebrow: string, title: string, body: string, imgKeywords: string, sig = 5) => `
<section class="pgp-section">
  <div class="pgp-split">
    <div>
      <span class="pgp-eyebrow">${eyebrow}</span>
      <h2 style="font-size:clamp(1.6rem,3vw,2.4rem);font-weight:800;margin-bottom:1rem">${title}</h2>
      <p style="opacity:.82;line-height:1.8;font-size:1.02rem">${body}</p>
    </div>
    <img src="${img(imgKeywords, 900, 700, sig)}" alt="" loading="lazy"/>
  </div>
</section>`;

const gallery = (eyebrow: string, title: string, kws: string[]) => `
<section class="pgp-section">
  <div class="pgp-section-head">
    <span class="pgp-eyebrow">${eyebrow}</span>
    <h2>${title}</h2>
  </div>
  <div class="pgp-gallery">
    ${kws.map((k, i) => `<img src="${img(k, 800, 800, i + 30)}" alt="" loading="lazy"/>`).join("")}
  </div>
</section>`;

const testimonials = (items: { quote: string; name: string; role: string; avatar: number }[]) => `
<section class="pgp-section">
  <div class="pgp-section-head">
    <span class="pgp-eyebrow">Testimonials</span>
    <h2>What our customers say</h2>
    <p>Real reviews from happy customers around the world.</p>
  </div>
  <div class="pgp-carousel">
    ${items.map((t) => `
      <article class="pgp-tcard">
        <div class="pgp-stars">★★★★★</div>
        <p class="pgp-quote">"${t.quote}"</p>
        <footer>
          <img src="${avatar(t.avatar)}" alt=""/>
          <div><strong>${t.name}</strong><span>${t.role}</span></div>
        </footer>
      </article>`).join("")}
  </div>
</section>`;

const defaultTestimonials = testimonials([
  { quote: "Absolutely outstanding service from start to finish. Couldn't be happier with the results.", name: "Sarah Mitchell", role: "Verified customer", avatar: 47 },
  { quote: "Professional, fast, and great value. They went above and beyond what I expected.", name: "James Carter", role: "Returning client", avatar: 12 },
  { quote: "Best decision we made this year. The team is responsive, friendly and truly experts.", name: "Aisha Rahman", role: "Verified customer", avatar: 32 },
  { quote: "Hands down the best in the area. Quality, transparency, and a personal touch.", name: "Marco Bianchi", role: "Local resident", avatar: 56 },
  { quote: "I recommend them to everyone I know. The whole experience was effortless.", name: "Priya Shah", role: "Verified customer", avatar: 23 },
]);

const faq = (items: { q: string; a: string }[]) => `
<section class="pgp-section">
  <div class="pgp-section-head">
    <span class="pgp-eyebrow">FAQ</span>
    <h2>Frequently asked questions</h2>
  </div>
  <div class="pgp-faq" style="max-width:760px;margin:0 auto">
    ${items.map((f) => `
      <details>
        <summary>${f.q}</summary>
        <p>${f.a}</p>
      </details>`).join("")}
  </div>
</section>`;

const ctaBand = (opts: { bgKeywords: string; title: string; subtitle: string; cta: string; sig?: number }) => `
<section class="pgp-cta-band" style="background-image:url('${img(opts.bgKeywords, 1920, 800, opts.sig || 9)}')">
  <div class="pgp-hero-overlay"></div>
  <div class="pgp-cta-inner">
    <h2 style="font-size:clamp(1.6rem,3vw,2.4rem);font-weight:800">${opts.title}</h2>
    <p>${opts.subtitle}</p>
    <a href="#contact" class="pgp-btn pgp-btn-primary">${opts.cta}</a>
  </div>
</section>`;

const contactSection = (info: { icon: string; label: string; value: string }[]) => `
<section class="pgp-section" id="contact">
  <div class="pgp-section-head">
    <span class="pgp-eyebrow">Contact</span>
    <h2>Get in touch</h2>
    <p>We'd love to hear from you. Reach out and we'll respond within 24 hours.</p>
  </div>
  <div class="pgp-contact">
    <div>
      ${info.map((i) => `
        <div class="pgp-info-row">
          <div class="pgp-info-icon">${i.icon}</div>
          <div><div style="font-size:.78rem;opacity:.65;text-transform:uppercase;letter-spacing:.08em">${i.label}</div><div style="font-weight:600;margin-top:.15rem">${i.value}</div></div>
        </div>`).join("")}
    </div>
    <div class="pgp-card">
      <div class="pgp-form-group"><label>Name</label><input type="text" placeholder="Your name"/></div>
      <div class="pgp-form-group"><label>Email</label><input type="email" placeholder="you@email.com"/></div>
      <div class="pgp-form-group"><label>Message</label><textarea rows="4" placeholder="How can we help?"></textarea></div>
      <button class="pgp-btn pgp-btn-primary" style="width:100%;justify-content:center">Send message</button>
    </div>
  </div>
</section>`;

// ── Lums — self-contained SEO landing page (1:1 with the Lums Vue/Nuxt theme) ──
// Purple gradient hero with a skewed shape, yellow pill CTA, services grid,
// feature split with bullet list, pricing plans, testimonials, animated stat
// counters and a latest-news grid. Fully scoped to .lums-page so it inherits
// nothing unexpected from the host site and survives publish adapters.
const lumsSeoLanding = (): MarketplaceTemplate => {
  const mock = img("seo analytics dashboard charts screen", 1100, 760, 91);
  const feat = img("team marketing strategy meeting laptop", 900, 760, 92);
  const blog1 = img("digital marketing seo workspace", 800, 540, 93);
  const blog2 = img("mobile app marketing launch", 800, 540, 94);
  const blog3 = img("content writing keyword research", 800, 540, 95);
  const content = `<style>
@keyframes lums-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
@keyframes lums-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.lums-page{--lp:#6c3df4;--lp2:#8a5cff;--ly:#ffc43d;--lt:#2b2350;--lm:#6b6790;font-family:'Poppins',ui-rounded,'Segoe UI',system-ui,sans-serif;color:var(--lt);line-height:1.7;background:#fff;overflow:hidden}
.lums-page *{box-sizing:border-box}
.lums-page h1,.lums-page h2,.lums-page h3{margin:0;font-weight:800;line-height:1.12;letter-spacing:-.02em}
.lums-page p{margin:0}
.lums-page a{text-decoration:none;color:inherit}
.lums-wrap{max-width:1180px;margin:0 auto;padding:0 1.25rem}
.lums-sec{padding:clamp(3.5rem,7vw,6rem) 0;position:relative}
.lums-eyebrow{display:inline-block;color:var(--lp);font-weight:700;text-transform:uppercase;letter-spacing:.18em;font-size:.78rem;margin-bottom:1rem}
.lums-h{font-size:clamp(1.9rem,4vw,2.8rem);color:var(--lt)}
.lums-lead{color:var(--lm);max-width:600px}
.lums-btn{display:inline-block;background:var(--ly);color:#3a2c00;font-weight:700;padding:1rem 2.25rem;border-radius:999px;box-shadow:0 16px 30px rgba(255,196,61,.45);transition:transform .25s ease,box-shadow .25s ease}
.lums-btn:hover{transform:translateY(-3px);box-shadow:0 22px 40px rgba(255,196,61,.55)}
.lums-btn-p{background:var(--lp);color:#fff;box-shadow:0 16px 30px rgba(108,61,244,.35)}
.lums-btn-p:hover{box-shadow:0 22px 40px rgba(108,61,244,.45)}
/* hero */
.lums-hero{background:linear-gradient(135deg,#6c3df4 0%,#8a5cff 100%);color:#fff;position:relative;padding:clamp(3rem,6vw,5rem) 0 9rem;clip-path:polygon(0 0,100% 0,100% 86%,0 100%)}
.lums-nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.25rem 0}
.lums-logo{font-size:1.6rem;font-weight:800;letter-spacing:.04em;color:#fff}
.lums-menu{display:flex;gap:1.75rem;font-weight:500;font-size:.95rem;opacity:.92}
.lums-menu a:hover{color:var(--ly)}
.lums-nav .lums-btn{background:#fff;color:var(--lp);box-shadow:none;padding:.7rem 1.6rem}
.lums-hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:center;margin-top:2.5rem}
.lums-badge{display:inline-flex;align-items:center;gap:.6rem;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:.45rem .55rem .45rem 1rem;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:1.75rem}
.lums-badge b{background:var(--ly);color:#3a2c00;border-radius:999px;padding:.3rem .85rem;letter-spacing:.08em}
.lums-hero h1{font-size:clamp(2.4rem,5.2vw,4rem);color:#fff;margin-bottom:1.75rem}
.lums-hero-mock{position:relative}
.lums-hero-mock img{width:100%;border-radius:18px;box-shadow:0 40px 80px rgba(20,8,60,.45);animation:lums-float 6s ease-in-out infinite}
/* services */
.lums-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem}
.lums-card{background:#fff;border-radius:20px;padding:2.25rem 1.75rem;box-shadow:0 24px 60px rgba(70,40,150,.1);transition:transform .3s ease,box-shadow .3s ease}
.lums-card:hover{transform:translateY(-8px);box-shadow:0 34px 70px rgba(108,61,244,.2)}
.lums-ic{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;font-size:1.8rem;background:linear-gradient(135deg,rgba(108,61,244,.14),rgba(138,92,255,.14));margin-bottom:1.25rem}
.lums-card h3{font-size:1.25rem;margin-bottom:.75rem;color:var(--lt)}
.lums-card p{color:var(--lm);font-size:.96rem;margin-bottom:1rem}
.lums-rm{color:var(--lp);font-weight:700;font-size:.9rem}
/* feature split */
.lums-split{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
.lums-split img{width:100%;border-radius:20px}
.lums-list{list-style:none;padding:0;margin:1.5rem 0 2rem;display:grid;gap:.85rem}
.lums-list li{display:flex;gap:.75rem;align-items:flex-start;color:var(--lt);font-weight:500}
.lums-list li::before{content:'✓';flex:none;width:26px;height:26px;border-radius:50%;background:var(--lp);color:#fff;display:grid;place-items:center;font-size:.8rem;font-weight:800}
/* pricing */
.lums-price{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem;align-items:center}
.lums-plan{background:#fff;border-radius:22px;padding:2.5rem 2rem;text-align:center;box-shadow:0 24px 60px rgba(70,40,150,.1);transition:transform .3s ease}
.lums-plan:hover{transform:translateY(-8px)}
.lums-plan.featured{background:linear-gradient(135deg,#6c3df4,#8a5cff);color:#fff;transform:scale(1.04)}
.lums-plan.featured .lums-amt,.lums-plan.featured h3,.lums-plan.featured li{color:#fff}
.lums-amt{font-size:2.6rem;font-weight:800;color:var(--lt)}
.lums-plan h3{text-transform:capitalize;color:var(--lm);font-weight:600;margin:.25rem 0 1.5rem;font-size:1rem}
.lums-plan ul{list-style:none;padding:0;margin:0 0 1.75rem;display:grid;gap:.65rem;color:var(--lm)}
.lums-plan.featured ul{color:rgba(255,255,255,.85)}
.lums-small{display:block;margin-top:.85rem;font-size:.8rem;color:var(--lm)}
.lums-plan.featured .lums-small{color:rgba(255,255,255,.75)}
.lums-plan.featured .lums-btn{background:var(--ly);color:#3a2c00}
/* testimonials */
.lums-testi{background:#f6f4ff}
.lums-tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem}
.lums-tcard{background:#fff;border-radius:20px;padding:2rem;box-shadow:0 20px 50px rgba(70,40,150,.08)}
.lums-tcard .q{font-size:2.4rem;color:var(--lp);line-height:1;font-weight:800}
.lums-tcard p{color:var(--lm);font-size:.95rem;margin:.75rem 0 1.5rem}
.lums-tcard footer{display:flex;align-items:center;gap:.85rem}
.lums-tcard img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.lums-tcard b{display:block;color:var(--lt)}
.lums-tcard small{color:var(--lp);font-weight:600}
/* stats */
.lums-stats{background:linear-gradient(135deg,#6c3df4,#8a5cff);color:#fff;clip-path:polygon(0 14%,100% 0,100% 100%,0 100%)}
.lums-sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:center}
.lums-sgrid .n{font-size:clamp(2rem,4vw,3rem);font-weight:800}
.lums-sgrid .l{opacity:.85;text-transform:uppercase;letter-spacing:.1em;font-size:.8rem;margin-top:.35rem}
/* blog */
.lums-bgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.75rem}
.lums-bcard{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 50px rgba(70,40,150,.08);transition:transform .3s ease}
.lums-bcard:hover{transform:translateY(-8px)}
.lums-bcard img{width:100%;height:200px;object-fit:cover}
.lums-bbody{padding:1.5rem}
.lums-meta{color:var(--lp);font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.6rem}
.lums-bcard h3{font-size:1.15rem;color:var(--lt)}
/* final cta */
.lums-final{text-align:center}
.lums-final .lums-box{background:linear-gradient(135deg,#6c3df4,#8a5cff);color:#fff;border-radius:28px;padding:clamp(2.5rem,6vw,4rem);box-shadow:0 40px 80px rgba(108,61,244,.3)}
.lums-final h2{color:#fff;font-size:clamp(1.8rem,4vw,2.6rem);margin-bottom:1.75rem}
.lums-sec{animation:lums-up .8s ease both}
@media(max-width:900px){.lums-hero-grid,.lums-split{grid-template-columns:1fr}.lums-grid3,.lums-price,.lums-tgrid,.lums-bgrid{grid-template-columns:1fr}.lums-sgrid{grid-template-columns:repeat(2,1fr)}.lums-menu{display:none}.lums-plan.featured{transform:none}}
</style>
<div class="lums-page">
  <header class="lums-hero">
    <div class="lums-wrap">
      <div class="lums-hero-grid">
        <div>
          <span class="lums-badge">Welcome to {industry} <b>Free Trial</b></span>
          <h1>{hero_title}</h1>
          <p style="opacity:.9;max-width:460px;margin-bottom:2.25rem">{hero_subtitle}</p>
          <a href="#pricing" class="lums-btn">Learn More</a>
        </div>
        <div class="lums-hero-mock"><img src="${mock}" alt="{company_name} analytics dashboard" loading="lazy"/></div>
      </div>
    </div>
  </header>

  <section class="lums-sec" id="features">
    <div class="lums-wrap">
      <div style="text-align:center;max-width:620px;margin:0 auto 3rem">
        <span class="lums-eyebrow">What we do</span>
        <h2 class="lums-h">{company_name} can boost up your web traffic</h2>
      </div>
      <div class="lums-grid3">
        <div class="lums-card"><div class="lums-ic">⚡</div><h3>{service_1_title}</h3><p>{service_1_desc}</p><a href="#contact" class="lums-rm">Read More →</a></div>
        <div class="lums-card"><div class="lums-ic">📊</div><h3>{service_2_title}</h3><p>{service_2_desc}</p><a href="#contact" class="lums-rm">Read More →</a></div>
        <div class="lums-card"><div class="lums-ic">🔗</div><h3>{service_3_title}</h3><p>{service_3_desc}</p><a href="#contact" class="lums-rm">Read More →</a></div>
      </div>
    </div>
  </section>

  <section class="lums-sec">
    <div class="lums-wrap">
      <div class="lums-split">
        <div>
          <span class="lums-eyebrow">Why choose us</span>
          <h2 class="lums-h" style="margin-bottom:1rem">Discover more new features</h2>
          <p class="lums-lead">{feature_intro}</p>
          <ul class="lums-list"><li>{feature_point_1}</li><li>{feature_point_2}</li><li>{feature_point_3}</li></ul>
          <a href="#pricing" class="lums-btn lums-btn-p">Get Started</a>
        </div>
        <img src="${feat}" alt="{company_name} features" loading="lazy"/>
      </div>
    </div>
  </section>

  <section class="lums-sec" id="pricing">
    <div class="lums-wrap">
      <div style="text-align:center;max-width:620px;margin:0 auto 3rem">
        <span class="lums-eyebrow">Pricing</span>
        <h2 class="lums-h">Pricing plans which suits your needs</h2>
      </div>
      <div class="lums-price">
        <div class="lums-plan"><div class="lums-amt">{plan_1_price}</div><h3>{plan_1_name}</h3><ul><li>Extra features</li><li>Lifetime free support</li><li>Upgrade options</li><li>Full access</li></ul><a href="#contact" class="lums-btn lums-btn-p">Choose Plan</a><span class="lums-small">No hidden charges</span></div>
        <div class="lums-plan featured"><div class="lums-amt">{plan_2_price}</div><h3>{plan_2_name}</h3><ul><li>Extra features</li><li>Lifetime free support</li><li>Upgrade options</li><li>Full access</li></ul><a href="#contact" class="lums-btn">Choose Plan</a><span class="lums-small">No hidden charges</span></div>
        <div class="lums-plan"><div class="lums-amt">{plan_3_price}</div><h3>{plan_3_name}</h3><ul><li>Extra features</li><li>Lifetime free support</li><li>Upgrade options</li><li>Full access</li></ul><a href="#contact" class="lums-btn lums-btn-p">Choose Plan</a><span class="lums-small">No hidden charges</span></div>
      </div>
    </div>
  </section>

  <section class="lums-sec lums-testi" id="testimonials">
    <div class="lums-wrap">
      <div style="text-align:center;max-width:620px;margin:0 auto 3rem">
        <span class="lums-eyebrow">Testimonials</span>
        <h2 class="lums-h">What our clients are saying</h2>
      </div>
      <div class="lums-tgrid">
        <div class="lums-tcard"><div class="q">"</div><p>This is due to their excellent service, competitive pricing and customer support. It's thoroughly refreshing to get such a personal touch.</p><footer><img src="${avatar(47)}" alt=""/><div><b>Chelsey Pozar</b><small>CEO, {company_name}</small></div></footer></div>
        <div class="lums-tcard"><div class="q">"</div><p>Our organic traffic tripled within months. The team is responsive, transparent and genuinely invested in our results.</p><footer><img src="${avatar(12)}" alt=""/><div><b>Jona Leisey</b><small>Marketing Lead</small></div></footer></div>
        <div class="lums-tcard"><div class="q">"</div><p>Best decision we made this year. Clear reporting, measurable rankings and a real partnership from day one.</p><footer><img src="${avatar(32)}" alt=""/><div><b>Chas Samul</b><small>Founder</small></div></footer></div>
      </div>
    </div>
  </section>

  <section class="lums-sec lums-stats">
    <div class="lums-wrap">
      <div class="lums-sgrid">
        <div><div class="n">{stat_projects}</div><div class="l">Projects</div></div>
        <div><div class="n">{stat_customers}</div><div class="l">Customers</div></div>
        <div><div class="n">{stat_success}</div><div class="l">Success Rate</div></div>
        <div><div class="n">{stat_awards}</div><div class="l">Awards</div></div>
      </div>
    </div>
  </section>

  <section class="lums-sec" id="news">
    <div class="lums-wrap">
      <div style="text-align:center;max-width:620px;margin:0 auto 3rem">
        <span class="lums-eyebrow">Latest news</span>
        <h2 class="lums-h">Check out our latest news &amp; articles</h2>
      </div>
      <div class="lums-bgrid">
        <article class="lums-bcard"><img src="${blog1}" alt="" loading="lazy"/><div class="lums-bbody"><div class="lums-meta">By admin · 4 Aug · 2 comments</div><h3>Checkout pre-launch mobile app marketing pitfalls</h3></div></article>
        <article class="lums-bcard"><img src="${blog2}" alt="" loading="lazy"/><div class="lums-bbody"><div class="lums-meta">By admin · 4 Aug · 2 comments</div><h3>How backlinks still drive rankings in {year}</h3></div></article>
        <article class="lums-bcard"><img src="${blog3}" alt="" loading="lazy"/><div class="lums-bbody"><div class="lums-meta">By admin · 4 Aug · 2 comments</div><h3>Keyword research workflows that actually convert</h3></div></article>
      </div>
    </div>
  </section>

  <section class="lums-sec lums-final" id="contact">
    <div class="lums-wrap">
      <div class="lums-box">
        <h2>Looking for new projects?</h2>
        <p style="opacity:.9;max-width:520px;margin:0 auto 2rem">{cta_subtitle}</p>
        <a href="#" class="lums-btn">Get in touch</a>
      </div>
    </div>
  </section>
</div>`;
  return {
    id: "seo-landing",
    name: "SEO Landing Template",
    description: "Bold purple SEO agency landing page with dashboard hero, services, pricing plans, testimonials, animated stats and latest news — modelled on the Lums theme.",
    content,
    variables: ["{company_name}", "{industry}", "{hero_title}", "{hero_subtitle}", "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}", "{service_3_title}", "{service_3_desc}", "{feature_intro}", "{feature_point_1}", "{feature_point_2}", "{feature_point_3}", "{plan_1_name}", "{plan_1_price}", "{plan_2_name}", "{plan_2_price}", "{plan_3_name}", "{plan_3_price}", "{stat_projects}", "{stat_customers}", "{stat_success}", "{stat_awards}", "{cta_subtitle}", "{year}"],
    category: "marketing",
    tags: ["seo", "landing", "agency", "marketing"],
    author: "Community", downloads: 2108, rating: 4.8, ratingCount: 142,
    seo_title_pattern: "{hero_title} | {company_name}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title} | {company_name}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "",
    slug_pattern: "{company_name}-seo",
    schema_type: "WebPage",
    platform: "generic",
    defaultValues: {
      company_name: "Lums",
      industry: "SEO Business",
      hero_title: "Boost your web traffic & rank with Lums",
      hero_subtitle: "Data-driven SEO that grows your organic traffic, rankings and revenue — without the guesswork.",
      service_1_title: "Speed Optimization",
      service_1_desc: "We tune your core web vitals and load times so your pages rank higher and convert better.",
      service_2_title: "Marketing Analysis",
      service_2_desc: "Deep audits and competitor analysis reveal exactly where your next growth wins are hiding.",
      service_3_title: "SEO & Backlinks",
      service_3_desc: "White-hat link building and on-page SEO that earns durable authority and lasting rankings.",
      feature_intro: "Everything you need to outrank competitors — real-time dashboards, keyword tracking and actionable reporting in one place.",
      feature_point_1: "Refreshingly personal, hands-on support.",
      feature_point_2: "Transparent reporting you can actually understand.",
      feature_point_3: "Strategies built around measurable revenue.",
      plan_1_name: "basic pack", plan_1_price: "$20.00",
      plan_2_name: "medium pack", plan_2_price: "$30.00",
      plan_3_name: "ultimate pack", plan_3_price: "$40.00",
      stat_projects: "2,200+", stat_customers: "1,800+", stat_success: "98%", stat_awards: "32",
      cta_subtitle: "Let's grow your organic traffic together. Tell us about your goals and we'll build a plan that ranks.",
      year: "2026",
    },
  };
};

// ── NobleLaw — premium law firm template (modelled 1:1 on noblelaw.webflow.io)
const nobleLawFirm = (): MarketplaceTemplate => {
  const hero = img("law firm lawyers courthouse hallway professional", 1600, 1000, 71);
  const about = img("law firm office meeting professional", 900, 760, 72);
  const s1 = img("business legal consultation handshake", 700, 520, 73);
  const s2 = img("courtroom dispute resolution justice", 700, 520, 74);
  const s3 = img("contract signing licensing documents", 700, 520, 75);
  const s4 = img("intellectual property patent law", 700, 520, 76);
  const t1 = img("professional woman portrait business", 120, 120, 77);
  const t2 = img("professional man portrait business", 120, 120, 78);
  const t3 = img("professional woman portrait corporate", 120, 120, 79);
  const content = `<style>
@keyframes nbl-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.noble-page{--nb:#0e2a4f;--nb2:#0a1f3c;--ng:#c08a4e;--ng2:#d6a468;--nt:#16243a;--nm:#5a6b82;--nl:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:var(--nt);line-height:1.7;background:#fff;overflow:hidden}
.noble-page *{box-sizing:border-box}
.noble-page h1,.noble-page h2,.noble-page h3{margin:0;font-weight:600;line-height:1.15;letter-spacing:-.01em}
.noble-page p{margin:0;font-family:'Helvetica Neue',Arial,sans-serif}
.noble-page a{text-decoration:none;color:inherit}
.nbl-wrap{max-width:1180px;margin:0 auto;padding:0 1.5rem}
.nbl-sec{padding:clamp(3.5rem,7vw,6rem) 0;position:relative}
.nbl-eyebrow{display:inline-block;color:var(--ng);font-family:'Helvetica Neue',Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:.22em;font-size:.74rem;margin-bottom:1rem}
.nbl-h{font-size:clamp(1.9rem,4vw,2.9rem);color:var(--nb)}
.nbl-lead{color:var(--nm);max-width:620px;font-size:1.02rem}
.nbl-btn{display:inline-block;background:var(--ng);color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:600;font-size:.95rem;padding:.95rem 2rem;border-radius:8px;transition:transform .25s ease,background .25s ease}
.nbl-btn:hover{transform:translateY(-2px);background:var(--ng2)}
.nbl-btn-o{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5)}
.nbl-btn-o:hover{background:rgba(255,255,255,.1)}
/* nav + hero */
.nbl-hero{position:relative;background:var(--nb2);color:#fff;min-height:88vh;display:flex;flex-direction:column}
.nbl-hero-bg{position:absolute;inset:0;background:url('${hero}') center/cover;opacity:.32}
.nbl-hero-ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,31,60,.85) 0%,rgba(10,31,60,.55) 45%,rgba(10,31,60,.9) 100%)}
.nbl-nav{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.4rem 0;border-bottom:1px solid rgba(255,255,255,.12)}
.nbl-logo{font-size:1.55rem;font-weight:700;letter-spacing:.02em;color:#fff;display:flex;align-items:center;gap:.55rem}
.nbl-logo span{color:var(--ng)}
.nbl-menu{display:flex;gap:2rem;font-family:'Helvetica Neue',Arial,sans-serif;font-size:.92rem;font-weight:500;opacity:.92}
.nbl-menu a:hover{color:var(--ng2)}
.nbl-hero-in{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 0}
.nbl-hero h1{font-size:clamp(2.4rem,5.6vw,4.2rem);color:#fff;max-width:14ch;margin:0 auto 1.5rem;animation:nbl-up .8s ease both}
.nbl-hero p{color:rgba(255,255,255,.82);max-width:46ch;margin:0 auto 2.25rem;font-size:1.08rem}
.nbl-hero-cta{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center}
/* stats */
.nbl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:center}
.nbl-stat b{display:block;font-size:clamp(2rem,4vw,3rem);color:var(--nb);font-weight:700}
.nbl-stat span{font-family:'Helvetica Neue',Arial,sans-serif;color:var(--nm);font-size:.9rem;letter-spacing:.03em}
/* about split */
.nbl-split{display:grid;grid-template-columns:1fr 1fr;gap:3.5rem;align-items:center}
.nbl-split img{width:100%;border-radius:14px;box-shadow:0 30px 60px rgba(14,42,79,.18)}
/* services */
.nbl-grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
.nbl-svc{position:relative;border-radius:14px;overflow:hidden;min-height:300px;display:flex;align-items:flex-end;color:#fff}
.nbl-svc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nbl-svc-ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,31,60,.1) 0%,rgba(10,31,60,.92) 100%)}
.nbl-svc-c{position:relative;z-index:2;padding:1.75rem}
.nbl-svc-c h3{font-size:1.35rem;margin-bottom:.6rem}
.nbl-svc-c p{font-size:.9rem;color:rgba(255,255,255,.82)}
.nbl-svc-c a{display:inline-block;margin-top:.85rem;color:var(--ng2);font-family:'Helvetica Neue',Arial,sans-serif;font-weight:600;font-size:.85rem}
/* why */
.nbl-why{background:var(--nl)}
.nbl-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.nbl-feat{background:#fff;border-radius:14px;padding:2rem 1.6rem;border:1px solid rgba(14,42,79,.07)}
.nbl-feat .nbl-ic{width:54px;height:54px;border-radius:12px;display:grid;place-items:center;font-size:1.5rem;background:linear-gradient(135deg,rgba(192,138,78,.16),rgba(192,138,78,.06));margin-bottom:1.1rem}
.nbl-feat h3{font-size:1.2rem;color:var(--nb);margin-bottom:.6rem}
.nbl-feat p{color:var(--nm);font-size:.92rem}
/* testimonials */
.nbl-tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.nbl-quote{background:#fff;border:1px solid rgba(14,42,79,.08);border-radius:14px;padding:2rem 1.75rem;box-shadow:0 18px 40px rgba(14,42,79,.06)}
.nbl-quote p{font-style:italic;color:var(--nt);margin-bottom:1.4rem}
.nbl-qa{display:flex;align-items:center;gap:.85rem}
.nbl-qa img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.nbl-qa b{display:block;color:var(--nb);font-family:'Helvetica Neue',Arial,sans-serif;font-size:.95rem}
.nbl-qa span{font-family:'Helvetica Neue',Arial,sans-serif;color:var(--nm);font-size:.82rem}
/* cta band */
.nbl-cta{background:var(--nb2);color:#fff;text-align:center}
.nbl-cta h2{font-size:clamp(1.8rem,3.5vw,2.6rem);color:#fff;margin-bottom:1rem}
.nbl-cta p{color:rgba(255,255,255,.78);max-width:48ch;margin:0 auto 2rem}
/* footer */
.nbl-foot{background:#081830;color:rgba(255,255,255,.7);padding:3rem 0;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:.85rem}
@media(max-width:860px){.nbl-menu{display:none}.nbl-stats{grid-template-columns:repeat(2,1fr)}.nbl-split,.nbl-grid2,.nbl-grid3,.nbl-tgrid{grid-template-columns:1fr}}
</style>
<div class="noble-page">
  <header class="nbl-hero">
    <div class="nbl-hero-bg"></div>
    <div class="nbl-hero-ov"></div>
    <div class="nbl-wrap nbl-hero-in">
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="nbl-hero-cta"><a href="#contact" class="nbl-btn">Book Consultant</a><a href="#services" class="nbl-btn nbl-btn-o">Our Services</a></div>
    </div>
  </header>

  <section class="nbl-sec" id="about">
    <div class="nbl-wrap nbl-split">
      <div>
        <span class="nbl-eyebrow">About Us</span>
        <h2 class="nbl-h">Your Trusted Partner for Reliable Legal Solutions</h2>
        <p class="nbl-lead" style="margin-top:1.25rem">{about_text}</p>
        <a href="#contact" class="nbl-btn" style="margin-top:2rem">Learn More</a>
      </div>
      <img src="${about}" alt="{firm_name} office" loading="lazy">
    </div>
  </section>

  <section class="nbl-sec" style="padding-top:0">
    <div class="nbl-wrap nbl-stats">
      <div class="nbl-stat"><b>{stat_years}</b><span>Years Experience</span></div>
      <div class="nbl-stat"><b>{stat_clients}</b><span>Clients Worldwide</span></div>
      <div class="nbl-stat"><b>{stat_awards}</b><span>Awards &amp; Honors</span></div>
      <div class="nbl-stat"><b>{stat_happy}</b><span>Happy Clients</span></div>
    </div>
  </section>

  <section class="nbl-sec nbl-why" id="services">
    <div class="nbl-wrap">
      <div style="text-align:center;max-width:640px;margin:0 auto 3rem">
        <span class="nbl-eyebrow">Our Services</span>
        <h2 class="nbl-h">Expertly Tailored Legal Solutions for Your Every Need</h2>
      </div>
      <div class="nbl-grid2">
        <div class="nbl-svc"><img src="${s1}" alt="{service_1_title}" loading="lazy"><div class="nbl-svc-ov"></div><div class="nbl-svc-c"><h3>{service_1_title}</h3><p>{service_1_desc}</p><a href="#contact">Learn More →</a></div></div>
        <div class="nbl-svc"><img src="${s2}" alt="{service_2_title}" loading="lazy"><div class="nbl-svc-ov"></div><div class="nbl-svc-c"><h3>{service_2_title}</h3><p>{service_2_desc}</p><a href="#contact">Learn More →</a></div></div>
        <div class="nbl-svc"><img src="${s3}" alt="{service_3_title}" loading="lazy"><div class="nbl-svc-ov"></div><div class="nbl-svc-c"><h3>{service_3_title}</h3><p>{service_3_desc}</p><a href="#contact">Learn More →</a></div></div>
        <div class="nbl-svc"><img src="${s4}" alt="{service_4_title}" loading="lazy"><div class="nbl-svc-ov"></div><div class="nbl-svc-c"><h3>{service_4_title}</h3><p>{service_4_desc}</p><a href="#contact">Learn More →</a></div></div>
      </div>
    </div>
  </section>

  <section class="nbl-sec" id="why">
    <div class="nbl-wrap">
      <div style="text-align:center;max-width:640px;margin:0 auto 3rem">
        <span class="nbl-eyebrow">Why Choose Us</span>
        <h2 class="nbl-h">Trusted Legal Expertise for Your Peace of Mind</h2>
      </div>
      <div class="nbl-grid3">
        <div class="nbl-feat"><div class="nbl-ic">🏛️</div><h3>Proven Expertise</h3><p>Our team of seasoned legal experts brings extensive knowledge to navigate complex regulatory challenges effectively.</p></div>
        <div class="nbl-feat"><div class="nbl-ic">🏆</div><h3>Proven Track Record</h3><p>With years of success in complex legal matters, we have earned a reputation for delivering effective, timely results.</p></div>
        <div class="nbl-feat"><div class="nbl-ic">🎯</div><h3>Tailored Approach</h3><p>Solutions designed to meet your unique, specific needs and drive meaningful outcomes for every client.</p></div>
        <div class="nbl-feat"><div class="nbl-ic">🤝</div><h3>Integrity</h3><p>We prioritize transparency and honesty, ensuring clear communication and trust in every aspect of our work.</p></div>
        <div class="nbl-feat"><div class="nbl-ic">⭐</div><h3>Dedication to Excellence</h3><p>Our focus is on delivering impactful and sustainable outcomes that drive lasting success for our clients.</p></div>
        <div class="nbl-feat"><div class="nbl-ic">📈</div><h3>Real Results</h3><p>Strategic, results-driven representation that protects your business and personal interests.</p></div>
      </div>
    </div>
  </section>

  <section class="nbl-sec nbl-why">
    <div class="nbl-wrap">
      <div style="text-align:center;max-width:640px;margin:0 auto 3rem">
        <span class="nbl-eyebrow">Testimonial</span>
        <h2 class="nbl-h">Hear Directly from Our Valued Clients and Partners</h2>
      </div>
      <div class="nbl-tgrid">
        <div class="nbl-quote"><p>"The legal team at {firm_name} provided exceptional service. Their deep understanding of our needs helped us navigate complex challenges with confidence."</p><div class="nbl-qa"><img src="${t1}" alt="Client" loading="lazy"><div><b>Christine Hohmann</b><span>Managing Director</span></div></div></div>
        <div class="nbl-quote"><p>"From the very beginning, {firm_name} demonstrated a clear commitment to understanding our needs. Their advice was instrumental in driving our success."</p><div class="nbl-qa"><img src="${t2}" alt="Client" loading="lazy"><div><b>Arthur Kopp</b><span>CEO, Kopp Group</span></div></div></div>
        <div class="nbl-quote"><p>"We are incredibly grateful for the professionalism of {firm_name}. Their strategic approach ensured our business remained compliant and well-protected."</p><div class="nbl-qa"><img src="${t3}" alt="Client" loading="lazy"><div><b>Astrid Wallraben</b><span>Founder</span></div></div></div>
      </div>
    </div>
  </section>

  <section class="nbl-sec nbl-cta" id="contact">
    <div class="nbl-wrap">
      <h2>Ready to Protect What Matters Most?</h2>
      <p>Book your free consultation today and let {firm_name} craft a legal strategy tailored to your goals. Call {phone}.</p>
      <a href="tel:{phone}" class="nbl-btn">📞 {phone}</a>
    </div>
  </section>

  
</div>`;
  return {
    id: "law-firm-2",
    name: "Law Firm Template",
    description: "Premium, authoritative law firm landing page with cinematic hero, stats, service grid, why-us, testimonials and consultation CTA — modelled 1:1 on the NobleLaw theme.",
    content,
    variables: ["{firm_name}", "{hero_title}", "{hero_subtitle}", "{about_text}", "{stat_years}", "{stat_clients}", "{stat_awards}", "{stat_happy}", "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}", "{service_3_title}", "{service_3_desc}", "{service_4_title}", "{service_4_desc}", "{phone}", "{year}"],
    category: "professional",
    tags: ["law", "attorney", "legal", "professional", "firm"],
    author: "Community", downloads: 874, rating: 4.7, ratingCount: 96,
    seo_title_pattern: "{hero_title} | {firm_name}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title} | {firm_name}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "",
    slug_pattern: "{firm_name}-law-firm",
    schema_type: "LocalBusiness",
    platform: "generic",
    defaultValues: {
      firm_name: "NobleLaw",
      hero_title: "Expertise, Integrity, Results — Tailored Legal Solutions",
      hero_subtitle: "With proven expertise and strategic approaches, we stand as your trusted legal partner to support your success.",
      about_text: "As a law firm with a solid reputation, we are committed to providing reliable and solution-oriented legal services. Focused on our clients' needs, we ensure every solution is crafted to safeguard both business and personal interests.",
      stat_years: "15+",
      stat_clients: "86k",
      stat_awards: "28",
      stat_happy: "98%",
      service_1_title: "Business Legal Consultation",
      service_1_desc: "Expert legal guidance in corporate regulations and investment matters, helping businesses achieve compliance and foster sustainable growth.",
      service_2_title: "Dispute Resolution",
      service_2_desc: "Strategic representation in litigation and arbitration to resolve disputes efficiently while protecting your interests.",
      service_3_title: "Licensing and Contracts",
      service_3_desc: "Drafting, reviewing and negotiating contracts and licenses that mitigate risk and protect your assets.",
      service_4_title: "Intellectual Property Protection",
      service_4_desc: "Comprehensive IP strategy — trademarks, patents and copyrights — to safeguard your most valuable assets.",
      phone: "(555) 010-2025",
      year: "2026",
    },
  };
};


// ── Heaven Palate — fine-dining restaurant template (1:1 of heavenpalate.framer.website) ──
const FU = "https://framerusercontent.com/images";
const heavenPalateRestaurant = (): MarketplaceTemplate => {
  const content = `<style>
@keyframes hp-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.hp-page{--hp-bg:#10261b;--hp-bg2:#0b1c14;--hp-gold:#d8b15a;--hp-gold2:#e8c876;--hp-cream:#f4ecd8;--hp-mut:#b9c5b6;font-family:Georgia,'Times New Roman',serif;color:var(--hp-cream);line-height:1.7;background:var(--hp-bg);overflow:hidden}
.hp-page *{box-sizing:border-box}
.hp-page h1,.hp-page h2,.hp-page h3{margin:0;font-weight:600;line-height:1.1;letter-spacing:-.01em}
.hp-page p{margin:0;font-family:'Helvetica Neue',Arial,sans-serif}
.hp-page a{text-decoration:none;color:inherit}
.hp-page img{display:block}
.hp-wrap{max-width:1200px;margin:0 auto;padding:0 1.5rem}
.hp-sec{padding:clamp(3.5rem,7vw,6rem) 0;position:relative}
.hp-eye{display:inline-block;color:var(--hp-gold);font-family:'Helvetica Neue',Arial,sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:.24em;font-size:.72rem;margin-bottom:1rem}
.hp-h{font-size:clamp(1.9rem,4vw,3rem);color:var(--hp-cream)}
.hp-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--hp-gold);color:#10261b;font-family:'Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:.95rem;padding:.95rem 2rem;border-radius:6px;transition:transform .25s ease,background .25s ease}
.hp-btn:hover{transform:translateY(-2px);background:var(--hp-gold2)}
.hp-btn-o{background:transparent;color:var(--hp-cream);border:1px solid var(--hp-gold)}
.hp-btn-o:hover{background:rgba(216,177,90,.12)}
/* nav */
.hp-nav{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.5rem 0}
.hp-logo{font-family:'Snell Roundhand','Brush Script MT',cursive;font-size:1.9rem;color:var(--hp-gold);font-weight:500}
.hp-menu{display:flex;gap:2.25rem;font-family:'Helvetica Neue',Arial,sans-serif;font-size:.92rem;font-weight:500;opacity:.92}
.hp-menu a:hover{color:var(--hp-gold)}
/* hero */
.hp-hero-grid{display:grid;grid-template-columns:1.05fr 1.1fr;gap:3rem;align-items:center;padding:2.5rem 0 4rem}
.hp-hero h1{font-size:clamp(2.8rem,6vw,5rem);color:var(--hp-cream);margin-bottom:2rem;animation:hp-up .8s ease both}
.hp-hero-cust{margin-top:2.25rem;font-family:'Helvetica Neue',Arial,sans-serif;color:var(--hp-mut);display:flex;align-items:center;gap:.5rem;font-size:1rem}
.hp-hero-cust b{color:var(--hp-gold);font-weight:700}
.hp-collage{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1rem;height:clamp(380px,42vw,540px)}
.hp-collage img{width:100%;height:100%;object-fit:cover;border-radius:10px}
.hp-collage .hp-tall{grid-row:span 2;height:100%}
/* menu */
.hp-menu-sec{background:var(--hp-bg2)}
.hp-menu-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1.5rem;margin-bottom:3rem}
.hp-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.hp-card{position:relative;border-radius:12px;overflow:hidden;min-height:340px;display:flex;align-items:flex-end;color:#fff}
.hp-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s ease}
.hp-card:hover img{transform:scale(1.06)}
.hp-card-ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,28,20,0) 30%,rgba(11,28,20,.88) 100%)}
.hp-card-c{position:relative;z-index:2;padding:1.75rem;width:100%}
.hp-card-c h3{font-size:1.5rem;margin-bottom:.4rem}
.hp-card-c a{font-family:'Helvetica Neue',Arial,sans-serif;color:var(--hp-gold);font-weight:600;font-size:.88rem}
/* stats */
.hp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;text-align:center}
.hp-stat b{display:block;font-size:clamp(2rem,4vw,3.2rem);color:var(--hp-gold);font-weight:700}
.hp-stat span{font-family:'Helvetica Neue',Arial,sans-serif;color:var(--hp-mut);font-size:.9rem;letter-spacing:.04em}
.hp-split{display:grid;grid-template-columns:1fr 1fr;gap:3.5rem;align-items:center}
.hp-split img{width:100%;border-radius:14px;object-fit:cover}
/* testimonial */
.hp-quote-wrap{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
.hp-quote p{font-size:1.1rem;color:var(--hp-cream);font-style:italic;margin:1.5rem 0}
.hp-quote .hp-by{font-family:'Helvetica Neue',Arial,sans-serif;color:var(--hp-gold);font-weight:600}
.hp-quote img{width:100%;border-radius:14px;object-fit:cover;max-height:420px}
/* cta */
.hp-cta{background:var(--hp-bg2);text-align:center}
.hp-cta h2{font-size:clamp(1.9rem,4vw,2.8rem);margin-bottom:1.5rem;max-width:18ch;margin-inline:auto}
.hp-faq{max-width:640px;margin:2rem auto 0;text-align:left}
.hp-faq div{font-family:'Helvetica Neue',Arial,sans-serif;border-bottom:1px solid rgba(216,177,90,.2);padding:1rem 0;color:var(--hp-cream)}
/* book */
.hp-book{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
.hp-book img{width:100%;border-radius:14px;object-fit:cover;max-height:460px}
.hp-book p{font-family:'Helvetica Neue',Arial,sans-serif;color:var(--hp-mut);margin:1rem 0}
.hp-book a.hp-link{color:var(--hp-gold)}
/* footer */
.hp-foot{background:#081610;color:var(--hp-mut);padding:2.5rem 0;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:.85rem}
@media(max-width:880px){.hp-menu{display:none}.hp-hero-grid,.hp-split,.hp-quote-wrap,.hp-book{grid-template-columns:1fr}.hp-grid3{grid-template-columns:1fr}.hp-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="hp-page">

  <section class="hp-wrap hp-hero hp-hero-grid">
    <div>
      <h1>{hero_title}</h1>
      <a href="#book" class="hp-btn">Make Reservation 🍽</a>
      <div class="hp-hero-cust">We served over <b>{customers_count}</b> 😊 {customers_label}</div>
    </div>
    <div class="hp-collage">
      <img class="hp-tall" src="{hero_image_1}" alt="restaurant table" loading="lazy">
      <img src="{hero_image_2}" alt="restaurant interior" loading="lazy">
      <img src="{hero_image_3}" alt="serving food" loading="lazy">
    </div>
  </section>

  <section class="hp-sec hp-menu-sec" id="menu">
    <div class="hp-wrap">
      <div class="hp-menu-head">
        <div>
          <span class="hp-eye">{menu_kicker}</span>
          <h2 class="hp-h">{menu_title}</h2>
        </div>
        <a href="#menu" class="hp-btn hp-btn-o">Check Menu →</a>
      </div>
      <div class="hp-grid3">
        <div class="hp-card"><img src="{menu_1_image}" alt="{menu_1_title}" loading="lazy"><div class="hp-card-ov"></div><div class="hp-card-c"><h3>{menu_1_title}</h3><a href="#menu">{menu_1_title} →</a></div></div>
        <div class="hp-card"><img src="{menu_2_image}" alt="{menu_2_title}" loading="lazy"><div class="hp-card-ov"></div><div class="hp-card-c"><h3>{menu_2_title}</h3><a href="#menu">{menu_2_title} →</a></div></div>
        <div class="hp-card"><img src="{menu_3_image}" alt="{menu_3_title}" loading="lazy"><div class="hp-card-ov"></div><div class="hp-card-c"><h3>{menu_3_title}</h3><a href="#menu">{menu_3_title} →</a></div></div>
      </div>
    </div>
  </section>

  <section class="hp-sec" id="about">
    <div class="hp-wrap hp-split">
      <img src="{chef_image}" alt="chef serving" loading="lazy">
      <div>
        <span class="hp-eye">Our Story</span>
        <div class="hp-stats" style="text-align:left;grid-template-columns:1fr 1fr;gap:2rem 1.5rem">
          <div class="hp-stat" style="text-align:left"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
          <div class="hp-stat" style="text-align:left"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
          <div class="hp-stat" style="text-align:left"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
          <div class="hp-stat" style="text-align:left"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
        </div>
        <a href="#about" class="hp-btn" style="margin-top:2rem">Check Our Story →</a>
      </div>
    </div>
  </section>

  <section class="hp-sec hp-menu-sec">
    <div class="hp-wrap hp-quote-wrap">
      <div class="hp-quote">
        <span class="hp-eye">Our Customer Says</span>
        <h2 class="hp-h">{testimonial_heading}</h2>
        <p>"{testimonial_text}"</p>
        <div class="hp-by">— {testimonial_author}</div>
      </div>
      <img src="{testimonial_image}" alt="happy customer" loading="lazy">
    </div>
  </section>

  <section class="hp-sec hp-cta">
    <div class="hp-wrap">
      <h2>{cta_title}</h2>
      <div class="hp-faq">
        <div>{faq_1}</div>
        <div>{faq_2}</div>
        <div>{faq_3}</div>
        <div>Still have any questions? <a class="hp-link" href="mailto:{email}">{email}</a></div>
      </div>
    </div>
  </section>

  <section class="hp-sec" id="book">
    <div class="hp-wrap hp-book">
      <img src="{book_image}" alt="book a table" loading="lazy">
      <div>
        <span class="hp-eye">Reservation</span>
        <h2 class="hp-h">Book Your Table</h2>
        <p>{book_text}</p>
        <p>Dial <b style="color:var(--hp-gold)">{phone}</b> or visit us at {address}, {city}.</p>
        <a href="tel:{phone}" class="hp-btn">📞 {phone}</a>
      </div>
    </div>
  </section>

  
</div>`;
  return {
    id: "restaurant-2",
    name: "Restaurant Template",
    description: "Elegant fine-dining restaurant landing page with cinematic hero collage, menu highlights, stats, testimonials and table reservation — modelled 1:1 on the Heaven Palate theme.",
    content,
    variables: ["{restaurant_name}", "{hero_title}", "{customers_count}", "{customers_label}", "{menu_kicker}", "{menu_title}", "{menu_1_title}", "{menu_2_title}", "{menu_3_title}", "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}", "{testimonial_heading}", "{testimonial_text}", "{testimonial_author}", "{cta_title}", "{faq_1}", "{faq_2}", "{faq_3}", "{email}", "{book_text}", "{phone}", "{address}", "{city}", "{year}", "{hero_image_1}", "{hero_image_2}", "{hero_image_3}", "{menu_1_image}", "{menu_2_image}", "{menu_3_image}", "{chef_image}", "{testimonial_image}", "{book_image}"],
    category: "local-seo",
    tags: ["restaurant", "food", "local", "dining", "fine-dining"],
    author: "Community", downloads: 1034, rating: 4.7,
    seo_title_pattern: "{restaurant_name} — Fine Dining Restaurant in {city}",
    seo_description_pattern: "{hero_title}. Reserve your table at {restaurant_name} in {city}. Call {phone}.",
    og_title_pattern: "{restaurant_name} — Fine Dining Restaurant in {city}", og_description_pattern: "{hero_title}. Reserve your table at {restaurant_name} in {city}. Call {phone}.", og_image_pattern: "{menu_1_image}",
    slug_pattern: "{restaurant_name}-restaurant",
    schema_type: "Restaurant",
    platform: "generic",
    defaultValues: {
      restaurant_name: "Heaven Palate",
      hero_title: "A haven for discerning palates",
      customers_count: "5000 +",
      customers_label: "Happy Customers",
      menu_kicker: "MICHELIN STAR qualified Restaurant Menu",
      menu_title: "Enjoy Our Exquisite Flavors",
      menu_1_title: "Appetizers",
      menu_2_title: "Main Dish",
      menu_3_title: "Beverages",
      stat_1_num: "2",
      stat_1_label: "Michelin Stars",
      stat_2_num: "5000+",
      stat_2_label: "Served Customers",
      stat_3_num: "15000+",
      stat_3_label: "Served Dishes",
      stat_4_num: "5",
      stat_4_label: "Total Chefs",
      testimonial_heading: "Exquisite Elegance, Culinary Delight!",
      testimonial_text: "The sophisticated ambiance, impeccable service. Every dish is a masterpiece, beautifully presented and bursting with flavor. Highly recommend for those seeking a taste of culinary perfection in an opulent setting.",
      testimonial_author: "Sofia Romus",
      cta_title: "Embark on a Gastronomic Adventure at Heaven Palate",
      faq_1: "Reservation cancellation policy",
      faq_2: "Do you offer catering services?",
      faq_3: "Are pets allowed?",
      email: "heavenpalate@mail.com",
      book_text: "Reserve your table in real time online, or complete the form below. Walk-ins welcome based on availability.",
      phone: "+1 (212) 555-1212",
      address: "120 Gourmet Avenue",
      city: "New York",
      year: "2026",
      hero_image_1: FU + "/PzbeWTitqiNzqlbT1K3cdeQPmE.png",
      hero_image_2: FU + "/fLwK6j7U6E521wMPTuo0VK3RBUo.png",
      hero_image_3: FU + "/QH8YYvfYC2LJd1N2FLTV2oElSI.png",
      menu_1_image: FU + "/c1aPErEjP8hKDyK2tV6NK5TR7Q.jpg",
      menu_2_image: FU + "/U881zGzxFlGaorCJC5RQB4NFC6E.jpg",
      menu_3_image: FU + "/iMooFY3jTCQ1TzCRoGRt2jJOYs.jpg",
      chef_image: FU + "/vIxsWu78p1VvatxicJYet0ftjw8.png",
      testimonial_image: FU + "/RaNW5PEM2c7qIHDj8J5TQBBXWh8.jpg",
      book_image: FU + "/11C0kRPAlmywnm3cT86miykQOfA.png",
    },
  };
};

const ceviraCleaning = (): MarketplaceTemplate => {
  const content = `<style>
@keyframes cv-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.cv-page{--cv-blue:#1d4ed8;--cv-blue2:#2563eb;--cv-dark:#0b1a3a;--cv-ink:#0f172a;--cv-mut:#5b6b8c;--cv-bg:#f3f6fc;--cv-card:#fff;font-family:'Helvetica Neue',Arial,sans-serif;color:var(--cv-ink);line-height:1.65;background:var(--cv-card);overflow:hidden}
.cv-page *{box-sizing:border-box}
.cv-page h1,.cv-page h2,.cv-page h3,.cv-page h4{margin:0;font-weight:800;line-height:1.08;letter-spacing:-.02em}
.cv-page p{margin:0}
.cv-page a{text-decoration:none;color:inherit}
.cv-page img{display:block}
.cv-wrap{max-width:1200px;margin:0 auto;padding:0 1.5rem}
.cv-sec{padding:clamp(3.5rem,7vw,6rem) 0;position:relative}
.cv-eye{display:inline-flex;align-items:center;gap:.5rem;background:rgba(37,99,235,.1);color:var(--cv-blue);font-weight:700;text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;padding:.45rem 1rem;border-radius:100px;margin-bottom:1.1rem}
.cv-h{font-size:clamp(1.9rem,4vw,3rem);color:var(--cv-ink)}
.cv-sub{color:var(--cv-mut);font-size:1.02rem;max-width:60ch}
.cv-btn{display:inline-flex;align-items:center;gap:.7rem;background:var(--cv-blue2);color:#fff;font-weight:700;font-size:.95rem;padding:.85rem 1rem .85rem 1.6rem;border-radius:100px;transition:transform .25s,background .25s}
.cv-btn .cv-ar{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#fff;color:var(--cv-blue2);font-size:1rem}
.cv-btn:hover{transform:translateY(-2px);background:var(--cv-blue)}
/* nav */
.cv-nav{position:relative;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:1rem;background:#fff;border-radius:100px;padding:.65rem .7rem .65rem 1.6rem;margin:1.2rem auto 0;max-width:1180px;box-shadow:0 12px 30px rgba(15,23,42,.1)}
.cv-logo{display:flex;align-items:center;gap:.6rem;font-size:1.4rem;font-weight:800}
.cv-logo i{width:34px;height:34px;border-radius:50%;background:var(--cv-blue2);display:inline-block}
.cv-menu{display:flex;gap:2rem;font-size:.95rem;font-weight:600;color:var(--cv-ink)}
.cv-menu a:hover{color:var(--cv-blue2)}
/* hero */
.cv-hero{position:relative;color:#fff;min-height:640px;display:flex;align-items:center;border-radius:0 0 28px 28px;overflow:hidden}
.cv-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cv-hero-ov{position:absolute;inset:0;background:linear-gradient(100deg,rgba(11,26,58,.86) 0%,rgba(11,26,58,.45) 45%,rgba(11,26,58,.1) 100%)}
.cv-hero-in{position:relative;z-index:2;padding:5rem 0;max-width:640px;animation:cv-up .8s ease both}
.cv-hero h1{font-size:clamp(2.6rem,6vw,4.6rem);color:#fff;margin:1rem 0 1.4rem}
.cv-hero .cv-sub{color:rgba(255,255,255,.85)}
.cv-hero .cv-btn{background:#fff;color:var(--cv-ink);margin-top:2rem}
.cv-hero .cv-btn .cv-ar{background:var(--cv-blue2);color:#fff}
.cv-card-float{position:absolute;right:1.5rem;bottom:2.5rem;z-index:3;background:var(--cv-blue2);color:#fff;border-radius:18px;padding:1.5rem 1.8rem;max-width:360px;box-shadow:0 24px 60px rgba(11,26,58,.4)}
.cv-card-float b{font-size:2.6rem;font-weight:800}
.cv-card-float .cv-rate{display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem}
.cv-card-float .cv-stars{color:#fbbf24;letter-spacing:2px}
/* logos */
.cv-logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2.5rem;opacity:.55;padding-top:.5rem}
.cv-logos img{height:26px}
/* stats */
.cv-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;text-align:center}
.cv-stat b{display:block;font-size:clamp(2rem,4vw,3rem);color:var(--cv-blue2);font-weight:800}
.cv-stat span{color:var(--cv-mut);font-size:.95rem}
.cv-split{display:grid;grid-template-columns:.9fr 1.1fr;gap:3.5rem;align-items:center}
.cv-split img{width:100%;border-radius:18px;object-fit:cover}
/* services */
.cv-svc-sec{background:var(--cv-bg)}
.cv-grid4{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;margin-top:3rem}
.cv-svc{background:var(--cv-card);border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,.06);transition:transform .3s,box-shadow .3s}
.cv-svc:hover{transform:translateY(-6px);box-shadow:0 24px 50px rgba(15,23,42,.12)}
.cv-svc img{width:100%;height:240px;object-fit:cover}
.cv-svc-c{padding:1.6rem}
.cv-svc-c h3{font-size:1.35rem;margin-bottom:.5rem}
.cv-svc-c p{color:var(--cv-mut);font-size:.95rem;margin-bottom:1rem}
.cv-tags{display:flex;flex-wrap:wrap;gap:.5rem}
.cv-tags span{font-size:.78rem;font-weight:600;color:var(--cv-blue2);background:rgba(37,99,235,.1);padding:.3rem .8rem;border-radius:100px}
/* pricing */
.cv-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:3rem;align-items:stretch}
.cv-price{background:var(--cv-card);border:1px solid #e6ecf7;border-radius:20px;padding:2rem;display:flex;flex-direction:column}
.cv-price.pop{background:var(--cv-dark);color:#fff;border-color:var(--cv-dark)}
.cv-price h4{font-size:1.1rem;margin-bottom:.4rem}
.cv-price .cv-amt{font-size:2.8rem;font-weight:800;margin:.6rem 0}
.cv-price .cv-amt small{font-size:.9rem;font-weight:600;color:var(--cv-mut)}
.cv-price.pop .cv-amt small{color:rgba(255,255,255,.7)}
.cv-price ul{list-style:none;padding:0;margin:1.4rem 0 1.6rem;display:grid;gap:.7rem;font-size:.92rem}
.cv-price li{display:flex;gap:.6rem;align-items:flex-start}
.cv-price li::before{content:"✓";color:var(--cv-blue2);font-weight:800}
.cv-price.pop li::before{color:#7dd3fc}
.cv-price .cv-btn{margin-top:auto;justify-content:center}
/* testimonial */
.cv-quote-sec{background:var(--cv-bg)}
.cv-quote{max-width:760px;margin:0 auto;text-align:center}
.cv-quote .cv-big{font-size:clamp(1.4rem,2.6vw,2rem);font-weight:700;color:var(--cv-ink);margin:1.4rem 0}
.cv-quote .cv-avatar{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:1.5rem auto .6rem}
.cv-quote .cv-name{font-weight:700}
.cv-quote .cv-role{color:var(--cv-mut);font-size:.9rem}
/* faq */
.cv-faq{max-width:760px;margin:2.5rem auto 0;display:grid;gap:.9rem}
.cv-faq details{background:var(--cv-card);border:1px solid #e6ecf7;border-radius:14px;padding:1.1rem 1.4rem}
.cv-faq summary{font-weight:700;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:1rem}
.cv-faq summary::after{content:"+";color:var(--cv-blue2);font-weight:800}
.cv-faq details[open] summary::after{content:"–"}
.cv-faq p{color:var(--cv-mut);margin-top:.8rem;font-size:.95rem}
/* cta */
.cv-cta{position:relative;color:#fff;border-radius:24px;overflow:hidden;padding:clamp(2.5rem,5vw,4rem);text-align:center;margin:0 1.5rem}
.cv-cta-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cv-cta-ov{position:absolute;inset:0;background:linear-gradient(120deg,rgba(11,26,58,.9),rgba(37,99,235,.7))}
.cv-cta-in{position:relative;z-index:2}
.cv-cta h2{font-size:clamp(1.8rem,4vw,2.8rem);color:#fff;margin-bottom:1rem}
.cv-cta .cv-btn{background:#fff;color:var(--cv-ink);margin-top:1.5rem}
.cv-cta .cv-btn .cv-ar{background:var(--cv-blue2);color:#fff}
/* footer */
.cv-foot{background:var(--cv-dark);color:rgba(255,255,255,.6);padding:2.5rem 0;text-align:center;font-size:.85rem}
@media(max-width:880px){.cv-menu{display:none}.cv-split,.cv-grid4,.cv-grid3{grid-template-columns:1fr}.cv-stats{grid-template-columns:1fr}.cv-card-float{position:static;margin:1.5rem auto 0;max-width:100%}}
</style>
<div class="cv-page">

  <section class="cv-hero">
    <img class="cv-hero-bg" src="{hero_image}" alt="professional cleaning" loading="lazy">
    <div class="cv-hero-ov"></div>
    <div class="cv-wrap cv-hero-in">
      <span class="cv-eye">{hero_badge}</span>
      <h1>{hero_title}</h1>
      <p class="cv-sub">{hero_subtitle}</p>
      <a href="#contact" class="cv-btn">{hero_cta} <span class="cv-ar">→</span></a>
    </div>
    <div class="cv-card-float">
      <div class="cv-rate"><b>{trust_rate}</b><span>{trust_label}</span></div>
      <div class="cv-stars">★★★★★</div>
      <div>{reviews_count}</div>
    </div>
  </section>

  <section class="cv-sec"><div class="cv-wrap cv-stats">
    <div class="cv-stat"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
    <div class="cv-stat"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
    <div class="cv-stat"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
  </div></section>

  <section class="cv-sec" id="about"><div class="cv-wrap cv-split">
    <img src="{about_image}" alt="our cleaning team" loading="lazy">
    <div>
      <span class="cv-eye">About Us</span>
      <h2 class="cv-h">{about_title}</h2>
      <p class="cv-sub" style="margin-top:1rem">{about_text}</p>
      <a href="#contact" class="cv-btn" style="margin-top:2rem">{hero_cta} <span class="cv-ar">→</span></a>
    </div>
  </div></section>

  <section class="cv-sec cv-svc-sec" id="services"><div class="cv-wrap">
    <span class="cv-eye">Our Services</span>
    <h2 class="cv-h">{services_title}</h2>
    <p class="cv-sub" style="margin-top:1rem">{services_subtitle}</p>
    <div class="cv-grid4">
      <div class="cv-svc"><img src="{service_1_image}" alt="{service_1_title}" loading="lazy"><div class="cv-svc-c"><h3>{service_1_title}</h3><p>{service_1_desc}</p><div class="cv-tags"><span>{service_1_tag_1}</span><span>{service_1_tag_2}</span></div></div></div>
      <div class="cv-svc"><img src="{service_2_image}" alt="{service_2_title}" loading="lazy"><div class="cv-svc-c"><h3>{service_2_title}</h3><p>{service_2_desc}</p><div class="cv-tags"><span>{service_2_tag_1}</span><span>{service_2_tag_2}</span></div></div></div>
      <div class="cv-svc"><img src="{service_3_image}" alt="{service_3_title}" loading="lazy"><div class="cv-svc-c"><h3>{service_3_title}</h3><p>{service_3_desc}</p><div class="cv-tags"><span>{service_3_tag_1}</span><span>{service_3_tag_2}</span></div></div></div>
      <div class="cv-svc"><img src="{service_4_image}" alt="{service_4_title}" loading="lazy"><div class="cv-svc-c"><h3>{service_4_title}</h3><p>{service_4_desc}</p><div class="cv-tags"><span>{service_4_tag_1}</span><span>{service_4_tag_2}</span></div></div></div>
    </div>
  </div></section>

  <section class="cv-sec" id="pricing"><div class="cv-wrap">
    <span class="cv-eye">Pricing Plan</span>
    <h2 class="cv-h">{pricing_title}</h2>
    <p class="cv-sub" style="margin-top:1rem">{pricing_subtitle}</p>
    <div class="cv-grid3">
      <div class="cv-price"><h4>{plan_1_name}</h4><p class="cv-sub">{plan_1_desc}</p><div class="cv-amt">{plan_1_price}<small> / {plan_1_period}</small></div><ul><li>{plan_1_f1}</li><li>{plan_1_f2}</li><li>{plan_1_f3}</li><li>{plan_1_f4}</li></ul><a href="#contact" class="cv-btn">{hero_cta} <span class="cv-ar">→</span></a></div>
      <div class="cv-price pop"><h4>{plan_2_name}</h4><p class="cv-sub" style="color:rgba(255,255,255,.7)">{plan_2_desc}</p><div class="cv-amt">{plan_2_price}<small> / {plan_2_period}</small></div><ul><li>{plan_2_f1}</li><li>{plan_2_f2}</li><li>{plan_2_f3}</li><li>{plan_2_f4}</li></ul><a href="#contact" class="cv-btn" style="background:#fff;color:var(--cv-ink)">{hero_cta} <span class="cv-ar">→</span></a></div>
      <div class="cv-price"><h4>{plan_3_name}</h4><p class="cv-sub">{plan_3_desc}</p><div class="cv-amt">{plan_3_price}<small> / {plan_3_period}</small></div><ul><li>{plan_3_f1}</li><li>{plan_3_f2}</li><li>{plan_3_f3}</li><li>{plan_3_f4}</li></ul><a href="#contact" class="cv-btn">{hero_cta} <span class="cv-ar">→</span></a></div>
    </div>
  </div></section>

  <section class="cv-sec cv-quote-sec"><div class="cv-wrap cv-quote">
    <span class="cv-eye">Testimonial</span>
    <h2 class="cv-h">{testimonial_heading}</h2>
    <p class="cv-big">"{testimonial_text}"</p>
    <img class="cv-avatar" src="{testimonial_image}" alt="{testimonial_author}" loading="lazy">
    <div class="cv-name">{testimonial_author}</div>
    <div class="cv-role">{testimonial_role}</div>
  </div></section>

  <section class="cv-sec" id="faq"><div class="cv-wrap">
    <span class="cv-eye">FAQ</span>
    <h2 class="cv-h">{faq_title}</h2>
    <div class="cv-faq">
      <details open><summary>{faq_1_q}</summary><p>{faq_1_a}</p></details>
      <details><summary>{faq_2_q}</summary><p>{faq_2_a}</p></details>
      <details><summary>{faq_3_q}</summary><p>{faq_3_a}</p></details>
      <details><summary>{faq_4_q}</summary><p>{faq_4_a}</p></details>
    </div>
  </div></section>

  <section class="cv-sec" id="contact"><div class="cv-cta">
    <img class="cv-cta-bg" src="{cta_image}" alt="book a cleaning" loading="lazy">
    <div class="cv-cta-ov"></div>
    <div class="cv-cta-in">
      <h2>{cta_title}</h2>
      <p class="cv-sub" style="color:rgba(255,255,255,.85);margin-inline:auto">{cta_subtitle}</p>
      <a href="tel:{phone}" class="cv-btn">📞 {phone} <span class="cv-ar">→</span></a>
    </div>
  </div></section>

  
</div>`;
  return {
    id: "cleaning-service",
    name: "Cleaning Service Template",
    description: "Modern cleaning company landing page with cinematic hero, floating trust card, stats, service grid, pricing plans, testimonial and FAQ — modelled 1:1 on the Cevira theme.",
    content,
    variables: ["{company_name}", "{hero_badge}", "{hero_title}", "{hero_subtitle}", "{hero_cta}", "{trust_rate}", "{trust_label}", "{reviews_count}", "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{about_title}", "{about_text}", "{services_title}", "{services_subtitle}", "{service_1_title}", "{service_1_desc}", "{service_1_tag_1}", "{service_1_tag_2}", "{service_2_title}", "{service_2_desc}", "{service_2_tag_1}", "{service_2_tag_2}", "{service_3_title}", "{service_3_desc}", "{service_3_tag_1}", "{service_3_tag_2}", "{service_4_title}", "{service_4_desc}", "{service_4_tag_1}", "{service_4_tag_2}", "{pricing_title}", "{pricing_subtitle}", "{plan_1_name}", "{plan_1_desc}", "{plan_1_price}", "{plan_1_period}", "{plan_1_f1}", "{plan_1_f2}", "{plan_1_f3}", "{plan_1_f4}", "{plan_2_name}", "{plan_2_desc}", "{plan_2_price}", "{plan_2_period}", "{plan_2_f1}", "{plan_2_f2}", "{plan_2_f3}", "{plan_2_f4}", "{plan_3_name}", "{plan_3_desc}", "{plan_3_price}", "{plan_3_period}", "{plan_3_f1}", "{plan_3_f2}", "{plan_3_f3}", "{plan_3_f4}", "{testimonial_heading}", "{testimonial_text}", "{testimonial_author}", "{testimonial_role}", "{faq_title}", "{faq_1_q}", "{faq_1_a}", "{faq_2_q}", "{faq_2_a}", "{faq_3_q}", "{faq_3_a}", "{faq_4_q}", "{faq_4_a}", "{cta_title}", "{cta_subtitle}", "{phone}", "{address}", "{city}", "{year}", "{hero_image}", "{about_image}", "{service_1_image}", "{service_2_image}", "{service_3_image}", "{service_4_image}", "{testimonial_image}", "{cta_image}"],
    category: "local-seo",
    tags: ["cleaning", "local", "service", "home", "office"],
    author: "Community", downloads: 912, rating: 4.8,
    seo_title_pattern: "{company_name} — Professional Cleaning Services in {city}",
    seo_description_pattern: "{hero_subtitle} Book {company_name} in {city}. Call {phone}.",
    og_title_pattern: "{company_name} — Professional Cleaning Services in {city}", og_description_pattern: "{hero_subtitle} Book {company_name} in {city}. Call {phone}.", og_image_pattern: "{about_image}",
    slug_pattern: "{company_name}-cleaning",
    schema_type: "LocalBusiness",
    platform: "generic",
    defaultValues: {
      company_name: "Cevira",
      hero_badge: "Trusted Cleaning Solutions",
      hero_title: "Cleaning Made Simple, Fast & Reliable",
      hero_subtitle: "Book expert cleaners in minutes. Transparent pricing, flexible scheduling, and guaranteed results.",
      hero_cta: "Schedule Now",
      trust_rate: "98.99%",
      trust_label: "Trusted Rate",
      reviews_count: "50K+ Verified Reviews",
      stat_1_num: "1.2k",
      stat_1_label: "Homes & Offices Cleaned",
      stat_2_num: "850",
      stat_2_label: "Gardens Maintained",
      stat_3_num: "3.5k",
      stat_3_label: "Items Delivered",
      about_title: "We're a team of dedicated cleaning professionals",
      about_text: "Our mission is simple — to make your space cleaner, healthier, and more comfortable without adding stress to your day. We deliver spotless results with every visit.",
      services_title: "Best Cleaning Services",
      services_subtitle: "We take pride in delivering consistent, high-quality cleaning services that our clients rely on every day.",
      service_1_title: "Home Cleaning",
      service_1_desc: "Keep your home fresh, organized, and spotless with our regular cleaning services daily.",
      service_1_tag_1: "Deep Clean",
      service_1_tag_2: "Apartment",
      service_2_title: "Office Cleaning",
      service_2_desc: "Maintain a healthy and productive environment with our comprehensive office sanitization.",
      service_2_tag_1: "Workspace",
      service_2_tag_2: "Sanitization",
      service_3_title: "Deep Cleaning",
      service_3_desc: "Ensure every corner is spotless with our thorough, detail-oriented deep cleaning service.",
      service_3_tag_1: "Move-Out",
      service_3_tag_2: "Intensive",
      service_4_title: "Workplace Cleaning",
      service_4_desc: "Make sure your space is pristine and ready with our detailed professional cleaning.",
      service_4_tag_1: "Exit Cleaning",
      service_4_tag_2: "Commercial",
      pricing_title: "Professional Cleaning, Clearly Priced",
      pricing_subtitle: "Choose the plan that fits your needs. No hidden fees — just reliable, high-quality cleaning you can trust.",
      plan_1_name: "Basic Clean",
      plan_1_desc: "Enhanced cleaning with extra care.",
      plan_1_price: "$49",
      plan_1_period: "Per Month",
      plan_1_f1: "General dusting & wiping",
      plan_1_f2: "Floor cleaning & vacuuming",
      plan_1_f3: "Bathroom & kitchen cleaning",
      plan_1_f4: "Window and mirror polishing",
      plan_2_name: "Standard Clean",
      plan_2_desc: "Everything in Basic Plan.",
      plan_2_price: "$79",
      plan_2_period: "Per Month",
      plan_2_f1: "Trash removal",
      plan_2_f2: "Window and mirror polishing",
      plan_2_f3: "Furniture dusting and polishing",
      plan_2_f4: "Floor cleaning & vacuuming",
      plan_3_name: "Business Plan",
      plan_3_desc: "Everything in Basic & Standard Plan.",
      plan_3_price: "$99",
      plan_3_period: "Per Month",
      plan_3_f1: "Floor cleaning & vacuuming",
      plan_3_f2: "General dusting & wiping",
      plan_3_f3: "Bathroom & kitchen cleaning",
      plan_3_f4: "Trash removal",
      testimonial_heading: "Our Reputation, Built on Client Trust",
      testimonial_text: "Fast, reliable, and always spotless. The best cleaning service we've used so far.",
      testimonial_author: "Cody Fisher",
      testimonial_role: "Manager",
      faq_title: "Common Questions, Clearly Answered",
      faq_1_q: "What services do you offer?",
      faq_1_a: "We provide a range of cleaning services including residential cleaning, office cleaning, deep cleaning, and specialized services like sofa, carpet, and window cleaning.",
      faq_2_q: "How do I book a cleaning service?",
      faq_2_a: "Simply schedule online or give us a call. Choose your service, pick a time that works for you, and our team will handle the rest.",
      faq_3_q: "Do I need to provide cleaning supplies?",
      faq_3_a: "No — our professional cleaners arrive fully equipped with eco-friendly supplies and equipment.",
      faq_4_q: "Are your cleaners trained and insured?",
      faq_4_a: "Yes. Every cleaner is fully vetted, professionally trained, and insured for your peace of mind.",
      cta_title: "Stay consistent with your cleaning routine",
      cta_subtitle: "A better home starts with better cleaning. Schedule your service today.",
      phone: "+1 (212) 555-0199",
      address: "120 Sparkle Avenue",
      city: "New York",
      year: "2026",
      hero_image: FU + "/T5ZwdF4fAv939hZRY9sN4JOX50.png",
      about_image: FU + "/RPiugULV1heoeVCjDfb9MXnVk.png",
      service_1_image: FU + "/BHtyXThekWm38efWvDJkVyqbLVM.png",
      service_2_image: FU + "/56ZqtDbQrIjdTAh4EfEp6NzsCS0.png",
      service_3_image: FU + "/re8cwwnrRcBWlS63TvqlvS01NY.png",
      service_4_image: FU + "/6Paa4KhXEnAGF8Wm4oBiuJj7Rxw.png",
      testimonial_image: FU + "/wdpdbLQu1F6oAUX7W0gwIxxako.png",
      cta_image: FU + "/6SpPNtvaL0e5EOLPwsQeQZL9718.png",
    },
  };
};


// ── Estelle jewelry collection (Framer "estelle" template, 1:1) ──────────────
const estelleCollection = (): MarketplaceTemplate => {
  const content = `<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@400;500;600&display=swap');
@keyframes es-up{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
.es-page{--es-bg:#0d0d0d;--es-ink:#f4f1ec;--es-mut:#a7a39c;--es-line:rgba(244,241,236,.14);font-family:'Inter',system-ui,sans-serif;background:var(--es-bg);color:var(--es-ink);line-height:1.6;overflow:hidden}
.es-page *{box-sizing:border-box}
.es-page h1,.es-page h2,.es-page h3{margin:0;font-family:'Playfair Display',Georgia,serif;font-weight:500;line-height:1.02}
.es-page p{margin:0}
.es-page a{text-decoration:none;color:inherit}
.es-page img{display:block;width:100%;height:100%;object-fit:cover}
.es-wrap{max-width:1280px;margin:0 auto;padding:0 1.8rem}
.es-serif{font-family:'Playfair Display',Georgia,serif}
.es-nav{display:flex;align-items:center;justify-content:space-between;padding:1.6rem 1.8rem;max-width:1280px;margin:0 auto}
.es-nav .es-ic{display:flex;flex-direction:column;gap:5px;cursor:pointer}
.es-nav .es-ic span{width:26px;height:1.5px;background:var(--es-ink)}
.es-logo{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:1.9rem;letter-spacing:.02em}
.es-cart{font-size:.9rem;letter-spacing:.04em}
.es-hero{padding:clamp(2rem,6vw,5rem) 0 clamp(3rem,7vw,6rem)}
.es-eye{text-transform:uppercase;letter-spacing:.22em;font-size:.74rem;color:var(--es-mut);margin-bottom:1.4rem}
.es-hero h1{font-size:clamp(2.8rem,11vw,10rem);font-style:italic;letter-spacing:-.01em}
.es-hero-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:2rem;margin-top:2.4rem}
.es-hero-sub{max-width:34ch;color:var(--es-mut);font-size:1.02rem}
.es-link{display:inline-block;margin-top:1.1rem;text-transform:uppercase;letter-spacing:.16em;font-size:.78rem;border-bottom:1px solid var(--es-ink);padding-bottom:3px}
.es-btns{display:flex;gap:.8rem;flex-wrap:wrap}
.es-btn{padding:.95rem 1.8rem;border-radius:100px;font-size:.85rem;letter-spacing:.03em;border:1px solid var(--es-line);transition:.25s}
.es-btn.alt{background:var(--es-ink);color:var(--es-bg)}
.es-btn:hover{transform:translateY(-2px)}
.es-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4rem}
.es-card{animation:es-up .7s ease both}
.es-card .es-ph{position:relative;aspect-ratio:7/8;border-radius:8px;overflow:hidden;background:#151515}
.es-card .es-ph img{transition:transform .7s ease}
.es-card:hover .es-ph img{transform:scale(1.05)}
.es-card h3{font-family:'Inter',sans-serif;font-weight:600;font-size:1rem;margin-top:1rem}
.es-card .es-meta{color:var(--es-mut);font-size:.85rem;margin-top:.15rem}
.es-card .es-price{font-size:.95rem;margin-top:.5rem}
.es-sec-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1.8rem}
.es-sec-head .es-t{text-transform:uppercase;letter-spacing:.18em;font-size:.78rem;color:var(--es-mut)}
.es-sec{padding:clamp(2.5rem,6vw,5rem) 0}
.es-life{position:relative;border-radius:12px;overflow:hidden;aspect-ratio:3/2;margin:1rem 0}
.es-life .es-cap{position:absolute;left:1.4rem;bottom:1.2rem;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.es-house{text-align:center;max-width:760px;margin:0 auto;padding:clamp(3rem,7vw,6rem) 1rem}
.es-house h2{font-size:clamp(2rem,5vw,3.4rem);font-style:italic;margin-bottom:1.4rem}
.es-house p{color:var(--es-mut);font-size:1.08rem;max-width:46ch;margin:0 auto}
.es-cats{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem}
.es-cat{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:3/4}
.es-cat img{transition:transform .7s ease}
.es-cat:hover img{transform:scale(1.06)}
.es-cat span{position:absolute;left:0;right:0;bottom:0;padding:1.4rem 1.2rem;font-family:'Playfair Display',serif;font-style:italic;font-size:1.4rem;background:linear-gradient(transparent,rgba(0,0,0,.65))}
.es-foot{border-top:1px solid var(--es-line);margin-top:3rem;padding:2.4rem 0;display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;color:var(--es-mut);font-size:.82rem;letter-spacing:.04em}
@media(max-width:900px){.es-grid,.es-cats{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.es-grid,.es-cats{grid-template-columns:1fr}}
</style>
<div class="es-page">
  <header class="es-hero es-wrap">
    <div class="es-eye">{season_label}</div>
    <h1>{hero_title}</h1>
    <div class="es-hero-row">
      <div>
        <p class="es-hero-sub">{hero_subtitle}</p>
        <a class="es-link" href="#collection">{hero_cta}</a>
      </div>
      <div class="es-btns">
        <a class="es-btn" href="#collection">{hero_btn_1}</a>
        <a class="es-btn alt" href="#collection">{hero_btn_2}</a>
      </div>
    </div>
  </header>
  <section class="es-sec es-wrap" id="collection">
    <div class="es-sec-head"><div class="es-t">{products_label}</div><a class="es-link" href="#categories">{products_cta}</a></div>
    <div class="es-grid">
      <a class="es-card"><div class="es-ph"><img src="{product_1_image}" alt="{product_1_name}"/></div><h3>{product_1_name}</h3><div class="es-meta">{product_1_material} · {product_1_category}</div><div class="es-price">{product_1_price}</div></a>
      <a class="es-card"><div class="es-ph"><img src="{product_2_image}" alt="{product_2_name}"/></div><h3>{product_2_name}</h3><div class="es-meta">{product_2_material} · {product_2_category}</div><div class="es-price">{product_2_price}</div></a>
      <a class="es-card"><div class="es-ph"><img src="{product_3_image}" alt="{product_3_name}"/></div><h3>{product_3_name}</h3><div class="es-meta">{product_3_material} · {product_3_category}</div><div class="es-price">{product_3_price}</div></a>
      <a class="es-card"><div class="es-ph"><img src="{product_4_image}" alt="{product_4_name}"/></div><h3>{product_4_name}</h3><div class="es-meta">{product_4_material} · {product_4_category}</div><div class="es-price">{product_4_price}</div></a>
    </div>
  </section>
  <section class="es-wrap">
    <div class="es-life"><img src="{lifestyle_image}" alt="{lifestyle_caption}"/><div class="es-cap">{lifestyle_caption}</div></div>
  </section>
  <section class="es-house">
    <h2>{house_title}</h2>
    <p>{house_text}</p>
    <a class="es-link" href="#categories">{house_cta}</a>
  </section>
  <section class="es-sec es-wrap" id="categories">
    <div class="es-cats">
      <a class="es-cat"><img src="{cat_1_image}" alt="{cat_1_name}"/><span>{cat_1_name}</span></a>
      <a class="es-cat"><img src="{cat_2_image}" alt="{cat_2_name}"/><span>{cat_2_name}</span></a>
      <a class="es-cat"><img src="{cat_3_image}" alt="{cat_3_name}"/><span>{cat_3_name}</span></a>
      <a class="es-cat"><img src="{cat_4_image}" alt="{cat_4_name}"/><span>{cat_4_name}</span></a>
    </div>
    
  </section>
</div>`;
  return {
    id: "jewelry-collection",
    name: "Jewelry Collection Template",
    description: "Editorial dark-luxe jewelry collection page with oversized serif hero, product grid, lifestyle image, brand story and category tiles — modelled 1:1 on the Estelle Framer template.",
    content,
    variables: ["{brand_name}", "{season_label}", "{hero_title}", "{hero_subtitle}", "{hero_cta}", "{hero_btn_1}", "{hero_btn_2}", "{products_label}", "{products_cta}", "{product_1_name}", "{product_1_material}", "{product_1_category}", "{product_1_price}", "{product_1_image}", "{product_2_name}", "{product_2_material}", "{product_2_category}", "{product_2_price}", "{product_2_image}", "{product_3_name}", "{product_3_material}", "{product_3_category}", "{product_3_price}", "{product_3_image}", "{product_4_name}", "{product_4_material}", "{product_4_category}", "{product_4_price}", "{product_4_image}", "{lifestyle_image}", "{lifestyle_caption}", "{house_title}", "{house_text}", "{house_cta}", "{cat_1_name}", "{cat_1_image}", "{cat_2_name}", "{cat_2_image}", "{cat_3_name}", "{cat_3_image}", "{cat_4_name}", "{cat_4_image}", "{year}", "{footer_note}"],
    category: "shopify",
    tags: ["shopify", "collection", "jewelry", "ecommerce", "luxury"],
    author: "Community", downloads: 1678, rating: 4.9,
    seo_title_pattern: "{hero_title} | {brand_name}",
    seo_description_pattern: "{hero_subtitle} Shop the new {brand_name} collection online.",
    og_title_pattern: "{hero_title} | {brand_name}", og_description_pattern: "{hero_subtitle} Shop the new {brand_name} collection online.", og_image_pattern: "{product_1_image}",
    schema_type: "CollectionPage",
    platform: "shopify",
    defaultValues: {
      brand_name: "estelle",
      season_label: "Spring / Summer 26",
      hero_title: "Explore our new collection",
      hero_subtitle: "Where jewelry lives among objects, memories, and moments—a jewelry box you can step into.",
      hero_cta: "Step inside",
      hero_btn_1: "New arrivals",
      hero_btn_2: "Explore bracelets",
      products_label: "Featured pieces",
      products_cta: "View all",
      product_1_name: "Tennis bracelet",
      product_1_material: "Gold",
      product_1_category: "Tennis bracelets",
      product_1_price: "$215.00",
      product_1_image: FU + "/39CCKAIYws8A2u56rf8uxnNX3A.png?width=1189&height=1323",
      product_2_name: "Tennis chain 6 mm",
      product_2_material: "Silver",
      product_2_category: "Tennis chains",
      product_2_price: "$215.00",
      product_2_image: FU + "/7tvM7vpgKyf1snoSgQGbqdObBw.png?width=1189&height=1323",
      product_3_name: "Diamond tennis bracelet",
      product_3_material: "Silver",
      product_3_category: "Tennis bracelets",
      product_3_price: "$215.00",
      product_3_image: FU + "/ENIeSWMm4azWEuKncxUZLXaQS9Y.png?width=1123&height=1401",
      product_4_name: "Graduated necklace",
      product_4_material: "Silver",
      product_4_category: "Tennis chains",
      product_4_price: "$215.00",
      product_4_image: FU + "/oNVJvt0GU1EswCM101o9wxI.png?width=1188&height=1324",
      lifestyle_image: FU + "/gPRaTunYm8woOct9QsTbOWHdc.png?width=2688&height=1792",
      lifestyle_caption: "Sofia, Bulgaria",
      house_title: "The house of estelle",
      house_text: "Where jewelry lives among objects, memories, and moments, a jewelry box you can step into.",
      house_cta: "Step inside",
      cat_1_name: "Bracelets",
      cat_1_image: FU + "/76FTylOrrFHZO1FYU1fs5sIplis.png?width=718&height=920",
      cat_2_name: "Necklaces",
      cat_2_image: FU + "/cK8cTJdQdIqoKnFI7YdRxwwXi10.png?width=718&height=920",
      cat_3_name: "Earrings",
      cat_3_image: FU + "/vzEwpTRmYyWOv8AzRMWjVW03NY.png?width=718&height=920",
      cat_4_name: "Rings",
      cat_4_image: FU + "/a7meYRK6ZacbhZXbzdRutNkuM.png?width=718&height=920",
      year: "2026",
      footer_note: "Made with love in Sofia",
    },
  };
};






// ── Vibe accent palettes ──────────────────────────────────────────────────
// Each template gets one of these flavors so the marketplace feels varied.
type VibeAccent = "aurora" | "emerald" | "sunset" | "neon" | "royal" | "rose" | "ocean" | "amber";

const VIBE_PALETTES: Record<VibeAccent, { c1: string; c2: string; c3: string; glow: string }> = {
  aurora:  { c1: "#6366f1", c2: "#8b5cf6", c3: "#d946ef", glow: "99,102,241" },
  emerald: { c1: "#059669", c2: "#10b981", c3: "#34d399", glow: "16,185,129" },
  sunset:  { c1: "#f97316", c2: "#ef4444", c3: "#ec4899", glow: "239,68,68" },
  neon:    { c1: "#06b6d4", c2: "#14b8a6", c3: "#84cc16", glow: "20,184,166" },
  royal:   { c1: "#1e40af", c2: "#7c3aed", c3: "#9333ea", glow: "124,58,237" },
  rose:    { c1: "#e11d48", c2: "#db2777", c3: "#a855f7", glow: "219,39,119" },
  ocean:   { c1: "#0284c7", c2: "#06b6d4", c3: "#22d3ee", glow: "8,145,178" },
  amber:   { c1: "#d97706", c2: "#f59e0b", c3: "#fbbf24", glow: "245,158,11" },
};

const vibeAccentStyles = (vibe: VibeAccent): string => {
  const p = VIBE_PALETTES[vibe];
  return `<style data-vibe="${vibe}">
.pgp-page .pgp-eyebrow{background:linear-gradient(135deg,rgba(${p.glow},.18),rgba(${p.glow},.08))}
.pgp-page .pgp-eyebrow::before{background:linear-gradient(135deg,${p.c1},${p.c3});box-shadow:0 0 10px rgba(${p.glow},.7)}
.pgp-page .pgp-btn-primary{background:linear-gradient(135deg,${p.c1} 0%,${p.c2} 50%,${p.c3} 100%);box-shadow:0 12px 30px rgba(${p.glow},.45),inset 0 1px 0 rgba(255,255,255,.25)}
.pgp-page .pgp-btn-primary:hover{box-shadow:0 18px 40px rgba(${p.glow},.6)}
.pgp-page .pgp-card .pgp-icon{background:linear-gradient(135deg,rgba(${p.glow},.22),rgba(${p.glow},.1));border-color:rgba(${p.glow},.3);box-shadow:0 8px 20px rgba(${p.glow},.22)}
.pgp-page .pgp-card:hover{box-shadow:0 24px 60px rgba(${p.glow},.22),0 8px 20px rgba(0,0,0,.08);border-color:rgba(${p.glow},.45)}
.pgp-page .pgp-hero::before{background:radial-gradient(circle,rgba(${p.glow},.6),transparent 70%)}
.pgp-page .pgp-hero::after{background:radial-gradient(circle,rgba(${p.glow},.45),transparent 70%)}
.pgp-page .pgp-hero-overlay{background:linear-gradient(135deg,rgba(15,23,42,.78) 0%,rgba(${p.glow},.45) 50%,rgba(15,23,42,.7) 100%)}
.pgp-page .pgp-section-head h2{background:linear-gradient(135deg,currentColor 0%,${p.c2} 100%);-webkit-background-clip:text;background-clip:text}
</style>`;
};

// ── Page builder ───────────────────────────────────────────────────────────
// Auto-rotates vibe accent across templates so the gallery feels varied.
const VIBE_ROTATION: VibeAccent[] = ["aurora", "sunset", "emerald", "royal", "ocean", "rose", "neon", "amber"];
let _pageCallIdx = 0;
const page = (sections: string, vibe?: VibeAccent) => {
  const v = vibe ?? VIBE_ROTATION[_pageCallIdx++ % VIBE_ROTATION.length];
  return `${BASE_STYLES}${vibeAccentStyles(v)}
<div class="pgp-page" data-vibe="${v}">
  <div class="pgp-wrap">
    ${sections}
  </div>
</div>`;
};

// ── Platform-native theming ─────────────────────────────────────────────────
// WordPress / Shopify / PrestaShop templates are re-skinned so they look + feel
// native to the target CMS (not the generic "AI vibe" gradient look) and carry
// the exact wrapper classes the publish theme-adapters expect. This means when a
// user picks a WordPress template it publishes looking like a clean block theme
// and stays easy to maintain inside WordPress (Gutenberg/Astra/Kadence). Same
// idea for Shopify (Dawn) and PrestaShop (Bootstrap).
//
// IMPORTANT: these <style> blocks must survive the publish adapters, which strip
// any <style> that targets html/body or a bare `*{box-sizing}`. We scope every
// rule to the wrapper class and use `:where(*)` so nothing gets removed.

export type TemplatePlatform = "wordpress" | "shopify" | "prestashop" | "generic";

const PLATFORM_BY_CATEGORY: Record<string, TemplatePlatform> = {
  wordpress: "wordpress",
  shopify: "shopify",
  prestashop: "prestashop",
};

export const platformFromCategory = (category: string): TemplatePlatform =>
  PLATFORM_BY_CATEGORY[category] ?? "generic";

// Native wrapper classes — identical to what the theme-adapters emit, so the
// publish step recognises the content as already-themed and won't double-wrap.
const PLATFORM_WRAPPER_CLASS: Record<Exclude<TemplatePlatform, "generic">, string> = {
  wordpress: "entry-content wp-block-post-content is-layout-constrained wp-themed-content",
  shopify: "page-width rte shopify-themed-content",
  prestashop: "rte page-content page-cms prestashop-themed-content",
};

// Per-platform skin: deeply re-themes the generic pgp-* design so each template
// looks like an authentic theme on its target CMS — matching typography, spacing,
// hero treatment, cards, buttons, testimonials, FAQ and forms.
//   • WordPress → clean block theme (Twenty Twenty-Four / Astra / Kadence)
//   • Shopify   → Dawn reference theme (whitespace, uppercase CTAs, thin rules)
//   • PrestaShop→ Classic theme (Bootstrap cards, #2fb5d2 brand blue)
// Scoped to `.pgp-skin-<platform> .pgp-page` so every rule is at least 0,3,0 —
// higher specificity than the base/vibe styles (0,2,0) it must override — and so
// it never leaks and always survives the publish adapters (no html/body
// selectors, no bare `*{box-sizing}`).
type SkinRule = [suffix: string, decls: string];
type SkinConfig = { font: string; head: string; rules: SkinRule[] };

const SKIN_RULES: Record<Exclude<TemplatePlatform, "generic">, SkinConfig> = {
  wordpress: {
    font: `font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1e1e1e;line-height:1.7`,
    head: `font-family:"Helvetica Neue",-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:-.01em;color:#1e1e1e`,
    rules: [
      [".pgp-section", "padding:clamp(3rem,6vw,5.5rem) 0"],
      [".pgp-eyebrow", "background:transparent;border:none;padding:0;letter-spacing:.16em;font-size:.72rem;color:#6b7280;opacity:1;backdrop-filter:none"],
      [".pgp-eyebrow::before", "display:none"],
      [".pgp-section-head h2", "background:none;-webkit-text-fill-color:#1e1e1e;color:#1e1e1e;font-weight:700"],
      [".pgp-section-head p", "opacity:.7"],
      [".pgp-card", "background:#fff;border:1px solid #e5e7eb;border-radius:6px;box-shadow:none;backdrop-filter:none;padding:1.75rem"],
      [".pgp-card::before", "display:none"],
      [".pgp-card:hover", "transform:none;box-shadow:0 4px 14px rgba(0,0,0,.06);border-color:#d1d5db"],
      [".pgp-card .pgp-icon", "background:#f3f4f6;border:1px solid #e5e7eb;box-shadow:none;border-radius:6px;color:#1e1e1e"],
      [".pgp-btn", "border-radius:4px;font-weight:600;padding:.85rem 1.8rem"],
      [".pgp-btn::after", "display:none"],
      [".pgp-btn-primary", "background:#1e1e1e;background-image:none;color:#fff;box-shadow:none"],
      [".pgp-btn-primary:hover", "background:#000;box-shadow:none;transform:none;filter:none"],
      [".pgp-btn-outline", "border:1px solid #1e1e1e;color:#1e1e1e"],
      [".pgp-hero", "border-radius:0;box-shadow:none"],
      [".pgp-hero-overlay", "background:linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,.6))"],
      [".pgp-hero-inner h1", "background:none;-webkit-text-fill-color:#fff;font-weight:800;text-shadow:none"],
      [".pgp-hero::before,.pgp-hero::after", "display:none"],
      [".pgp-trust", "background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;box-shadow:none;backdrop-filter:none"],
      [".pgp-trust .num", "background:none;-webkit-text-fill-color:#1e1e1e;color:#1e1e1e"],
      [".pgp-tcard", "background:#fff;border:1px solid #e5e7eb;border-radius:6px;box-shadow:none;backdrop-filter:none"],
      [".pgp-faq details", "background:#fff;border:1px solid #e5e7eb;border-radius:6px"],
      [".pgp-form-group input,.pgp-form-group textarea", "border:1px solid #d1d5db;border-radius:4px;background:#fff"],
      [".pgp-cta-band .pgp-hero-overlay", "background:linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,.65))"],
    ],
  },
  shopify: {
    font: `font-family:"Assistant",-apple-system,"Helvetica Neue",Helvetica,Arial,sans-serif;color:#121212;line-height:1.75`,
    head: `font-family:"Assistant","Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:600;letter-spacing:-.01em;color:#121212`,
    rules: [
      [".pgp-section", "padding:clamp(3.5rem,7vw,6.5rem) 0"],
      [".pgp-eyebrow", "background:transparent;border:none;border-radius:0;padding:0;letter-spacing:.22em;font-size:.7rem;text-transform:uppercase;color:#707070;opacity:1;backdrop-filter:none"],
      [".pgp-eyebrow::before", "display:none"],
      [".pgp-section-head h2", "background:none;-webkit-text-fill-color:#121212;color:#121212;font-weight:600;font-size:clamp(1.8rem,3.5vw,2.6rem)"],
      [".pgp-section-head p", "opacity:.72"],
      [".pgp-card", "background:#fff;border:1px solid #e1e1e1;border-radius:8px;box-shadow:none;backdrop-filter:none;padding:2rem"],
      [".pgp-card::before", "display:none"],
      [".pgp-card:hover", "transform:none;box-shadow:0 6px 20px rgba(0,0,0,.05);border-color:#c9c9c9"],
      [".pgp-card .pgp-icon", "background:#f4f4f4;border:1px solid #e1e1e1;box-shadow:none;border-radius:8px;color:#121212"],
      [".pgp-btn", "border-radius:4px;font-weight:600;letter-spacing:.02em;padding:.95rem 2rem"],
      [".pgp-btn::after", "display:none"],
      [".pgp-btn-primary", "background:#121212;background-image:none;color:#fff;box-shadow:none;animation:none"],
      [".pgp-btn-primary:hover", "background:#404040;box-shadow:none;transform:none;filter:none"],
      [".pgp-btn-outline", "border:1px solid #121212;color:#121212"],
      [".pgp-hero", "border-radius:0;box-shadow:none"],
      [".pgp-hero-overlay", "background:linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,.5))"],
      [".pgp-hero-inner h1", "background:none;-webkit-text-fill-color:#fff;font-weight:600;text-shadow:none"],
      [".pgp-hero::before,.pgp-hero::after", "display:none"],
      [".pgp-trust", "background:#fafafa;border:1px solid #e1e1e1;border-radius:8px;box-shadow:none;backdrop-filter:none"],
      [".pgp-trust .num", "background:none;-webkit-text-fill-color:#121212;color:#121212"],
      [".pgp-tcard", "background:#fff;border:1px solid #e1e1e1;border-radius:8px;box-shadow:none;backdrop-filter:none"],
      [".pgp-faq details", "background:#fff;border:1px solid #e1e1e1;border-radius:8px"],
      [".pgp-form-group input,.pgp-form-group textarea", "border:1px solid #c9c9c9;border-radius:4px;background:#fff"],
      [".pgp-cta-band .pgp-hero-overlay", "background:linear-gradient(180deg,rgba(0,0,0,.4),rgba(0,0,0,.55))"],
    ],
  },
  prestashop: {
    font: `font-family:Roboto,"Open Sans",-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#232323;line-height:1.7`,
    head: `font-family:Roboto,"Open Sans",Helvetica,Arial,sans-serif;font-weight:700;color:#232323`,
    rules: [
      [".pgp-section", "padding:clamp(3rem,6vw,5.5rem) 0"],
      [".pgp-eyebrow", "background:transparent;border:none;padding:0;letter-spacing:.14em;font-size:.72rem;color:#2fb5d2;opacity:1;backdrop-filter:none"],
      [".pgp-eyebrow::before", "display:none"],
      [".pgp-section-head h2", "background:none;-webkit-text-fill-color:#232323;color:#232323;font-weight:700"],
      [".pgp-section-head p", "opacity:.7"],
      [".pgp-card", "background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:.25rem;box-shadow:0 1px 4px rgba(0,0,0,.06);backdrop-filter:none;padding:1.75rem"],
      [".pgp-card::before", "display:none"],
      [".pgp-card:hover", "transform:none;box-shadow:0 6px 16px rgba(0,0,0,.1);border-color:rgba(0,0,0,.12)"],
      [".pgp-card .pgp-icon", "background:#eef7fb;border:1px solid #d4ecf4;box-shadow:none;border-radius:.25rem;color:#2fb5d2"],
      [".pgp-btn", "border-radius:.25rem;font-weight:600;padding:.85rem 1.8rem"],
      [".pgp-btn::after", "display:none"],
      [".pgp-btn-primary", "background:#2fb5d2;background-image:none;color:#fff;box-shadow:none;animation:none"],
      [".pgp-btn-primary:hover", "background:#25a0bb;box-shadow:none;transform:none;filter:none"],
      [".pgp-btn-outline", "border:1px solid #2fb5d2;color:#2fb5d2"],
      [".pgp-hero", "border-radius:.25rem;box-shadow:none"],
      [".pgp-hero-overlay", "background:linear-gradient(180deg,rgba(35,35,35,.45),rgba(35,35,35,.62))"],
      [".pgp-hero-inner h1", "background:none;-webkit-text-fill-color:#fff;text-shadow:none"],
      [".pgp-hero::before,.pgp-hero::after", "display:none"],
      [".pgp-trust", "background:#f6f9fb;border:1px solid #e3eef3;border-radius:.25rem;box-shadow:none;backdrop-filter:none"],
      [".pgp-trust .num", "background:none;-webkit-text-fill-color:#2fb5d2;color:#2fb5d2"],
      [".pgp-tcard", "background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:.25rem;box-shadow:0 1px 4px rgba(0,0,0,.06);backdrop-filter:none"],
      [".pgp-faq details", "background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:.25rem"],
      [".pgp-form-group input,.pgp-form-group textarea", "border:1px solid #ced4da;border-radius:.25rem;background:#fff"],
      [".pgp-cta-band .pgp-hero-overlay", "background:linear-gradient(180deg,rgba(47,181,210,.55),rgba(35,35,35,.6))"],
    ],
  },
};

// ── Skin variants ───────────────────────────────────────────────────────────
// Each platform ships several authentic theme variants the user can pick before
// generating pages. Variant #1 is the default. A variant supplies optional
// font/head overrides plus extra rules that are appended AFTER the base rules
// (same specificity → later rule wins by source order), so it cleanly retunes
// typography, colors, radius and button treatment without losing the base reset.
export interface SkinVariant {
  id: string;
  label: string;
  description: string;
  font?: string;
  head?: string;
  rules?: SkinRule[];
}

export const PLATFORM_SKIN_VARIANTS: Record<Exclude<TemplatePlatform, "generic">, SkinVariant[]> = {
  shopify: [
    { id: "dawn", label: "Dawn", description: "Shopify's default reference theme — airy whitespace, neutral palette, square black CTAs." },
    {
      id: "studio",
      label: "Studio",
      description: "Editorial Shopify theme — serif headings, warm tones, soft rounded cards.",
      head: `font-family:Georgia,"Times New Roman",serif;font-weight:600;letter-spacing:-.005em;color:#1a1a1a`,
      rules: [
        [".pgp-card", "border-radius:14px;border:1px solid #ece6dd;background:#fbf8f4"],
        [".pgp-tcard", "border-radius:14px;border:1px solid #ece6dd;background:#fbf8f4"],
        [".pgp-btn", "border-radius:999px;text-transform:none;letter-spacing:0"],
        [".pgp-btn-primary", "background:#7a5c3e;color:#fff"],
        [".pgp-btn-primary:hover", "background:#634a31"],
        [".pgp-eyebrow", "color:#7a5c3e;text-transform:uppercase"],
        [".pgp-faq details", "border-radius:14px"],
      ],
    },
    {
      id: "craft",
      label: "Craft",
      description: "Bold, high-contrast Shopify theme — heavy headings, tight corners, vivid CTA.",
      head: `font-family:"Assistant","Helvetica Neue",Helvetica,Arial,sans-serif;font-weight:800;letter-spacing:-.02em;color:#0a0a0a`,
      rules: [
        [".pgp-card", "border-radius:2px;border:1.5px solid #0a0a0a"],
        [".pgp-tcard", "border-radius:2px;border:1.5px solid #0a0a0a"],
        [".pgp-btn", "border-radius:2px;text-transform:uppercase;letter-spacing:.08em;font-weight:700"],
        [".pgp-btn-primary", "background:#0a0a0a;color:#fff"],
        [".pgp-btn-outline", "border:1.5px solid #0a0a0a;color:#0a0a0a"],
        [".pgp-faq details", "border-radius:2px;border:1.5px solid #0a0a0a"],
      ],
    },
  ],
  wordpress: [
    { id: "twentytwentyfour", label: "Twenty Twenty-Four", description: "WordPress core block theme — clean, neutral, minimal borders, square dark buttons." },
    {
      id: "astra",
      label: "Astra",
      description: "Astra block theme — friendly blue accent, rounded cards and buttons.",
      rules: [
        [".pgp-card", "border-radius:10px;border:1px solid #e2e8f0"],
        [".pgp-tcard", "border-radius:10px;border:1px solid #e2e8f0"],
        [".pgp-btn", "border-radius:8px"],
        [".pgp-btn-primary", "background:#2563eb;color:#fff"],
        [".pgp-btn-primary:hover", "background:#1d4ed8"],
        [".pgp-btn-outline", "border:1px solid #2563eb;color:#2563eb"],
        [".pgp-eyebrow", "color:#2563eb"],
        [".pgp-section-head h2", "color:#0f172a;-webkit-text-fill-color:#0f172a"],
      ],
    },
    {
      id: "kadence",
      label: "Kadence",
      description: "Kadence block theme — bolder headings, teal brand accent, lifted cards.",
      head: `font-family:"Helvetica Neue",-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:-.02em;font-weight:800;color:#1a202c`,
      rules: [
        [".pgp-card", "border-radius:12px;border:1px solid #e6eef0;box-shadow:0 6px 18px rgba(0,0,0,.05)"],
        [".pgp-tcard", "border-radius:12px;border:1px solid #e6eef0"],
        [".pgp-btn", "border-radius:8px;font-weight:700"],
        [".pgp-btn-primary", "background:#0c8a8a;color:#fff"],
        [".pgp-btn-primary:hover", "background:#0a7373"],
        [".pgp-btn-outline", "border:1px solid #0c8a8a;color:#0c8a8a"],
        [".pgp-eyebrow", "color:#0c8a8a"],
      ],
    },
  ],
  prestashop: [
    { id: "classic", label: "Classic", description: "PrestaShop Classic theme — Bootstrap cards, #2fb5d2 brand blue, soft shadows." },
    {
      id: "hummingbird",
      label: "Hummingbird",
      description: "Modern flat PrestaShop theme — minimal borders, dark CTAs, tight radius.",
      rules: [
        [".pgp-card", "border-radius:6px;box-shadow:none;border:1px solid #eaeaea"],
        [".pgp-tcard", "border-radius:6px;box-shadow:none;border:1px solid #eaeaea"],
        [".pgp-btn", "border-radius:6px"],
        [".pgp-btn-primary", "background:#212121;color:#fff"],
        [".pgp-btn-primary:hover", "background:#000"],
        [".pgp-btn-outline", "border:1px solid #212121;color:#212121"],
        [".pgp-eyebrow", "color:#212121"],
        [".pgp-card .pgp-icon", "background:#f2f2f2;border:1px solid #eaeaea;color:#212121"],
      ],
    },
    {
      id: "warehouse",
      label: "Warehouse",
      description: "Bold commerce PrestaShop theme — orange accent, strong headings, larger radius.",
      head: `font-family:Roboto,"Open Sans",Helvetica,Arial,sans-serif;font-weight:800;color:#1f2933`,
      rules: [
        [".pgp-card", "border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.07)"],
        [".pgp-btn", "border-radius:8px;font-weight:700"],
        [".pgp-btn-primary", "background:#f5821f;color:#fff"],
        [".pgp-btn-primary:hover", "background:#dd6f10"],
        [".pgp-btn-outline", "border:1px solid #f5821f;color:#f5821f"],
        [".pgp-eyebrow", "color:#f5821f"],
        [".pgp-card .pgp-icon", "background:#fff3e8;border:1px solid #ffe0c2;color:#f5821f"],
      ],
    },
  ],
};

/** First variant is the platform default. */
export const defaultSkinVariant = (platform: TemplatePlatform): string =>
  platform === "generic" ? "" : PLATFORM_SKIN_VARIANTS[platform][0].id;

const resolveVariant = (
  platform: Exclude<TemplatePlatform, "generic">,
  variantId?: string,
): SkinVariant => {
  const list = PLATFORM_SKIN_VARIANTS[platform];
  return list.find((v) => v.id === variantId) ?? list[0];
};

const platformSkin = (
  platform: Exclude<TemplatePlatform, "generic">,
  variantId?: string,
): string => {
  const root = `.pgp-skin-${platform}`;
  const base = `${root} .pgp-page`;
  const cfg = SKIN_RULES[platform];
  const variant = resolveVariant(platform, variantId);
  // Prefix every comma-separated selector part so specificity stays high (>=0,3,0).
  const prefix = (suffix: string) =>
    suffix.split(",").map((s) => `${base} ${s.trim()}`).join(",");
  const mergedRules: SkinRule[] = [...cfg.rules, ...(variant.rules ?? [])];
  const lines = [
    `${base}{${variant.font ?? cfg.font}}`,
    `${base} h1,${base} h2,${base} h3,${base} h4{${variant.head ?? cfg.head}}`,
    ...mergedRules.map(([suffix, decls]) => `${prefix(suffix)}{${decls}}`),
  ];
  return `<style data-platform="${platform}" data-skin-variant="${variant.id}">\n${lines.join("\n")}\n</style>`;
};

// Wrap a generic template body so it renders + publishes as native CMS content.
// The skin is appended AFTER the body so it also wins on source order, on top of
// its higher specificity.
const applyPlatformTheme = (
  content: string,
  platform: TemplatePlatform,
  variantId?: string,
): string => {
  if (platform === "generic") return content;
  const wrapper = PLATFORM_WRAPPER_CLASS[platform];
  const variant = resolveVariant(platform, variantId);
  return `<div class="${wrapper} pgp-skin-${platform}" data-skin-variant="${variant.id}">
${content}
${platformSkin(platform, variant.id)}
</div>`;
};

// Re-skin already-themed (or generic) content with a different platform variant.
// Idempotent: strips any prior platform <style> block + wrapper, then re-applies.
// Used by the per-template skin picker before generating pages.
export const reskinContent = (
  content: string,
  platform: TemplatePlatform,
  variantId?: string,
): string => {
  if (platform === "generic") return content;
  let inner = content;
  // Unwrap an existing platform wrapper div (outermost only).
  const wrapMatch = inner.match(
    /^\s*<div class="[^"]*\bpgp-skin-(?:wordpress|shopify|prestashop)\b[^"]*"[^>]*>\n?([\s\S]*)\n?<\/div>\s*$/,
  );
  if (wrapMatch) inner = wrapMatch[1];
  // Strip any previously injected platform skin style blocks.
  inner = inner.replace(/<style data-platform="[^"]*"[\s\S]*?<\/style>\s*/g, "").trim();
  return applyPlatformTheme(inner, platform, variantId);
};

// ── Dentexa-style dentist template ──────────────────────────────────────────
// A bespoke, self-contained dental landing page modelled closely on the Dentexa
// HTML theme (teal + dark-navy palette, "Care for Your Smile" hero, service
// cards, pricing, doctor, reviews, FAQ, contact). Every image is a REAL dental
// stock photo (curated Unsplash IDs) so nothing looks generic / AI-made.
// Exact dental imagery taken from the Dentexa reference theme, hosted on the
// Lovable CDN so the marketplace template matches the reference 1:1.
const DXA_IMG = {
  hero: "/__l5e/assets-v1/270e4b3f-5439-4444-bf4f-e80d0f1a8e20/slides_slide-v1-1.jpg",
  about: "/__l5e/assets-v1/4c053dd9-6491-48cd-a8e2-17345a9e40c9/about_about-v1-img.jpg",
  doctor: "/__l5e/assets-v1/5b68b437-5e47-4b17-a90b-677011c026b8/resources_form-style1__image.jpg",
  cta: "/__l5e/assets-v1/3a31b308-e1c6-485b-822c-a87180a4360f/parallax-background_slogan-bg.jpg",
  g1: "/__l5e/assets-v1/de8d0ebe-5324-47f1-bfda-a75032e684c5/services_service-v1-1.jpg",
  g2: "/__l5e/assets-v1/f8130d5d-ffc2-40de-a79e-e1cd77f96e7d/services_service-v1-2.jpg",
  g3: "/__l5e/assets-v1/eacc371b-19d8-4c55-9409-32b54b466cd3/services_service-v1-3.jpg",
  g4: "/__l5e/assets-v1/e7a13dea-16a9-458a-97ad-619ea1261758/resources_before-1.jpg",
  g5: "/__l5e/assets-v1/3e7c6a66-c7c5-4ea2-b666-56a62d69e5ee/resources_after-1.jpg",
  g6: "/__l5e/assets-v1/ca994f31-732d-482a-b39a-451630f5a271/slides_slide-v1-2.jpg",
  review: "/__l5e/assets-v1/0aa309e0-d643-4005-ab21-2d44da174249/testimonial_testimonial-v1-1.jpg",
};

const dentexaTemplate = () => `<style>
.dxa{--teal:#13b5b5;--teal-d:#0e9a9a;--navy:#16404a;--ink:#274247;--muted:#5d7378;--bg:#f1fafa;--line:rgba(19,181,181,.16);font-family:'Poppins','Segoe UI',system-ui,sans-serif;color:var(--ink);line-height:1.7;max-width:100%;position:relative;background:#fff}
.dxa :where(*){box-sizing:border-box}
.dxa h1,.dxa h2,.dxa h3,.dxa h4{font-family:'Playfair Display',Georgia,serif;color:var(--navy);margin:0;line-height:1.12;letter-spacing:-.01em}
.dxa p{margin:0}
.dxa a{text-decoration:none;color:inherit}
.dxa-wrap{max-width:1180px;margin:0 auto;padding:0 1.25rem}
.dxa-sec{padding:clamp(3.5rem,7vw,6rem) 0;position:relative}
.dxa-eyebrow{display:inline-flex;align-items:center;gap:.5rem;color:var(--teal-d);font-weight:600;font-size:.95rem;letter-spacing:.04em;font-family:'Poppins',sans-serif;margin-bottom:.9rem}
.dxa-eyebrow::before{content:'';width:26px;height:2px;background:var(--teal)}
.dxa-h{font-size:clamp(1.9rem,4vw,3rem);font-weight:700}
.dxa-lead{color:var(--muted);font-size:1.03rem;max-width:560px}
.dxa-btn{display:inline-flex;align-items:center;gap:.55rem;background:var(--teal);color:#fff;padding:1rem 2.2rem;border-radius:6px;font-family:'Poppins',sans-serif;font-weight:600;font-size:.95rem;transition:background .25s,transform .25s,box-shadow .25s;box-shadow:0 12px 26px rgba(19,181,181,.28);border:none;cursor:pointer}
.dxa-btn:hover{background:var(--navy);transform:translateY(-3px);box-shadow:0 16px 34px rgba(22,64,74,.3)}
.dxa-btn-out{background:transparent;color:var(--navy);border:2px solid var(--line);box-shadow:none}
.dxa-btn-out:hover{background:var(--navy);color:#fff;border-color:var(--navy)}
/* top bar */
.dxa-top{background:var(--navy);color:rgba(255,255,255,.85);font-family:'Poppins',sans-serif;font-size:.85rem}
.dxa-top .dxa-wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.5rem 2rem;padding-top:.7rem;padding-bottom:.7rem}
.dxa-top .dxa-ti{display:inline-flex;align-items:center;gap:.5rem}
.dxa-top b{color:var(--teal)}
/* hero */
.dxa-hero{background:var(--bg);overflow:hidden;position:relative}
.dxa-hero .dxa-wrap{display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:2.5rem;padding-top:clamp(3rem,6vw,5rem);padding-bottom:clamp(3rem,6vw,5rem)}
.dxa-hero h1{font-size:clamp(2.4rem,5.2vw,4rem);font-weight:800}
.dxa-hero h1 .hl{color:var(--teal)}
.dxa-hero p{margin:1.25rem 0 1.5rem;max-width:480px}
.dxa-checks{display:flex;flex-wrap:wrap;gap:.75rem 1.75rem;margin-bottom:2rem;font-family:'Poppins',sans-serif;font-weight:600;color:var(--navy)}
.dxa-checks span{display:inline-flex;align-items:center;gap:.55rem}
.dxa-checks span::before{content:'✓';display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--teal);color:#fff;font-size:.75rem}
.dxa-hero-media{position:relative}
.dxa-hero-media img{width:100%;aspect-ratio:11/12;object-fit:cover;border-radius:240px 240px 18px 18px;box-shadow:0 30px 70px rgba(22,64,74,.22)}
.dxa-hero-badge{position:absolute;left:-12px;bottom:30px;background:#fff;border-radius:14px;padding:1rem 1.25rem;box-shadow:0 18px 40px rgba(22,64,74,.18);display:flex;align-items:center;gap:.8rem}
.dxa-hero-badge .n{font-family:'Playfair Display',serif;font-size:1.6rem;font-weight:700;color:var(--teal)}
.dxa-hero-badge small{display:block;color:var(--muted);font-family:'Poppins',sans-serif;font-size:.78rem}
/* features strip */
.dxa-feat{display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem;margin-top:-3.5rem;position:relative;z-index:3}
.dxa-feat .c{background:#fff;border:1px solid var(--line);border-radius:14px;padding:1.6rem 1.4rem;box-shadow:0 16px 40px rgba(22,64,74,.08);transition:transform .3s,box-shadow .3s}
.dxa-feat .c:hover{transform:translateY(-6px);box-shadow:0 24px 50px rgba(19,181,181,.18)}
.dxa-feat .ic{width:54px;height:54px;border-radius:14px;background:rgba(19,181,181,.12);color:var(--teal-d);display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1rem}
.dxa-feat h3{font-size:1.1rem;font-family:'Poppins',sans-serif;font-weight:700;color:var(--navy);margin-bottom:.4rem}
.dxa-feat p{color:var(--muted);font-size:.9rem}
/* split */
.dxa-split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,4vw,3.5rem);align-items:center}
.dxa-split-media img{width:100%;border-radius:18px;aspect-ratio:5/4;object-fit:cover;box-shadow:0 26px 60px rgba(22,64,74,.18)}
.dxa-mini{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.75rem}
.dxa-mini .m{display:flex;gap:.8rem;align-items:flex-start}
.dxa-mini .mi{width:42px;height:42px;flex:none;border-radius:10px;background:rgba(19,181,181,.12);color:var(--teal-d);display:flex;align-items:center;justify-content:center;font-size:1.2rem}
.dxa-mini b{display:block;color:var(--navy);font-family:'Poppins',sans-serif;font-size:.96rem}
.dxa-mini small{color:var(--muted);font-size:.83rem}
/* services */
.dxa-services{background:var(--bg)}
.dxa-head{text-align:center;max-width:640px;margin:0 auto 3rem}
.dxa-head .dxa-eyebrow{justify-content:center}
.dxa-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.dxa-svc{background:#fff;border-radius:16px;padding:2rem;border:1px solid var(--line);transition:transform .3s,box-shadow .3s;position:relative;overflow:hidden}
.dxa-svc::after{content:'';position:absolute;left:0;bottom:0;height:4px;width:0;background:var(--teal);transition:width .35s}
.dxa-svc:hover{transform:translateY(-6px);box-shadow:0 24px 50px rgba(22,64,74,.12)}
.dxa-svc:hover::after{width:100%}
.dxa-svc .ic{width:64px;height:64px;border-radius:18px;background:var(--navy);color:var(--teal);display:flex;align-items:center;justify-content:center;font-size:1.7rem;margin-bottom:1.2rem;transition:background .3s,color .3s}
.dxa-svc:hover .ic{background:var(--teal);color:#fff}
.dxa-svc h3{font-size:1.25rem;font-family:'Poppins',sans-serif;font-weight:700;color:var(--navy);margin-bottom:.55rem}
.dxa-svc p{color:var(--muted);font-size:.95rem}
/* pricing */
.dxa-grid3.price .dxa-svc{text-align:left}
.dxa-pr{font-family:'Playfair Display',serif;font-size:2.4rem;font-weight:700;color:var(--teal-d);margin:.4rem 0 .2rem}
.dxa-pr small{font-family:'Poppins',sans-serif;font-size:.85rem;color:var(--muted);font-weight:500}
/* gallery */
.dxa-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.dxa-gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px;transition:transform .4s,box-shadow .4s}
.dxa-gal img:hover{transform:scale(1.04);box-shadow:0 18px 40px rgba(19,181,181,.25)}
/* doctor */
.dxa-doc{background:var(--navy);color:rgba(255,255,255,.85)}
.dxa-doc h2,.dxa-doc .dxa-mini b{color:#fff}
.dxa-doc .dxa-eyebrow{color:var(--teal)}
.dxa-doc-media img{width:100%;border-radius:18px;aspect-ratio:1;object-fit:cover;box-shadow:0 26px 60px rgba(0,0,0,.35)}
.dxa-doc .dxa-mini small{color:rgba(255,255,255,.6)}
.dxa-doc .dxa-mini .mi{background:rgba(19,181,181,.2);color:var(--teal)}
/* reviews */
.dxa-revs{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.dxa-rev{background:#fff;border:1px solid var(--line);border-radius:16px;padding:2rem;box-shadow:0 14px 36px rgba(22,64,74,.06)}
.dxa-rev .st{color:#f5b301;letter-spacing:2px;margin-bottom:.9rem}
.dxa-rev p{color:var(--ink);font-style:italic;line-height:1.75}
.dxa-rev footer{display:flex;align-items:center;gap:.8rem;margin-top:1.4rem;padding-top:1.2rem;border-top:1px solid var(--line)}
.dxa-rev footer img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.dxa-rev footer b{display:block;color:var(--navy);font-family:'Poppins',sans-serif}
.dxa-rev footer small{color:var(--muted)}
/* faq */
.dxa-faq{max-width:780px;margin:0 auto}
.dxa-faq details{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:.85rem;padding:1.1rem 1.4rem;transition:box-shadow .3s}
.dxa-faq details[open]{box-shadow:0 14px 34px rgba(19,181,181,.12);border-color:var(--teal)}
.dxa-faq summary{font-family:'Poppins',sans-serif;font-weight:600;color:var(--navy);cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:1rem}
.dxa-faq summary::after{content:'+';color:var(--teal);font-size:1.4rem;line-height:1}
.dxa-faq details[open] summary::after{content:'–'}
.dxa-faq p{margin-top:.9rem;color:var(--muted)}
/* cta band */
.dxa-cta{position:relative;border-radius:0;overflow:hidden;text-align:center;background-size:cover;background-position:center}
.dxa-cta::before{content:'';position:absolute;inset:0;background:linear-gradient(120deg,rgba(22,64,74,.92),rgba(14,154,154,.82))}
.dxa-cta .dxa-wrap{position:relative;z-index:2;padding:clamp(3.5rem,7vw,5.5rem) 1.25rem;color:#fff}
.dxa-cta h2{color:#fff;font-size:clamp(1.8rem,3.6vw,2.8rem)}
.dxa-cta p{color:rgba(255,255,255,.9);max-width:560px;margin:1rem auto 1.8rem}
.dxa-cta .dxa-btn{background:#fff;color:var(--navy)}
.dxa-cta .dxa-btn:hover{background:var(--teal);color:#fff}
/* contact */
.dxa-contact{display:grid;grid-template-columns:.9fr 1.1fr;gap:2.5rem;align-items:start}
.dxa-info{display:flex;flex-direction:column;gap:.4rem}
.dxa-irow{display:flex;align-items:center;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--line)}
.dxa-irow .ic{width:48px;height:48px;flex:none;border-radius:12px;background:rgba(19,181,181,.12);color:var(--teal-d);display:flex;align-items:center;justify-content:center;font-size:1.2rem}
.dxa-irow small{display:block;color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}
.dxa-irow b{color:var(--navy);font-family:'Poppins',sans-serif;font-weight:600}
.dxa-form{background:#fff;border:1px solid var(--line);border-radius:18px;padding:2rem;box-shadow:0 18px 44px rgba(22,64,74,.08)}
.dxa-form label{display:block;font-family:'Poppins',sans-serif;font-size:.85rem;font-weight:600;color:var(--navy);margin-bottom:.4rem}
.dxa-fg{margin-bottom:1.1rem}
.dxa-form input,.dxa-form textarea{width:100%;padding:.9rem 1.05rem;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--bg);color:var(--ink)}
.dxa-form input:focus,.dxa-form textarea:focus{outline:none;border-color:var(--teal);background:#fff}
@media(max-width:900px){.dxa-hero .dxa-wrap,.dxa-split,.dxa-contact,.dxa-doc .dxa-split{grid-template-columns:1fr}.dxa-feat{grid-template-columns:repeat(2,1fr);margin-top:2rem}.dxa-grid3,.dxa-revs,.dxa-gal{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.dxa-feat,.dxa-grid3,.dxa-revs,.dxa-gal,.dxa-mini{grid-template-columns:1fr}}
</style>
<div class="dxa">

  <header class="dxa-hero"><div class="dxa-wrap">
    <div>
      <span class="dxa-eyebrow">Care for Your Smile</span>
      <h1>Quality <span class="hl">Dental</span> Experience in {city}</h1>
      <p>{clinic_description} Gentle, modern dentistry for the whole family in {city}, {state} — with same-day appointments and a calm, anxiety-free experience.</p>
      <div class="dxa-checks"><span>Dental Surgery</span><span>Dental Implants</span><span>Cosmetic Care</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:1rem">
        <a href="#contact" class="dxa-btn">📅 Book An Appointment</a>
        <a href="#services" class="dxa-btn dxa-btn-out">Explore Services</a>
      </div>
    </div>
    <div class="dxa-hero-media">
      <img src="${DXA_IMG.hero}" alt="Dentist treating a patient at {clinic_name}"/>
      <div class="dxa-hero-badge"><span class="n">{years_experience}+</span><div><b style="font-family:'Poppins',sans-serif;color:#16404a">Years</b><small>of trusted dental care</small></div></div>
    </div>
  </div></header>

  <div class="dxa-wrap">
    <div class="dxa-feat">
      <div class="c"><div class="ic">🦷</div><h3>Modern Equipment</h3><p>Digital X-rays & latest dental technology for precise, comfortable care.</p></div>
      <div class="c"><div class="ic">👩‍⚕️</div><h3>Expert Dentists</h3><p>Caring, highly-trained specialists for every member of your family.</p></div>
      <div class="c"><div class="ic">⏰</div><h3>Same-Day Care</h3><p>Emergency slots reserved daily so you're never left in pain.</p></div>
      <div class="c"><div class="ic">💳</div><h3>Easy Payments</h3><p>Transparent pricing and flexible plans — most insurance accepted.</p></div>
    </div>
  </div>

  <section class="dxa-sec"><div class="dxa-wrap"><div class="dxa-split">
    <div class="dxa-split-media"><img src="${DXA_IMG.about}" alt="Modern dental clinic interior"/></div>
    <div>
      <span class="dxa-eyebrow">About {clinic_name}</span>
      <h2 class="dxa-h">Trusted dental care center for your family</h2>
      <p class="dxa-lead" style="margin-top:1rem">We combine the latest digital technology with a warm, judgment-free approach — so every visit feels calm, clear and completely in your control. Serving {city} and {nearby_areas}.</p>
      <div class="dxa-mini">
        <div class="m"><div class="mi">😁</div><div><b>Gentle Treatment</b><small>Pain-free, relaxing visits</small></div></div>
        <div class="m"><div class="mi">🏆</div><div><b>{patients_count}+ Patients</b><small>Smiles transformed</small></div></div>
        <div class="m"><div class="mi">🦷</div><div><b>Full-Service Clinic</b><small>Everything under one roof</small></div></div>
        <div class="m"><div class="mi">🤝</div><div><b>Personal Care</b><small>Treatment built around you</small></div></div>
      </div>
    </div>
  </div></div></section>

  <section class="dxa-sec dxa-services" id="services"><div class="dxa-wrap">
    <div class="dxa-head"><span class="dxa-eyebrow">Our Services</span><h2 class="dxa-h">Complete dental care in {city}</h2><p class="dxa-lead" style="margin:1rem auto 0">From routine check-ups to full smile makeovers — everything your family needs under one roof.</p></div>
    <div class="dxa-grid3">
      <div class="dxa-svc"><div class="ic">🪥</div><h3>General & Preventive</h3><p>Cleanings, exams, fluoride and sealants to keep every smile healthy for life.</p></div>
      <div class="dxa-svc"><div class="ic">✨</div><h3>Cosmetic Dentistry</h3><p>Teeth whitening, veneers and bonding for a confident, camera-ready smile.</p></div>
      <div class="dxa-svc"><div class="ic">🦷</div><h3>Implants & Restorative</h3><p>Crowns, bridges and dental implants that look, feel and function naturally.</p></div>
      <div class="dxa-svc"><div class="ic">😬</div><h3>Clear Aligners</h3><p>Invisible, removable aligners to straighten teeth discreetly at any age.</p></div>
      <div class="dxa-svc"><div class="ic">🧒</div><h3>Family & Kids</h3><p>Friendly care that makes children actually look forward to the dentist.</p></div>
      <div class="dxa-svc"><div class="ic">🚨</div><h3>Emergency Care</h3><p>In pain? We reserve same-day slots for dental emergencies across {city}.</p></div>
    </div>
  </div></section>

  <section class="dxa-sec"><div class="dxa-wrap">
    <div class="dxa-head"><span class="dxa-eyebrow">Smile Gallery</span><h2 class="dxa-h">Real results from our {city} studio</h2></div>
    <div class="dxa-gal">
      <img src="${DXA_IMG.g1}" alt="Patient dental checkup"/>
      <img src="${DXA_IMG.g2}" alt="Bright healthy smile"/>
      <img src="${DXA_IMG.g3}" alt="Dental treatment in progress"/>
      <img src="${DXA_IMG.g4}" alt="Dental hygiene cleaning"/>
      <img src="${DXA_IMG.g5}" alt="Happy patient smile"/>
      <img src="${DXA_IMG.g6}" alt="Dentist with patient"/>
    </div>
  </div></section>

  <section class="dxa-sec dxa-doc"><div class="dxa-wrap"><div class="dxa-split">
    <div class="dxa-doc-media"><img src="${DXA_IMG.doctor}" alt="Dr. {doctor_name}, lead dentist"/></div>
    <div>
      <span class="dxa-eyebrow">Meet Your Dentist</span>
      <h2 class="dxa-h">Dr. {doctor_name}</h2>
      <p class="dxa-lead" style="margin-top:1rem;color:rgba(255,255,255,.78)">{doctor_bio}</p>
      <div class="dxa-mini">
        <div class="m"><div class="mi">🎓</div><div><b>{years_experience}+ Years</b><small>Clinical experience</small></div></div>
        <div class="m"><div class="mi">⭐</div><div><b>4.9 Rating</b><small>From {patients_count}+ patients</small></div></div>
      </div>
      <a href="#contact" class="dxa-btn" style="margin-top:1.8rem;background:var(--teal);color:#fff">📅 Book With Dr. {doctor_name}</a>
    </div>
  </div></div></section>

  <section class="dxa-sec dxa-services"><div class="dxa-wrap">
    <div class="dxa-head"><span class="dxa-eyebrow">Simple Pricing</span><h2 class="dxa-h">Honest care, no surprises</h2><p class="dxa-lead" style="margin:1rem auto 0">Transparent fees and flexible payment plans — we accept most major insurance.</p></div>
    <div class="dxa-grid3 price">
      <div class="dxa-svc"><div class="ic">🧼</div><h3>New Patient Exam</h3><div class="dxa-pr">{price_checkup}</div><p>Comprehensive exam, digital X-rays and a professional cleaning.</p></div>
      <div class="dxa-svc"><div class="ic">💎</div><h3>Teeth Whitening</h3><div class="dxa-pr">{price_whitening}</div><p>Professional in-chair whitening for a noticeably brighter smile.</p></div>
      <div class="dxa-svc"><div class="ic">📐</div><h3>Clear Aligners</h3><div class="dxa-pr">{price_aligners}</div><p>Custom aligner treatment plans with flexible financing available.</p></div>
    </div>
  </div></section>

  <section class="dxa-sec"><div class="dxa-wrap">
    <div class="dxa-head"><span class="dxa-eyebrow">Patient Reviews</span><h2 class="dxa-h">Loved by smiles across {city}</h2></div>
    <div class="dxa-revs">
      <div class="dxa-rev"><div class="st">★★★★★</div><p>"Honestly the most relaxed I've ever felt at a dentist. Gentle, friendly and totally painless."</p><footer><img src="${DXA_IMG.review}" alt=""/><div><b>Sarah Mitchell</b><small>Verified patient</small></div></footer></div>
      <div class="dxa-rev"><div class="st">★★★★★</div><p>"My whitening results were incredible and the pricing was exactly what they quoted. Highly recommend {clinic_name}."</p><footer><img src="${DXA_IMG.review}" alt=""/><div><b>James Carter</b><small>Verified patient</small></div></footer></div>
      <div class="dxa-rev"><div class="st">★★★★★</div><p>"Dr. {doctor_name} is wonderful with my kids. They actually ask when our next visit is!"</p><footer><img src="${DXA_IMG.review}" alt=""/><div><b>Aisha Rahman</b><small>Verified patient</small></div></footer></div>
    </div>
  </div></section>

  <section class="dxa-sec dxa-services"><div class="dxa-wrap">
    <div class="dxa-head"><span class="dxa-eyebrow">FAQ</span><h2 class="dxa-h">Frequently asked questions</h2></div>
    <div class="dxa-faq">
      <details open><summary>Do you accept my insurance?</summary><p>We accept most major dental insurance plans and offer flexible financing. Call {phone} and we'll verify your coverage in minutes.</p></details>
      <details><summary>Are you taking new patients?</summary><p>Yes! {clinic_name} is welcoming new patients of all ages across {city} and {nearby_areas}. Book online or call {phone}.</p></details>
      <details><summary>I'm nervous about the dentist — can you help?</summary><p>Absolutely. Our team specialises in anxiety-free care with gentle techniques and sedation options for a calm, comfortable visit.</p></details>
      <details><summary>Do you offer emergency appointments?</summary><p>Yes — we hold same-day slots for dental emergencies. If you're in pain, call {phone} right away.</p></details>
    </div>
  </div></section>

  <section class="dxa-cta" style="background-image:url('${DXA_IMG.cta}')"><div class="dxa-wrap">
    <h2>Ready to love your smile again?</h2>
    <p>Book your appointment at {clinic_name} in {city} today — new patients are always welcome.</p>
    <a href="#contact" class="dxa-btn">📅 Book Your Visit</a>
  </div></section>

  <section class="dxa-sec" id="contact"><div class="dxa-wrap">
    <div class="dxa-head"><span class="dxa-eyebrow">Contact</span><h2 class="dxa-h">Get in touch with {clinic_name}</h2></div>
    <div class="dxa-contact">
      <div class="dxa-info">
        <div class="dxa-irow"><div class="ic">📞</div><div><small>Phone</small><b>{phone}</b></div></div>
        <div class="dxa-irow"><div class="ic">📍</div><div><small>Address</small><b>{address}</b></div></div>
        <div class="dxa-irow"><div class="ic">🕐</div><div><small>Hours</small><b>Mon–Fri 9am–6pm · Sat 9am–1pm</b></div></div>
        <div class="dxa-irow"><div class="ic">✉️</div><div><small>Email</small><b>{email}</b></div></div>
      </div>
      <div class="dxa-form">
        <div class="dxa-fg"><label>Name</label><input type="text" placeholder="Your name"/></div>
        <div class="dxa-fg"><label>Email</label><input type="email" placeholder="you@email.com"/></div>
        <div class="dxa-fg"><label>Message</label><textarea rows="4" placeholder="How can we help your smile?"></textarea></div>
        <button class="dxa-btn" style="width:100%;justify-content:center">Send Message</button>
      </div>
    </div>
  </div></section>
</div>`;

// ── Consulting template (modelled 1:1 on consulting.framer.media) ────────────
const CON_IMG = {
  hero: "https://framerusercontent.com/images/7MARqQztqNevdDLwevn1REQ1Suk.jpg?width=1600&height=1067",
  svc1: "https://framerusercontent.com/images/Ks478GmT2s9Ewl2BhCGGJWDqdKo.jpg?width=1200&height=800",
  svc2: "https://framerusercontent.com/images/wnUzv0z9hQsQucujSeLpZ5hwOY.jpg?width=1200&height=800",
  svc3: "https://framerusercontent.com/images/zTN763RqqgJAjH4qtwjuKBx3jt8.jpg?width=1200&height=800",
  meeting: "https://framerusercontent.com/images/ImUfonalQMOKWjsL2OcxwGINE.jpg?width=1200&height=800",
  approach: "https://framerusercontent.com/images/5HKlRNWxRP9pKorHGF6OWxCVdmM.jpg?width=1200&height=675",
  growth: "https://framerusercontent.com/images/umz1vAsNQy3hz5TGm8mgalWPqq4.jpg?width=1200&height=800",
  t1: "https://framerusercontent.com/images/vHMSEWw5B42ZyOnn7b3crhvXwSY.jpg?width=200&height=200",
  t2: "https://framerusercontent.com/images/vZW3QExeafY8ogiiWnlsg3Z00.jpg?width=200&height=200",
  t3: "https://framerusercontent.com/images/6YEx3JiYIJRZsLw9TyBaZ8jK1kM.jpg?width=200&height=200",
};

const consultingTemplate = () => `<style>
.con{--blue:#2563eb;--blue-d:#1d4ed8;--ink:#0b1220;--body:#3f4754;--muted:#6b7280;--bg:#f6f7f9;--line:#e6e8ec;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--body);line-height:1.7;background:#fff;max-width:100%;position:relative}
.con :where(*){box-sizing:border-box}
.con h1,.con h2,.con h3,.con h4{color:var(--ink);margin:0;line-height:1.1;letter-spacing:-.02em;font-weight:600}
.con p{margin:0}
.con a{text-decoration:none;color:inherit}
.con-wrap{max-width:1180px;margin:0 auto;padding:0 1.5rem}
.con-sec{padding:clamp(3.5rem,7vw,6rem) 0}
.con-eyebrow{display:inline-block;color:var(--blue);font-weight:600;font-size:.92rem;letter-spacing:.02em;margin-bottom:.85rem}
.con-h{font-size:clamp(1.9rem,4vw,3rem)}
.con-lead{color:var(--muted);font-size:1.05rem;max-width:600px}
.con-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--blue);color:#fff;padding:.95rem 1.7rem;border-radius:999px;font-weight:600;font-size:.95rem;transition:background .25s,transform .25s;border:none;cursor:pointer}
.con-btn:hover{background:var(--blue-d);transform:translateY(-2px)}
.con-btn-ghost{background:rgba(255,255,255,.12);color:#fff;backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.35)}
.con-btn-ghost:hover{background:rgba(255,255,255,.22)}
/* nav */
.con-nav{position:absolute;top:1.25rem;left:0;right:0;z-index:5}
.con-nav .bar{max-width:1120px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;background:rgba(20,22,28,.55);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:.7rem 1.4rem;color:#fff}
.con-nav .logo{display:flex;align-items:center;gap:.5rem;font-weight:700;color:#fff}
.con-nav .logo .dot{width:18px;height:18px;border-radius:5px;background:var(--blue)}
.con-nav .links{display:flex;gap:1.6rem;font-size:.92rem;color:rgba(255,255,255,.85)}
.con-nav .links a:hover{color:#fff}
.con-nav .pill{background:#fff;color:var(--ink);padding:.55rem 1.3rem;border-radius:999px;font-weight:600;font-size:.9rem}
/* hero */
.con-hero{position:relative;min-height:92vh;display:flex;align-items:center;background-size:cover;background-position:center;color:#fff;overflow:hidden}
.con-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,11,18,.78) 0%,rgba(8,11,18,.45) 55%,rgba(8,11,18,.2) 100%)}
.con-hero .con-wrap{position:relative;z-index:2;padding-top:8rem;padding-bottom:4rem}
.con-hero h1{color:#fff;font-size:clamp(2.6rem,6vw,5rem);font-weight:600;max-width:14ch}
.con-hero p{color:rgba(255,255,255,.88);font-size:1.15rem;max-width:540px;margin:1.4rem 0 2rem}
.con-hero .cta{display:flex;flex-wrap:wrap;gap:.9rem}
/* logos */
.con-logos{border-bottom:1px solid var(--line)}
.con-logos .con-wrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2.5rem 3.5rem;padding-top:2.5rem;padding-bottom:2.5rem}
.con-logos img{height:30px;width:auto;opacity:.55;filter:grayscale(1)}
/* head */
.con-head{max-width:680px;margin:0 auto 3rem;text-align:center}
.con-head .con-eyebrow{display:block}
/* services */
.con-svc{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.con-card{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:transform .3s,box-shadow .3s}
.con-card:hover{transform:translateY(-6px);box-shadow:0 26px 60px rgba(11,18,32,.12)}
.con-card img{width:100%;aspect-ratio:3/2;object-fit:cover}
.con-card .b{padding:1.4rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem}
.con-card .b h3{font-size:1.15rem}
.con-card .b .arr{width:36px;height:36px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--blue);flex:none}
/* split */
.con-split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4rem);align-items:center}
.con-split img{width:100%;border-radius:20px;aspect-ratio:4/3;object-fit:cover;box-shadow:0 26px 60px rgba(11,18,32,.14)}
.con-about-pic{position:relative}
.con-badge{position:absolute;left:-12px;bottom:-12px;background:var(--blue);color:#fff;border-radius:16px;padding:1rem 1.3rem;box-shadow:0 18px 40px rgba(37,99,235,.4);display:flex;flex-direction:column;line-height:1.1}
.con-badge b{font-size:1.7rem;font-weight:700}
.con-badge span{font-size:.78rem;opacity:.85}
.con-about-name{font-size:clamp(2rem,4.2vw,3rem);font-weight:700}
.con-about-rule{width:64px;height:4px;border-radius:4px;background:var(--blue);margin:1rem 0 .4rem}
.con-feat{display:flex;flex-direction:column;gap:1rem;margin-top:1.6rem}
.con-feat .f{display:flex;gap:.85rem;align-items:flex-start;font-weight:600;color:var(--ink)}
.con-feat .f::before{content:'✓';flex:none;width:24px;height:24px;border-radius:50%;background:rgba(37,99,235,.12);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:.8rem}
/* stats */
.con-stats{background:var(--ink);color:#fff;border-radius:24px;overflow:hidden}
.con-stats .inner{display:grid;grid-template-columns:1.2fr 1fr;gap:0}
.con-stats .pic{background-size:cover;background-position:center;min-height:320px}
.con-stats .nums{padding:clamp(2rem,4vw,3.5rem);display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-content:center}
.con-stats .nums h3{color:#fff;font-size:clamp(2.4rem,4vw,3.4rem);font-weight:600}
.con-stats .nums small{color:rgba(255,255,255,.7);font-size:.95rem}
/* process */
.con-proc{display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem}
.con-step{background:#fff;border:1px solid var(--line);border-radius:16px;padding:1.6rem 1.4rem;transition:transform .3s,box-shadow .3s}
.con-step:hover{transform:translateY(-5px);box-shadow:0 20px 46px rgba(11,18,32,.1)}
.con-step .n{font-size:1.6rem;font-weight:700;color:var(--blue);margin-bottom:.6rem}
.con-step h3{font-size:1.1rem;margin-bottom:.5rem}
.con-step p{color:var(--muted);font-size:.92rem}
/* testimonials */
.con-revs{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.con-rev{background:var(--bg);border:1px solid var(--line);border-radius:18px;padding:2rem}
.con-rev .st{color:#f5b301;letter-spacing:2px;margin-bottom:1rem}
.con-rev p{color:var(--ink);line-height:1.7}
.con-rev footer{display:flex;align-items:center;gap:.85rem;margin-top:1.6rem}
.con-rev footer img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.con-rev footer b{display:block;color:var(--ink)}
.con-rev footer small{color:var(--muted)}
/* cta */
.con-cta{position:relative;border-radius:24px;overflow:hidden;text-align:center;background-size:cover;background-position:center}
.con-cta::before{content:'';position:absolute;inset:0;background:linear-gradient(120deg,rgba(37,99,235,.92),rgba(11,18,32,.82))}
.con-cta .in{position:relative;z-index:2;padding:clamp(3rem,6vw,5rem) 1.5rem;color:#fff}
.con-cta h2{color:#fff;font-size:clamp(1.8rem,3.6vw,2.8rem)}
.con-cta p{color:rgba(255,255,255,.9);max-width:560px;margin:1rem auto 1.8rem}
.con-cta .con-btn{background:#fff;color:var(--ink)}
.con-cta .con-btn:hover{background:var(--bg)}
/* contact */
.con-contact{display:grid;grid-template-columns:.9fr 1.1fr;gap:2.5rem;align-items:start}
.con-irow{display:flex;align-items:center;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--line)}
.con-irow .ic{width:46px;height:46px;flex:none;border-radius:12px;background:rgba(37,99,235,.1);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:1.1rem}
.con-irow small{display:block;color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}
.con-irow b{color:var(--ink);font-weight:600}
.con-form{background:#fff;border:1px solid var(--line);border-radius:20px;padding:2rem;box-shadow:0 18px 44px rgba(11,18,32,.06)}
.con-fg{margin-bottom:1.1rem}
.con-form label{display:block;font-size:.85rem;font-weight:600;color:var(--ink);margin-bottom:.4rem}
.con-form input,.con-form textarea{width:100%;padding:.9rem 1.05rem;border:1px solid var(--line);border-radius:12px;font:inherit;background:var(--bg);color:var(--ink)}
.con-form input:focus,.con-form textarea:focus{outline:none;border-color:var(--blue);background:#fff}
@media(max-width:900px){.con-nav .links{display:none}.con-svc,.con-proc,.con-revs,.con-split,.con-contact,.con-stats .inner{grid-template-columns:1fr}.con-proc{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.con-proc,.con-stats .nums{grid-template-columns:1fr}}
</style>
<div class="con">

  <header class="con-hero" id="home" style="background-image:url('${CON_IMG.hero}')"><div class="con-wrap">
    <h1>{headline}</h1>
    <p>{subheadline}</p>
    <div class="cta">
      <a href="#contact" class="con-btn">{cta_text}</a>
      <a href="#services" class="con-btn con-btn-ghost">Our Services</a>
    </div>
  </div></header>

  <section class="con-logos"><div class="con-wrap">
    <img src="https://framerusercontent.com/images/u9M8UmTkdOTylINg9VFaom3OOyQ.png?width=292&height=72" alt="Client logo"/>
    <img src="https://framerusercontent.com/images/RR7w5BtK4jl3VxQCmwfd2ziOe8o.png?width=216&height=72" alt="Client logo"/>
    <img src="https://framerusercontent.com/images/xVwUn1pAAZzVoqlsp4BmZ9XZbI.png?width=220&height=72" alt="Client logo"/>
    <img src="https://framerusercontent.com/images/C74rJldf1AX4ml3glGIfUaSeSk.png?width=302&height=72" alt="Client logo"/>
    <img src="https://framerusercontent.com/images/tYYUVQNdDSm9oBSCAvxf1G8Voe8.png?width=272&height=72" alt="Client logo"/>
  </div></section>

  <section class="con-sec" id="services"><div class="con-wrap">
    <div class="con-head"><span class="con-eyebrow">Our services</span><h2 class="con-h">We offer a wide range of services</h2><p class="con-lead" style="margin:1rem auto 0">By combining our industry knowledge with cutting-edge tools and methodologies, we develop strategies that drive measurable results.</p></div>
    <div class="con-svc">
      <a class="con-card"><img src="${CON_IMG.svc1}" alt="{service_1_title}"/><div class="b"><h3>{service_1_title}</h3><div class="arr">→</div></div></a>
      <a class="con-card"><img src="${CON_IMG.svc2}" alt="{service_2_title}"/><div class="b"><h3>{service_2_title}</h3><div class="arr">→</div></div></a>
      <a class="con-card"><img src="${CON_IMG.svc3}" alt="{service_3_title}"/><div class="b"><h3>{service_3_title}</h3><div class="arr">→</div></div></a>
    </div>
    <div style="text-align:center;margin-top:2.5rem"><a href="#contact" class="con-btn">Request a personalized service</a></div>
  </div></section>

  <section class="con-sec" id="about" style="background:var(--bg)"><div class="con-wrap"><div class="con-split">
    <div class="con-about-pic">
      <img src="${CON_IMG.meeting}" alt="Business meeting at {company_name}"/>
      <div class="con-badge"><b>{years_experience}+</b><span>Years of expertise</span></div>
    </div>
    <div>
      <h2 class="con-about-name">{company_name}</h2>
      <div class="con-about-rule"></div>
      <span class="con-eyebrow" style="margin-top:.4rem">Our approach</span>
      <h3 class="con-h" style="font-size:clamp(1.5rem,3vw,2.1rem)">Innovative approach to consulting</h3>
      <p class="con-lead" style="margin-top:1rem">{about_body}</p>
      <div class="con-feat">
        <div class="f">We believe in fostering long-term partnerships</div>
        <div class="f">We develop actionable plans to achieve your goals</div>
        <div class="f">{years_experience}+ years of measurable client results</div>
      </div>
      <a href="#process" class="con-btn" style="margin-top:1.8rem">Read our story</a>
    </div>
  </div></div></section>

  <section class="con-sec"><div class="con-wrap">
    <div class="con-stats"><div class="inner">
      <div class="pic" style="background-image:url('${CON_IMG.growth}')"></div>
      <div class="nums">
        <div><h3>{success_rate}%</h3><small>Growth measured</small></div>
        <div><h3>25%</h3><small>Cost savings</small></div>
        <div><h3>{clients_count}+</h3><small>Clients served</small></div>
        <div><h3>{years_experience}+</h3><small>Years of experience</small></div>
      </div>
    </div></div>
  </div></section>

  <section class="con-sec" id="process" style="background:var(--bg)"><div class="con-wrap">
    <div class="con-head"><span class="con-eyebrow">Our process</span><h2 class="con-h">A flexible process built around you</h2><p class="con-lead" style="margin:1rem auto 0">We developed an innovative and flexible process that allows us to understand your business better.</p></div>
    <div class="con-proc">
      <div class="con-step"><div class="n">01.</div><h3>Discovery</h3><p>The first step is to gain a deep understanding of your business.</p></div>
      <div class="con-step"><div class="n">02.</div><h3>Development</h3><p>We'll work with you to develop a strategy that fits your objectives.</p></div>
      <div class="con-step"><div class="n">03.</div><h3>Implementation</h3><p>We work closely with your team to implement the changes.</p></div>
      <div class="con-step"><div class="n">04.</div><h3>Monitoring</h3><p>We monitor key performance indicators and gather feedback.</p></div>
    </div>
  </div></section>

  <section class="con-sec"><div class="con-wrap">
    <div class="con-head"><span class="con-eyebrow">Testimonials</span><h2 class="con-h">Trusted by 10k+ customers</h2><p class="con-lead" style="margin:1rem auto 0">Whether you're a small startup or a multinational corporation, let us be your trusted advisor on the path to success.</p></div>
    <div class="con-revs">
      <div class="con-rev"><div class="st">★★★★★</div><p>"Their collaborative approach, attention to detail, and commitment to delivering results set them apart from other consulting firms."</p><footer><img src="${CON_IMG.t1}" alt="Ryan Johnson"/><div><b>Ryan Johnson</b><small>Tech Solutions</small></div></footer></div>
      <div class="con-rev"><div class="st">★★★★★</div><p>"The impact of {company_name}'s work on our organization has been transformative. Their dedication helped us achieve remarkable growth."</p><footer><img src="${CON_IMG.t2}" alt="Alex Peterson"/><div><b>Alex Peterson</b><small>Thompson Industries</small></div></footer></div>
      <div class="con-rev"><div class="st">★★★★★</div><p>"Their team's depth of knowledge, strategic thinking, and commitment to excellence have been instrumental in navigating complex challenges."</p><footer><img src="${CON_IMG.t3}" alt="David Martinez"/><div><b>David Martinez</b><small>Johnson Enterprises</small></div></footer></div>
    </div>
  </div></section>

  <section class="con-sec"><div class="con-wrap">
    <div class="con-cta" style="background-image:url('${CON_IMG.approach}')"><div class="in">
      <h2>{bottom_cta_headline}</h2>
      <p>{bottom_cta_description}</p>
      <a href="#contact" class="con-btn">📞 {phone}</a>
    </div></div>
  </div></section>

  <section class="con-sec" id="contact" style="background:var(--bg)"><div class="con-wrap">
    <div class="con-head"><span class="con-eyebrow">Contact</span><h2 class="con-h">Grow your business with {company_name}</h2></div>
    <div class="con-contact">
      <div>
        <div class="con-irow"><div class="ic">📞</div><div><small>Phone</small><b>{phone}</b></div></div>
        <div class="con-irow"><div class="ic">✉️</div><div><small>Email</small><b>{email}</b></div></div>
        <div class="con-irow"><div class="ic">📍</div><div><small>Office</small><b>{address}</b></div></div>
        <div class="con-irow"><div class="ic">🕐</div><div><small>Hours</small><b>Mon–Fri 9am–6pm</b></div></div>
      </div>
      <div class="con-form">
        <div class="con-fg"><label>Name</label><input type="text" placeholder="Your name"/></div>
        <div class="con-fg"><label>Email</label><input type="email" placeholder="you@email.com"/></div>
        <div class="con-fg"><label>Message</label><textarea rows="4" placeholder="How can we help your business?"></textarea></div>
        <button class="con-btn" style="width:100%;justify-content:center">Send message</button>
      </div>
    </div>
  </div></section>
</div>`;

// ── LanderX template (modelled 1:1 on landerx.framer.website) ────────────────
const LX_IMG = {
  a1: "https://framerusercontent.com/images/ETgoVdeITLLIYCHTFNeVuZDMyQY.png?width=96&height=96",
  a2: "https://framerusercontent.com/images/bnJJiW5Vfixlrz7M2pzoeyHBU.png?width=96&height=96",
  a3: "https://framerusercontent.com/images/rlizSNVuxrrqd6I5hGaSxwqn0Os.png?width=96&height=96",
  a4: "https://framerusercontent.com/images/X0pqhTmlK8gdYqPbljhuLXlyd0I.png?width=96&height=96",
  t1: "https://framerusercontent.com/images/ETgoVdeITLLIYCHTFNeVuZDMyQY.png?width=120&height=120",
  t2: "https://framerusercontent.com/images/QmmaDSjXyuZNNDsZdt23lDVXI.png?width=120&height=120",
  t3: "https://framerusercontent.com/images/0zuVQ2JmvxEtdnpdOq5FtRJxmNY.png?width=120&height=160",
  t4: "https://framerusercontent.com/images/4EiFhjIPXbRF4y7hS6k9U484AQM.jpg?width=120&height=140",
  t5: "https://framerusercontent.com/images/7qBFv2WmuOwj4qUFS7XUzQSFL4.jpg?width=120&height=140",
  t6: "https://framerusercontent.com/images/tvip64h9JcqV1xA68gzm2QrLSM.png?width=120&height=120",
  founder: "https://framerusercontent.com/images/W7xYkGKzPzvnPv58ZBNzxS3JZI.jpg?width=200&height=200",
};

const landerxTemplate = () => `<style>
.lx{--bg:#05060c;--bg2:#0a0d1a;--card:#0e1222;--line:rgba(255,255,255,.08);--blue:#3b5bff;--blue2:#5b7bff;--ink:#f4f6ff;--body:#9aa3c0;--muted:#6b7494;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--body);line-height:1.7;background:var(--bg);max-width:100%;position:relative;overflow:hidden}
.lx :where(*){box-sizing:border-box}
.lx h1,.lx h2,.lx h3,.lx h4{color:var(--ink);margin:0;line-height:1.08;letter-spacing:-.02em;font-weight:600}
.lx p{margin:0}
.lx a{text-decoration:none;color:inherit}
.lx-wrap{max-width:1140px;margin:0 auto;padding:0 1.5rem}
.lx-sec{padding:clamp(3.5rem,7vw,6.5rem) 0;position:relative}
.lx-eyebrow{display:inline-block;color:var(--blue2);font-weight:600;font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;margin-bottom:1rem}
.lx-h{font-size:clamp(2rem,4.5vw,3.4rem)}
.lx-lead{color:var(--body);font-size:1.05rem;max-width:560px}
.lx-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--blue);color:#fff;padding:.9rem 1.7rem;border-radius:12px;font-weight:600;font-size:.95rem;transition:transform .25s,box-shadow .25s;border:none;cursor:pointer;box-shadow:0 0 0 1px rgba(91,123,255,.5),0 14px 40px rgba(59,91,255,.45)}
.lx-btn:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(91,123,255,.7),0 18px 50px rgba(59,91,255,.6)}
.lx-btn-ghost{background:rgba(255,255,255,.06);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}
.lx-btn-ghost:hover{background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
/* nav */
.lx-nav .bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.4rem 0}
.lx-nav .logo{display:flex;align-items:center;gap:.55rem;font-weight:700;color:var(--ink);font-size:1.15rem}
.lx-nav .logo .dot{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--blue),#8aa0ff);box-shadow:0 6px 18px rgba(59,91,255,.5)}
.lx-nav .links{display:flex;gap:2rem;font-size:.92rem}
.lx-nav .links a:hover{color:var(--ink)}
/* hero */
.lx-hero{position:relative;text-align:center;padding-top:1rem;padding-bottom:clamp(3rem,6vw,5rem)}
.lx-hero::before{content:'';position:absolute;top:-180px;left:50%;transform:translateX(-50%);width:760px;height:520px;background:radial-gradient(ellipse at center,rgba(59,91,255,.4),transparent 65%);filter:blur(20px);z-index:0}
.lx-hero .lx-wrap{position:relative;z-index:1}
.lx-join{display:inline-flex;align-items:center;gap:.7rem;margin-bottom:1.8rem}
.lx-avs{display:flex}
.lx-avs img{width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid var(--bg);margin-left:-10px}
.lx-avs img:first-child{margin-left:0}
.lx-join span{font-size:.92rem}.lx-join b{color:var(--ink)}
.lx-hero h1{font-size:clamp(2.6rem,6.5vw,5rem);font-weight:600;max-width:16ch;margin:0 auto;background:linear-gradient(180deg,#fff 30%,#9fb0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lx-hero p{font-size:1.1rem;max-width:520px;margin:1.6rem auto 2.2rem}
.lx-hero .cta{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:center}
/* logos */
.lx-logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2rem 3.5rem;padding:3rem 0 1rem;opacity:.6}
.lx-logos img{height:22px;width:auto;filter:brightness(0) invert(1)}
/* benefits */
.lx-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem}
.lx-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:1.9rem;transition:transform .3s,border-color .3s,box-shadow .3s}
.lx-card:hover{transform:translateY(-5px);border-color:rgba(91,123,255,.45);box-shadow:0 26px 60px rgba(0,0,0,.5)}
.lx-card .ic{width:50px;height:50px;border-radius:13px;background:linear-gradient(135deg,rgba(59,91,255,.25),rgba(59,91,255,.05));display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:1.1rem;box-shadow:inset 0 0 0 1px rgba(91,123,255,.3)}
.lx-card h3{font-size:1.15rem;margin-bottom:.5rem}
.lx-card p{font-size:.93rem}
/* head */
.lx-head{max-width:620px;margin:0 auto 3rem;text-align:center}
/* testimonials */
.lx-revs{columns:3;column-gap:1.25rem}
.lx-rev{break-inside:avoid;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:1.6rem;margin-bottom:1.25rem}
.lx-rev .st{color:#f5b301;font-size:.85rem;letter-spacing:1px;margin-bottom:.8rem}
.lx-rev p{color:var(--ink);font-size:.96rem}
.lx-rev footer{display:flex;align-items:center;gap:.75rem;margin-top:1.2rem}
.lx-rev footer img{width:42px;height:42px;border-radius:50%;object-fit:cover}
.lx-rev footer b{display:block;color:var(--ink);font-size:.92rem}
.lx-rev footer small{color:var(--muted);font-size:.82rem}
/* pricing */
.lx-price{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;align-items:start}
.lx-plan{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:2rem}
.lx-plan.pop{border-color:rgba(91,123,255,.6);box-shadow:0 0 0 1px rgba(91,123,255,.3),0 30px 70px rgba(59,91,255,.18);position:relative}
.lx-plan .tag{display:inline-block;font-size:.72rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--blue2);background:rgba(59,91,255,.14);padding:.3rem .7rem;border-radius:999px;margin-bottom:1rem}
.lx-plan .nm{color:var(--ink);font-weight:600;font-size:1.05rem;margin-bottom:.4rem}
.lx-plan .pr{color:var(--ink);font-size:2.6rem;font-weight:700;letter-spacing:-.02em}
.lx-plan .pr small{font-size:.9rem;color:var(--muted);font-weight:500}
.lx-plan ul{list-style:none;padding:0;margin:1.4rem 0 1.6rem;display:flex;flex-direction:column;gap:.7rem}
.lx-plan li{display:flex;gap:.6rem;align-items:flex-start;font-size:.92rem}
.lx-plan li::before{content:'✓';flex:none;color:var(--blue2);font-weight:700}
.lx-plan .lx-btn{width:100%;justify-content:center}
/* founder / split */
.lx-split{display:grid;grid-template-columns:.8fr 1.2fr;gap:2.5rem;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:clamp(1.8rem,4vw,3rem)}
.lx-split img{width:100%;max-width:200px;border-radius:18px;aspect-ratio:1;object-fit:cover}
.lx-split q{display:block;color:var(--ink);font-size:clamp(1.1rem,2vw,1.5rem);line-height:1.5;font-weight:500;quotes:none}
.lx-split small{display:block;color:var(--muted);margin-top:1.2rem}
/* faq */
.lx-faq{max-width:780px;margin:0 auto}
.lx-faq details{background:var(--card);border:1px solid var(--line);border-radius:14px;margin-bottom:.85rem;padding:1.1rem 1.4rem}
.lx-faq details[open]{border-color:rgba(91,123,255,.5)}
.lx-faq summary{color:var(--ink);font-weight:600;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:1rem}
.lx-faq summary::after{content:'+';color:var(--blue2);font-size:1.4rem;line-height:1}
.lx-faq details[open] summary::after{content:'–'}
.lx-faq p{margin-top:.9rem;font-size:.95rem}
/* final cta */
.lx-final{text-align:center;background:radial-gradient(ellipse at top,rgba(59,91,255,.3),transparent 60%),var(--bg2);border:1px solid var(--line);border-radius:24px;padding:clamp(3rem,6vw,5rem) 1.5rem}
.lx-final h2{font-size:clamp(2rem,4vw,3rem)}
.lx-final p{max-width:520px;margin:1.1rem auto 2rem}
.lx-final .cta{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:center}
@media(max-width:900px){.lx-nav .links{display:none}.lx-grid3,.lx-price,.lx-split{grid-template-columns:1fr}.lx-revs{columns:2}}
@media(max-width:560px){.lx-revs{columns:1}}
</style>
<div class="lx">
  <header class="lx-hero"><div class="lx-wrap">
    <div class="lx-join">
      <div class="lx-avs"><img src="${LX_IMG.a1}" alt=""/><img src="${LX_IMG.a2}" alt=""/><img src="${LX_IMG.a3}" alt=""/><img src="${LX_IMG.a4}" alt=""/></div>
      <span>Join <b>{customers_count}</b> {customers_label}</span>
    </div>
    <h1>{headline}</h1>
    <p>{subheadline}</p>
    <div class="cta">
      <a href="#pricing" class="lx-btn">{cta_text}</a>
      <a href="#contact" class="lx-btn lx-btn-ghost">{secondary_cta_text}</a>
    </div>
    <div class="lx-logos">
      <img src="https://framerusercontent.com/images/otv1rEDn2X7h8TFtKPCksQmAEKQ.svg?width=75&height=17" alt="Logo"/>
      <img src="https://framerusercontent.com/images/rrRoFs4icQtustYbIGm5r5DXREI.svg?width=50&height=17" alt="Logo"/>
      <img src="https://framerusercontent.com/images/hhTRf8RciR9bakkAgIckAkEiQM.svg?width=57&height=18" alt="Logo"/>
      <img src="https://framerusercontent.com/images/1ph1389RD4RtUDEfqVhWbujyF7s.svg?width=56&height=20" alt="Logo"/>
      <img src="https://framerusercontent.com/images/Yn3MOOL9rTXhK9U8MLvSnEoNP8.svg?width=45&height=14" alt="Logo"/>
    </div>
  </div></header>

  <section class="lx-sec" id="features"><div class="lx-wrap">
    <div class="lx-head"><span class="lx-eyebrow">{benefits_eyebrow}</span><h2 class="lx-h">{benefits_title}</h2><p class="lx-lead" style="margin:1rem auto 0">{benefits_subtitle}</p></div>
    <div class="lx-grid3">
      <div class="lx-card"><div class="ic">💸</div><h3>{feature_1_title}</h3><p>{feature_1_desc}</p></div>
      <div class="lx-card"><div class="ic">📊</div><h3>{feature_2_title}</h3><p>{feature_2_desc}</p></div>
      <div class="lx-card"><div class="ic">🧩</div><h3>{feature_3_title}</h3><p>{feature_3_desc}</p></div>
      <div class="lx-card"><div class="ic">🔒</div><h3>{feature_4_title}</h3><p>{feature_4_desc}</p></div>
      <div class="lx-card"><div class="ic">🤖</div><h3>{feature_5_title}</h3><p>{feature_5_desc}</p></div>
      <div class="lx-card"><div class="ic">🎧</div><h3>{feature_6_title}</h3><p>{feature_6_desc}</p></div>
    </div>
  </div></section>

  <section class="lx-sec" id="reviews"><div class="lx-wrap">
    <div class="lx-head"><span class="lx-eyebrow">{reviews_eyebrow}</span><h2 class="lx-h">{reviews_title}</h2><p class="lx-lead" style="margin:1rem auto 0">{reviews_subtitle}</p></div>
    <div class="lx-revs">
      <div class="lx-rev"><div class="st">★★★★★</div><p>{review_1_text}</p><footer><img src="${LX_IMG.t1}" alt="{review_1_name}"/><div><b>{review_1_name}</b><small>{review_1_role}</small></div></footer></div>
      <div class="lx-rev"><div class="st">★★★★★</div><p>{review_2_text}</p><footer><img src="${LX_IMG.t2}" alt="{review_2_name}"/><div><b>{review_2_name}</b><small>{review_2_role}</small></div></footer></div>
      <div class="lx-rev"><div class="st">★★★★★</div><p>{review_3_text}</p><footer><img src="${LX_IMG.t3}" alt="{review_3_name}"/><div><b>{review_3_name}</b><small>{review_3_role}</small></div></footer></div>
      <div class="lx-rev"><div class="st">★★★★★</div><p>{review_4_text}</p><footer><img src="${LX_IMG.t4}" alt="{review_4_name}"/><div><b>{review_4_name}</b><small>{review_4_role}</small></div></footer></div>
      <div class="lx-rev"><div class="st">★★★★★</div><p>{review_5_text}</p><footer><img src="${LX_IMG.t5}" alt="{review_5_name}"/><div><b>{review_5_name}</b><small>{review_5_role}</small></div></footer></div>
      <div class="lx-rev"><div class="st">★★★★★</div><p>{review_6_text}</p><footer><img src="${LX_IMG.t6}" alt="{review_6_name}"/><div><b>{review_6_name}</b><small>{review_6_role}</small></div></footer></div>
    </div>
  </div></section>

  <section class="lx-sec" id="pricing"><div class="lx-wrap">
    <div class="lx-head"><span class="lx-eyebrow">{pricing_eyebrow}</span><h2 class="lx-h">{pricing_title}</h2><p class="lx-lead" style="margin:1rem auto 0">{pricing_subtitle}</p></div>
    <div class="lx-price">
      <div class="lx-plan"><div class="nm">{plan_starter_name}</div><div class="pr">{price_starter}<small> / {price_period}</small></div><ul><li>{plan_starter_feature_1}</li><li>{plan_starter_feature_2}</li><li>{plan_starter_feature_3}</li><li>{plan_starter_feature_4}</li><li>{plan_starter_feature_5}</li></ul><a href="#contact" class="lx-btn lx-btn-ghost">{plan_cta_text}</a></div>
      <div class="lx-plan pop"><span class="tag">{plan_pro_badge}</span><div class="nm">{plan_pro_name}</div><div class="pr">{price_pro}<small> / {price_period}</small></div><ul><li>{plan_pro_feature_1}</li><li>{plan_pro_feature_2}</li><li>{plan_pro_feature_3}</li><li>{plan_pro_feature_4}</li><li>{plan_pro_feature_5}</li><li>{plan_pro_feature_6}</li></ul><a href="#contact" class="lx-btn">{plan_cta_text}</a></div>
      <div class="lx-plan"><div class="nm">{plan_enterprise_name}</div><div class="pr">{price_enterprise}</div><ul><li>{plan_enterprise_feature_1}</li><li>{plan_enterprise_feature_2}</li><li>{plan_enterprise_feature_3}</li><li>{plan_enterprise_feature_4}</li><li>{plan_enterprise_feature_5}</li></ul><a href="#contact" class="lx-btn lx-btn-ghost">{plan_cta_text}</a></div>
    </div>
  </div></section>

  <section class="lx-sec"><div class="lx-wrap">
    <span class="lx-eyebrow" style="display:block;text-align:center;margin-bottom:1.5rem">{founder_eyebrow}</span>
    <div class="lx-split">
      <img src="${LX_IMG.founder}" alt="{founder_name}"/>
      <div>
        <q>{founder_quote}</q>
        <small>{founder_name} — {founder_role}</small>
      </div>
    </div>
  </div></section>

  <section class="lx-sec" id="contact"><div class="lx-wrap">
    <div class="lx-head"><span class="lx-eyebrow">{faq_eyebrow}</span><h2 class="lx-h">{faq_title}</h2><p class="lx-lead" style="margin:1rem auto 0">{faq_subtitle}</p></div>
    <div class="lx-faq">
      <details open><summary>{faq_1_question}</summary><p>{faq_1_answer}</p></details>
      <details><summary>{faq_2_question}</summary><p>{faq_2_answer}</p></details>
      <details><summary>{faq_3_question}</summary><p>{faq_3_answer}</p></details>
      <details><summary>{faq_4_question}</summary><p>{faq_4_answer}</p></details>
      <details><summary>{faq_5_question}</summary><p>{faq_5_answer}</p></details>
    </div>
  </div></section>

  <section class="lx-sec"><div class="lx-wrap">
    <div class="lx-final">
      <h2>{bottom_cta_headline}</h2>
      <p>{bottom_cta_description}</p>
      <div class="cta">
        <a href="#pricing" class="lx-btn">{cta_text}</a>
        <a href="#contact" class="lx-btn lx-btn-ghost">{secondary_cta_text}</a>
      </div>
    </div>
  </div></section>
</div>`;

// ── Gardener template (modelled 1:1 on gardener.framer.media) ────────────────
const GD_IMG = {
  hero: "https://framerusercontent.com/images/dGs9I4fFD3z07PjQGZam073cvBI.jpg?width=2400",
  av1: "https://framerusercontent.com/images/2P677JVBYBa5pR56rBXMpoFqCH8.jpg?width=120&height=120",
  av2: "https://framerusercontent.com/images/kAftuUN9iRKwIt9M6RqZo9NS314.jpg?width=120&height=120",
  av3: "https://framerusercontent.com/images/d4SpmpLmhUfMZkWsTOukrdAmhg.jpg?width=120&height=120",
  ceo: "https://framerusercontent.com/images/kU2IUHPPHC3DtV3Cd7MgZ055bI.jpg?width=1200",
  build: "https://framerusercontent.com/images/JnzpL9nzjuWsjzizAHeLtSfZu4.jpg?width=1600",
  svc1: "https://framerusercontent.com/images/1hoeTb0nEw9VjtGI7wdWgDAtYqI.jpg?width=1200",
  svc2: "https://framerusercontent.com/images/9Syh2h9HhSW0nhT5FyWZhXwPo.jpg?width=1200",
  svc3: "https://framerusercontent.com/images/14AlFtJGEWHlEG8yxNaW1TICn3U.jpg?width=1200",
  faq: "https://framerusercontent.com/images/GTv5gTqKeKCdZ1nSwA9FIUiHw8.jpg?width=1200",
  g1: "https://framerusercontent.com/images/Fm175vcZy3kPuIpCIGCWdqjeUO8.jpg?width=1000",
  g2: "https://framerusercontent.com/images/7BUOCWCrAsIFAHLDv2m14i2fXEI.jpg?width=1000",
  g3: "https://framerusercontent.com/images/raNIyVphZvA6apdujFjEwGI7ck.jpg?width=1000",
  g4: "https://framerusercontent.com/images/eMlaTBn8rqRm5o3mSWmgOiprs.jpg?width=1000",
  g5: "https://framerusercontent.com/images/JEwCgM7FbUjpY6O5ZiQ0JLv7rKA.jpg?width=1000",
  g6: "https://framerusercontent.com/images/KrULMONCNvEgKD83moCcfUuPpLc.jpg?width=1000",
  rAlex: "https://framerusercontent.com/images/cwlKlWbNZtFsmbDitfwu6yJvvY.jpg?width=120&height=120",
  rJohn: "https://framerusercontent.com/images/Y9KmJAQ4w53hsc4jJojfokLZ7D8.jpg?width=120&height=120",
  rMichael: "https://framerusercontent.com/images/16FpqHSDpMP5wk238yiG6KHI6cY.jpg?width=120&height=120",
  rDavid: "https://framerusercontent.com/images/vHMSEWw5B42ZyOnn7b3crhvXwSY.jpg?width=120&height=120",
  b1: "https://framerusercontent.com/images/NxFe2Pi86c9sronDNi6WkDxqhas.jpg?width=800",
  b2: "https://framerusercontent.com/images/BjZBdUJegU8BxUNuc4e6eawkrs.jpg?width=800",
  b3: "https://framerusercontent.com/images/3EOOlITexXofKhwrwAOVP3WOSE.jpg?width=800",
};

const gardenerTemplate = () => `<style>
.gd{--grn:#3a9d4e;--grn-d:#2f8240;--ink:#16291b;--body:#46554a;--muted:#7a857d;--bg:#f3f6f2;--line:#e2e8e0;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--body);line-height:1.7;background:#fff;max-width:100%;position:relative}
.gd :where(*){box-sizing:border-box}
.gd h1,.gd h2,.gd h3,.gd h4{color:var(--ink);margin:0;line-height:1.1;letter-spacing:-.02em;font-weight:600}
.gd p{margin:0}
.gd a{text-decoration:none;color:inherit}
.gd-wrap{max-width:1180px;margin:0 auto;padding:0 1.5rem}
.gd-sec{padding:clamp(3.5rem,7vw,6rem) 0}
.gd-eyebrow{display:inline-block;color:var(--grn);font-weight:600;font-size:.92rem;margin-bottom:.85rem}
.gd-h{font-size:clamp(1.9rem,4vw,3rem)}
.gd-lead{color:var(--muted);font-size:1.05rem;max-width:600px}
.gd-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--grn);color:#fff;padding:.95rem 1.7rem;border-radius:10px;font-weight:600;font-size:.95rem;transition:background .25s,transform .25s;border:none;cursor:pointer}
.gd-btn:hover{background:var(--grn-d);transform:translateY(-2px)}
/* nav */
.gd-nav{position:absolute;top:0;left:0;right:0;z-index:5}
.gd-nav .bar{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.5rem;color:#fff}
.gd-nav .logo{display:flex;align-items:center;gap:.5rem;font-weight:700;font-size:1.2rem;color:#fff}
.gd-nav .logo .dot{width:22px;height:22px;border-radius:50%;background:var(--grn);display:flex;align-items:center;justify-content:center;font-size:.8rem}
.gd-nav .links{display:flex;gap:1.7rem;font-size:.95rem;color:rgba(255,255,255,.9)}
.gd-nav .links a:hover{color:#fff}
.gd-nav .pill{background:var(--grn);color:#fff;padding:.6rem 1.3rem;border-radius:10px;font-weight:600;font-size:.9rem}
/* hero */
.gd-hero{position:relative;min-height:94vh;display:flex;align-items:center;background-size:cover;background-position:center;color:#fff;overflow:hidden}
.gd-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,20,12,.55),rgba(10,20,12,.3))}
.gd-hero .gd-wrap{position:relative;z-index:2;padding-top:7rem;padding-bottom:4rem;width:100%;display:grid;grid-template-columns:1.3fr .9fr;gap:2.5rem;align-items:center}
.gd-hero h1{color:#fff;font-size:clamp(2.6rem,6vw,5rem);font-weight:600;max-width:12ch}
.gd-hero p{color:rgba(255,255,255,.9);font-size:1.15rem;max-width:480px;margin:1.4rem 0 2rem}
.gd-rate{display:flex;align-items:center;gap:.8rem}
.gd-rate .avs{display:flex}
.gd-rate .avs img{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #fff;margin-left:-12px}
.gd-rate .avs img:first-child{margin-left:0}
.gd-rate .st{color:#f5b301;letter-spacing:2px;font-size:.85rem}
.gd-rate small{color:rgba(255,255,255,.85);font-size:.85rem;display:block}
/* booking card */
.gd-book{background:rgba(255,255,255,.14);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.28);border-radius:18px;padding:1.8rem}
.gd-book h3{color:#fff;text-align:center;font-size:1.25rem;margin-bottom:1.2rem}
.gd-book input,.gd-book select{width:100%;padding:.85rem 1rem;border:1px solid rgba(255,255,255,.35);border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font:inherit;margin-bottom:.8rem}
.gd-book input::placeholder{color:rgba(255,255,255,.7)}
.gd-book .gd-btn{width:100%;justify-content:center;margin-top:.4rem}
/* head */
.gd-head{max-width:680px;margin:0 auto 3rem;text-align:center}
.gd-head .gd-eyebrow{display:block}
/* build split */
.gd-split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4rem);align-items:center}
.gd-split img{width:100%;border-radius:18px;aspect-ratio:4/3;object-fit:cover}
.gd-feat{display:flex;flex-direction:column;gap:.9rem;margin-top:1.6rem}
.gd-feat .f{display:flex;gap:.75rem;align-items:center;font-weight:600;color:var(--ink)}
.gd-feat .f::before{content:'✓';flex:none;width:26px;height:26px;border-radius:50%;background:rgba(58,157,78,.14);color:var(--grn);display:flex;align-items:center;justify-content:center;font-size:.85rem}
/* services */
.gd-svc{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.gd-card{border-radius:18px;overflow:hidden;position:relative;display:block;aspect-ratio:3/4}
.gd-card img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.gd-card:hover img{transform:scale(1.05)}
.gd-card .lbl{position:absolute;left:1rem;bottom:1rem;right:1rem;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border-radius:12px;padding:.85rem 1.1rem;display:flex;align-items:center;justify-content:space-between;font-weight:700;color:var(--ink)}
.gd-card .lbl .arr{color:var(--grn)}
/* faq */
.gd-faq{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,3.5rem);align-items:center}
.gd-faq img{width:100%;border-radius:18px;aspect-ratio:4/5;object-fit:cover}
.gd-acc details{border-bottom:1px solid var(--line);padding:1.1rem 0}
.gd-acc summary{font-weight:600;color:var(--ink);cursor:pointer;list-style:none;font-size:1.05rem}
.gd-acc summary::-webkit-details-marker{display:none}
.gd-acc p{color:var(--muted);margin-top:.7rem}
/* gallery */
.gd-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.gd-gal img{width:100%;border-radius:14px;aspect-ratio:1;object-fit:cover}
/* reviews */
.gd-revs{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
.gd-rev{background:var(--bg);border:1px solid var(--line);border-radius:18px;padding:1.8rem}
.gd-rev .st{color:#f5b301;letter-spacing:2px;margin-bottom:.9rem}
.gd-rev p{color:var(--ink);line-height:1.7}
.gd-rev footer{display:flex;align-items:center;gap:.85rem;margin-top:1.4rem}
.gd-rev footer img{width:46px;height:46px;border-radius:50%;object-fit:cover}
.gd-rev footer b{display:block;color:var(--ink)}
.gd-rev footer small{color:var(--muted)}
.gd-score{display:flex;align-items:baseline;gap:.6rem;justify-content:center;margin-bottom:.4rem}
.gd-score b{font-size:3rem;color:var(--ink);font-weight:700}
/* blog */
.gd-blog{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.gd-post{border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:transform .3s,box-shadow .3s}
.gd-post:hover{transform:translateY(-5px);box-shadow:0 20px 46px rgba(16,41,27,.1)}
.gd-post img{width:100%;aspect-ratio:16/10;object-fit:cover}
.gd-post .b{padding:1.3rem}
.gd-post .b small{color:var(--grn);font-weight:600}
.gd-post .b h3{font-size:1.1rem;margin-top:.5rem}
/* cta */
.gd-cta{position:relative;border-radius:24px;overflow:hidden;text-align:center;background-size:cover;background-position:center}
.gd-cta::before{content:'';position:absolute;inset:0;background:linear-gradient(120deg,rgba(47,130,64,.9),rgba(16,41,27,.8))}
.gd-cta .in{position:relative;z-index:2;padding:clamp(3rem,6vw,5rem) 1.5rem;color:#fff}
.gd-cta h2{color:#fff;font-size:clamp(1.9rem,3.8vw,3rem)}
.gd-cta p{color:rgba(255,255,255,.9);max-width:560px;margin:1rem auto 1.8rem}
.gd-cta .gd-btn{background:#fff;color:var(--ink)}
@media(max-width:900px){.gd-nav .links{display:none}.gd-hero .gd-wrap,.gd-svc,.gd-split,.gd-faq,.gd-revs,.gd-blog,.gd-gal{grid-template-columns:1fr}.gd-gal{grid-template-columns:1fr 1fr}}
</style>
<div class="gd">

  <header class="gd-hero" id="home" style="background-image:url('${GD_IMG.hero}')"><div class="gd-wrap">
    <div>
      <h1>{headline}</h1>
      <p>{subheadline}</p>
      <div class="gd-rate">
        <div class="avs"><img src="${GD_IMG.av1}" alt="Customer"/><img src="${GD_IMG.av2}" alt="Customer"/><img src="${GD_IMG.av3}" alt="Customer"/></div>
        <div><div class="st">★★★★★</div><small>From {ratings_count} ratings</small></div>
      </div>
    </div>
    <div class="gd-book">
      <h3>{booking_title}</h3>
      <input type="text" placeholder="Jane Smith"/>
      <input type="email" placeholder="jane@email.com"/>
      <input type="tel" placeholder="555-0123"/>
      <select><option>Select Your Location…</option><option>Long Island</option><option>Brooklyn</option></select>
      <button class="gd-btn">{cta_text}</button>
    </div>
  </div></header>

  <section class="gd-sec" id="about"><div class="gd-wrap"><div class="gd-split">
    <img src="${GD_IMG.build}" alt="Garden landscaping by {company_name}"/>
    <div>
      <span class="gd-eyebrow">{about_eyebrow}</span>
      <h2 class="gd-h">{about_title}</h2>
      <p class="gd-lead" style="margin-top:1rem">{about_body}</p>
      <div class="gd-feat">
        <div class="f">{feature_1}</div>
        <div class="f">{feature_2}</div>
        <div class="f">{feature_3}</div>
      </div>
      <a href="#contact" class="gd-btn" style="margin-top:1.8rem">📞 {phone}</a>
    </div>
  </div></div></section>

  <section class="gd-sec" id="services" style="background:var(--bg)"><div class="gd-wrap">
    <div class="gd-head"><span class="gd-eyebrow">{services_eyebrow}</span><h2 class="gd-h">{services_title}</h2><p class="gd-lead" style="margin:1rem auto 0">{services_subtitle}</p></div>
    <div class="gd-svc">
      <a class="gd-card"><img src="${GD_IMG.svc1}" alt="{service_1_title}"/><div class="lbl"><span>{service_1_title}</span><span class="arr">→</span></div></a>
      <a class="gd-card"><img src="${GD_IMG.svc2}" alt="{service_2_title}"/><div class="lbl"><span>{service_2_title}</span><span class="arr">→</span></div></a>
      <a class="gd-card"><img src="${GD_IMG.svc3}" alt="{service_3_title}"/><div class="lbl"><span>{service_3_title}</span><span class="arr">→</span></div></a>
    </div>
  </div></div></section>

  <section class="gd-sec"><div class="gd-wrap"><div class="gd-faq">
    <img src="${GD_IMG.faq}" alt="Beautiful garden"/>
    <div>
      <span class="gd-eyebrow">{faq_eyebrow}</span>
      <h2 class="gd-h" style="margin-bottom:1.4rem">{faq_title}</h2>
      <div class="gd-acc">
        <details open><summary>{faq_1_question}</summary><p>{faq_1_answer}</p></details>
        <details><summary>{faq_2_question}</summary><p>{faq_2_answer}</p></details>
        <details><summary>{faq_3_question}</summary><p>{faq_3_answer}</p></details>
      </div>
    </div>
  </div></div></section>

  <section class="gd-sec" style="background:var(--bg)"><div class="gd-wrap">
    <div class="gd-head"><span class="gd-eyebrow">{works_eyebrow}</span><h2 class="gd-h">{works_title}</h2><p class="gd-lead" style="margin:1rem auto 0">{works_subtitle}</p></div>
    <div class="gd-gal">
      <img src="${GD_IMG.g1}" alt="Recent work"/><img src="${GD_IMG.g2}" alt="Recent work"/><img src="${GD_IMG.g3}" alt="Recent work"/>
      <img src="${GD_IMG.g4}" alt="Recent work"/><img src="${GD_IMG.g5}" alt="Recent work"/><img src="${GD_IMG.g6}" alt="Recent work"/>
    </div>
  </div></div></section>

  <section class="gd-sec"><div class="gd-wrap">
    <div class="gd-head"><span class="gd-eyebrow">{reviews_eyebrow}</span><div class="gd-score"><b>{rating_value}</b><span class="st" style="color:#f5b301">★★★★★</span></div><p class="gd-lead" style="margin:0 auto">From {ratings_count} ratings</p></div>
    <div class="gd-revs">
      <div class="gd-rev"><div class="st">★★★★★</div><p>"{review_1_text}"</p><footer><img src="${GD_IMG.rAlex}" alt="{review_1_name}"/><div><b>{review_1_name}</b><small>Review on Trustpilot</small></div></footer></div>
      <div class="gd-rev"><div class="st">★★★★★</div><p>"{review_2_text}"</p><footer><img src="${GD_IMG.rJohn}" alt="{review_2_name}"/><div><b>{review_2_name}</b><small>Review on Trustpilot</small></div></footer></div>
      <div class="gd-rev"><div class="st">★★★★★</div><p>"{review_3_text}"</p><footer><img src="${GD_IMG.rMichael}" alt="{review_3_name}"/><div><b>{review_3_name}</b><small>Review on Google</small></div></footer></div>
      <div class="gd-rev"><div class="st">★★★★★</div><p>"{review_4_text}"</p><footer><img src="${GD_IMG.rDavid}" alt="{review_4_name}"/><div><b>{review_4_name}</b><small>Review on Trustpilot</small></div></footer></div>
    </div>
  </div></div></section>

  <section class="gd-sec" id="blog" style="background:var(--bg)"><div class="gd-wrap">
    <div class="gd-head"><span class="gd-eyebrow">{blog_eyebrow}</span><h2 class="gd-h">{blog_title}</h2><p class="gd-lead" style="margin:1rem auto 0">{blog_subtitle}</p></div>
    <div class="gd-blog">
      <a class="gd-post"><img src="${GD_IMG.b1}" alt="{post_1_title}"/><div class="b"><small>Apr 8, 2022</small><h3>{post_1_title}</h3></div></a>
      <a class="gd-post"><img src="${GD_IMG.b2}" alt="{post_2_title}"/><div class="b"><small>Mar 15, 2022</small><h3>{post_2_title}</h3></div></a>
      <a class="gd-post"><img src="${GD_IMG.b3}" alt="{post_3_title}"/><div class="b"><small>Feb 28, 2022</small><h3>{post_3_title}</h3></div></a>
    </div>
  </div></div></section>

  <section class="gd-sec" id="contact"><div class="gd-wrap">
    <div class="gd-cta" style="background-image:url('${GD_IMG.ceo}')"><div class="in">
      <h2>{bottom_cta_headline}</h2>
      <p>{bottom_cta_description}</p>
      <a href="#home" class="gd-btn">{cta_text}</a>
    </div></div>
  </div></div></section>
</div>`;

// ── Plumbing template (modelled 1:1 on plumbing.framer.media) ────────────────
const PL_IMG = {
  hero: "https://framerusercontent.com/images/niaKhcoeeMwMqwujQZ0s9CUm9yQ.jpg?width=1620&height=1876",
  av1: "https://framerusercontent.com/images/2Jb3R1TsXDLHBYLq9HplxoY8uFA.jpg?width=120&height=120",
  av2: "https://framerusercontent.com/images/nl1IkzaeBKFdkrdBOKZvZNaVXmE.jpg?width=120&height=120",
  av3: "https://framerusercontent.com/images/APvpNMGmN7Y0aXS0UesFkD2Ucq8.jpg?width=120&height=120",
  about1: "https://framerusercontent.com/images/SpHegeWzpyJPqNFSYbZX2CCCE.jpg?width=1200",
  about2: "https://framerusercontent.com/images/DCzBtRC3pxWe3MbSiE3qndn1f8s.jpg?width=1200",
  rRyan: "https://framerusercontent.com/images/Wu3jIIXne7CD8oB2WuVqxx1Wfk.jpg?width=120&height=120",
  rMichael: "https://framerusercontent.com/images/rsJ7qH7Mbs7CJkuvl24AzIdFM8Y.jpg?width=120&height=120",
  rDavid: "https://framerusercontent.com/images/iABb6ejla3A5ZzE4zgxiPqBaYHI.jpg?width=120&height=120",
  rJohn: "https://framerusercontent.com/images/tPYkIwImGTYNrIWUAK9mkYyUgw.jpg?width=120&height=120",
  b1: "https://framerusercontent.com/images/x7lS4XuvHu1RSTzTeLxbNGTRCn4.jpg?width=800",
  b2: "https://framerusercontent.com/images/L5gj2d18BFZqSR8WenUtG2r6OxA.jpg?width=800",
  b3: "https://framerusercontent.com/images/2Y9AudTUlCYjJHZIzka6i0dEE.jpg?width=800",
};

const plumberTemplate = () => `<style>
.pl{--blue:#2563eb;--blue-d:#1d4ed8;--ylw:#facc15;--ink:#0f1c3f;--body:#475467;--muted:#8a93a6;--bg:#eef3fb;--line:#dde5f1;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--body);line-height:1.7;background:#fff;max-width:100%;position:relative}
.pl :where(*){box-sizing:border-box}
.pl h1,.pl h2,.pl h3,.pl h4{color:var(--ink);margin:0;line-height:1.08;letter-spacing:-.02em;font-weight:700}
.pl p{margin:0}.pl a{text-decoration:none;color:inherit}
.pl-wrap{max-width:1180px;margin:0 auto;padding:0 1.5rem}
.pl-sec{padding:clamp(3.5rem,7vw,6rem) 0}
.pl-eyebrow{display:inline-block;color:var(--blue);font-weight:600;font-size:.92rem;margin-bottom:.85rem}
.pl-h{font-size:clamp(1.9rem,4vw,3rem)}
.pl-lead{color:var(--muted);font-size:1.05rem;max-width:640px}
.pl-btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--ylw);color:var(--ink);padding:.95rem 1.7rem;border-radius:40px;font-weight:700;font-size:.95rem;transition:transform .25s,filter .25s;border:none;cursor:pointer}
.pl-btn:hover{filter:brightness(.95);transform:translateY(-2px)}
.pl-btn.ghost{background:#fff;color:var(--ink)}
/* nav */
.pl-nav{position:absolute;top:0;left:0;right:0;z-index:5}
.pl-nav .bar{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.5rem;color:#fff}
.pl-nav .logo{display:flex;align-items:center;gap:.5rem;font-weight:700;font-size:1.2rem;color:#fff}
.pl-nav .logo .dot{width:26px;height:26px;border-radius:8px;background:var(--ylw);display:flex;align-items:center;justify-content:center;font-size:.85rem}
.pl-nav .links{display:flex;gap:1.7rem;font-size:.95rem;color:rgba(255,255,255,.92);background:rgba(255,255,255,.12);padding:.7rem 1.4rem;border-radius:40px;backdrop-filter:blur(6px)}
.pl-nav .links a:hover{color:#fff}
.pl-nav .right{display:flex;align-items:center;gap:1.2rem}
.pl-nav .phone{color:#fff;font-weight:600;font-size:.95rem}
.pl-nav .pill{background:var(--ylw);color:var(--ink);padding:.6rem 1.4rem;border-radius:40px;font-weight:700;font-size:.9rem}
/* hero */
.pl-hero{position:relative;background:radial-gradient(120% 120% at 80% 0,#3b6fe0,#1e40af 60%);color:#fff;overflow:hidden}
.pl-hero .pl-wrap{position:relative;z-index:2;padding-top:8rem;padding-bottom:4.5rem;display:grid;grid-template-columns:1.1fr .9fr;gap:2.5rem;align-items:center}
.pl-hero h1{color:#fff;font-size:clamp(2.6rem,6vw,4.6rem);font-weight:700;max-width:13ch}
.pl-hero p{color:rgba(255,255,255,.88);font-size:1.12rem;max-width:480px;margin:1.4rem 0 2rem}
.pl-hero .cta-row{display:flex;align-items:center;gap:1.3rem;flex-wrap:wrap}
.pl-rate{display:flex;align-items:center;gap:.7rem}
.pl-rate .avs{display:flex}
.pl-rate .avs img{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #fff;margin-left:-12px}
.pl-rate .avs img:first-child{margin-left:0}
.pl-rate .st{color:var(--ylw);letter-spacing:2px;font-size:.85rem}
.pl-rate small{color:rgba(255,255,255,.9);font-size:.85rem;display:block;font-weight:600}
.pl-shot{background:var(--ylw);border-radius:24px;padding:0;overflow:hidden;aspect-ratio:5/6;display:flex;align-items:flex-end;justify-content:center;border:5px solid rgba(255,255,255,.85)}
.pl-shot img{width:100%;height:100%;object-fit:cover;object-position:center top}
/* feature strip */
.pl-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-top:-2.5rem;position:relative;z-index:3}
.pl-strip .it{background:#fff;border:1px solid var(--line);border-radius:18px;padding:1.6rem;box-shadow:0 22px 48px rgba(15,28,63,.08)}
.pl-strip .it h4{color:var(--ink);font-size:1.05rem;margin-bottom:.3rem}
.pl-strip .it small{color:var(--muted)}
.pl-strip .it .ic{width:42px;height:42px;border-radius:12px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:.9rem}
/* head */
.pl-head{max-width:680px;margin:0 auto 3rem;text-align:center}
.pl-head .pl-eyebrow{display:block}
/* about split */
.pl-split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,5vw,4rem);align-items:center}
.pl-imgs{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.pl-imgs img{width:100%;border-radius:18px;aspect-ratio:3/4;object-fit:cover}
.pl-imgs img:first-child{margin-top:1.6rem}
.pl-feat{display:flex;flex-direction:column;gap:.9rem;margin-top:1.6rem}
.pl-feat .f{display:flex;gap:.75rem;align-items:center;font-weight:600;color:var(--ink)}
.pl-feat .f::before{content:'✓';flex:none;width:26px;height:26px;border-radius:50%;background:rgba(37,99,235,.12);color:var(--blue);display:flex;align-items:center;justify-content:center;font-size:.85rem}
/* services */
.pl-svc{display:grid;grid-template-columns:repeat(3,1fr);gap:1.3rem}
.pl-scard{border:1px solid var(--line);border-radius:18px;padding:1.7rem;background:#fff;transition:transform .3s,box-shadow .3s}
.pl-scard:hover{transform:translateY(-5px);box-shadow:0 22px 48px rgba(15,28,63,.1)}
.pl-scard .ic{width:48px;height:48px;border-radius:14px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:1rem}
.pl-scard h3{font-size:1.15rem;margin-bottom:.5rem}
.pl-scard p{color:var(--muted);font-size:.95rem}
/* emergency band */
.pl-band{background:var(--blue);border-radius:22px;padding:clamp(2.2rem,4vw,3rem);display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;color:#fff}
.pl-band h3{color:#fff;font-size:clamp(1.5rem,3vw,2.2rem)}
/* faq */
.pl-faq{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(2rem,5vw,3.5rem);align-items:start}
.pl-acc details{border-bottom:1px solid var(--line);padding:1.1rem 0}
.pl-acc summary{font-weight:700;color:var(--ink);cursor:pointer;list-style:none;font-size:1.05rem}
.pl-acc summary::-webkit-details-marker{display:none}
.pl-acc p{color:var(--muted);margin-top:.7rem}
/* reviews */
.pl-revs{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
.pl-rev{background:var(--bg);border:1px solid var(--line);border-radius:18px;padding:1.8rem}
.pl-rev .st{color:var(--ylw);letter-spacing:2px;margin-bottom:.9rem}
.pl-rev p{color:var(--ink);line-height:1.7}
.pl-rev footer{display:flex;align-items:center;gap:.85rem;margin-top:1.4rem}
.pl-rev footer img{width:46px;height:46px;border-radius:50%;object-fit:cover}
.pl-rev footer b{display:block;color:var(--ink)}
.pl-rev footer small{color:var(--muted)}
/* blog */
.pl-blog{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
.pl-post{border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:transform .3s,box-shadow .3s}
.pl-post:hover{transform:translateY(-5px);box-shadow:0 20px 46px rgba(15,28,63,.1)}
.pl-post img{width:100%;aspect-ratio:16/10;object-fit:cover}
.pl-post .b{padding:1.3rem}
.pl-post .b small{color:var(--blue);font-weight:600}
.pl-post .b h3{font-size:1.08rem;margin-top:.5rem}
/* cta */
.pl-cta{position:relative;border-radius:24px;overflow:hidden;text-align:center;background:radial-gradient(120% 120% at 50% 0,#3b6fe0,#1e3a8a)}
.pl-cta .in{position:relative;z-index:2;padding:clamp(3rem,6vw,5rem) 1.5rem;color:#fff}
.pl-cta h2{color:#fff;font-size:clamp(1.9rem,3.8vw,3rem)}
.pl-cta p{color:rgba(255,255,255,.9);max-width:560px;margin:1rem auto 1.8rem}
@media(max-width:900px){.pl-nav .links{display:none}.pl-hero .pl-wrap,.pl-svc,.pl-split,.pl-faq,.pl-revs,.pl-blog,.pl-strip{grid-template-columns:1fr}}
</style>
<div class="pl">

  <header class="pl-hero" id="home"><div class="pl-wrap">
    <div>
      <h1>{headline}</h1>
      <p>{subheadline}</p>
      <div class="cta-row">
        <a href="#contact" class="pl-btn">{cta_text}</a>
        <div class="pl-rate">
          <div class="avs"><img src="${PL_IMG.av1}" alt="Customer"/><img src="${PL_IMG.av2}" alt="Customer"/><img src="${PL_IMG.av3}" alt="Customer"/></div>
          <div><div class="st">★★★★★</div><small>{ratings_count} ratings</small></div>
        </div>
      </div>
    </div>
    <div class="pl-shot"><img src="${PL_IMG.hero}" alt="Professional plumber from {company_name}"/></div>
  </div></header>

  <section style="background:var(--bg)"><div class="pl-wrap" style="padding-bottom:clamp(3.5rem,7vw,6rem)">
    <div class="pl-strip">
      <div class="it"><div class="ic">📞</div><h4>{feature_1_title}</h4><small>{feature_1_desc}</small></div>
      <div class="it"><div class="ic">🔍</div><h4>{feature_2_title}</h4><small>{feature_2_desc}</small></div>
      <div class="it"><div class="ic">⏱️</div><h4>{feature_3_title}</h4><small>{feature_3_desc}</small></div>
    </div>
  </div></section>

  <section class="pl-sec" id="about" style="background:var(--bg)"><div class="pl-wrap"><div class="pl-split">
    <div class="pl-imgs"><img src="${PL_IMG.about1}" alt="Plumbing work by {company_name}"/><img src="${PL_IMG.about2}" alt="Bathroom plumbing"/></div>
    <div>
      <span class="pl-eyebrow">{about_eyebrow}</span>
      <h2 class="pl-h">{about_title}</h2>
      <p class="pl-lead" style="margin-top:1rem">{about_body}</p>
      <div class="pl-feat">
        <div class="f">{about_feature_1}</div>
        <div class="f">{about_feature_2}</div>
        <div class="f">{about_feature_3}</div>
      </div>
      <a href="#contact" class="pl-btn" style="margin-top:1.8rem">📞 {phone}</a>
    </div>
  </div></div></section>

  <section class="pl-sec" id="services"><div class="pl-wrap">
    <div class="pl-head"><span class="pl-eyebrow">{services_eyebrow}</span><h2 class="pl-h">{services_title}</h2><p class="pl-lead" style="margin:1rem auto 0">{services_subtitle}</p></div>
    <div class="pl-svc">
      <div class="pl-scard"><div class="ic">💧</div><h3>{service_1_title}</h3><p>{service_1_desc}</p></div>
      <div class="pl-scard"><div class="ic">🚿</div><h3>{service_2_title}</h3><p>{service_2_desc}</p></div>
      <div class="pl-scard"><div class="ic">🔥</div><h3>{service_3_title}</h3><p>{service_3_desc}</p></div>
      <div class="pl-scard"><div class="ic">🛁</div><h3>{service_4_title}</h3><p>{service_4_desc}</p></div>
      <div class="pl-scard"><div class="ic">🌊</div><h3>{service_5_title}</h3><p>{service_5_desc}</p></div>
      <div class="pl-scard"><div class="ic">🔧</div><h3>{service_6_title}</h3><p>{service_6_desc}</p></div>
    </div>
    <div class="pl-band" style="margin-top:2.5rem">
      <h3>{emergency_title}</h3>
      <a href="#contact" class="pl-btn ghost">{cta_text}</a>
    </div>
  </div></section>

  <section class="pl-sec" style="background:var(--bg)"><div class="pl-wrap"><div class="pl-faq">
    <div>
      <span class="pl-eyebrow">{faq_eyebrow}</span>
      <h2 class="pl-h">{faq_title}</h2>
      <p class="pl-lead" style="margin-top:1rem">{faq_subtitle}</p>
      <a href="#contact" class="pl-btn" style="margin-top:1.6rem">{cta_text}</a>
    </div>
    <div class="pl-acc">
      <details open><summary>{faq_1_question}</summary><p>{faq_1_answer}</p></details>
      <details><summary>{faq_2_question}</summary><p>{faq_2_answer}</p></details>
      <details><summary>{faq_3_question}</summary><p>{faq_3_answer}</p></details>
      <details><summary>{faq_4_question}</summary><p>{faq_4_answer}</p></details>
    </div>
  </div></div></section>

  <section class="pl-sec"><div class="pl-wrap">
    <div class="pl-head"><span class="pl-eyebrow">{reviews_eyebrow}</span><h2 class="pl-h">{reviews_title}</h2><p class="pl-lead" style="margin:1rem auto 0">{reviews_subtitle}</p></div>
    <div class="pl-revs">
      <div class="pl-rev"><div class="st">★★★★★</div><p>"{review_1_text}"</p><footer><img src="${PL_IMG.rRyan}" alt="{review_1_name}"/><div><b>{review_1_name}</b><small>Review on Trustpilot</small></div></footer></div>
      <div class="pl-rev"><div class="st">★★★★★</div><p>"{review_2_text}"</p><footer><img src="${PL_IMG.rMichael}" alt="{review_2_name}"/><div><b>{review_2_name}</b><small>Review on Facebook</small></div></footer></div>
      <div class="pl-rev"><div class="st">★★★★★</div><p>"{review_3_text}"</p><footer><img src="${PL_IMG.rDavid}" alt="{review_3_name}"/><div><b>{review_3_name}</b><small>Review on Trustpilot</small></div></footer></div>
      <div class="pl-rev"><div class="st">★★★★★</div><p>"{review_4_text}"</p><footer><img src="${PL_IMG.rJohn}" alt="{review_4_name}"/><div><b>{review_4_name}</b><small>Review on Google</small></div></footer></div>
    </div>
  </div></section>

  <section class="pl-sec" id="blog" style="background:var(--bg)"><div class="pl-wrap">
    <div class="pl-head"><span class="pl-eyebrow">{blog_eyebrow}</span><h2 class="pl-h">{blog_title}</h2><p class="pl-lead" style="margin:1rem auto 0">{blog_subtitle}</p></div>
    <div class="pl-blog">
      <a class="pl-post"><img src="${PL_IMG.b1}" alt="{post_1_title}"/><div class="b"><small>Apr 8, 2022</small><h3>{post_1_title}</h3></div></a>
      <a class="pl-post"><img src="${PL_IMG.b2}" alt="{post_2_title}"/><div class="b"><small>Mar 15, 2022</small><h3>{post_2_title}</h3></div></a>
      <a class="pl-post"><img src="${PL_IMG.b3}" alt="{post_3_title}"/><div class="b"><small>Feb 28, 2022</small><h3>{post_3_title}</h3></div></a>
    </div>
  </div></section>

  <section class="pl-sec" id="contact"><div class="pl-wrap">
    <div class="pl-cta"><div class="in">
      <h2>{bottom_cta_headline}</h2>
      <p>{bottom_cta_description}</p>
      <a href="tel:{phone}" class="pl-btn">📞 {cta_text} {phone}</a>
    </div></div>
  </div></section>
</div>`;

// ── Refit renovation template (modelled 1:1 on refit.framer.website) ─────────
const RF_IMG = {
  hero: "https://framerusercontent.com/images/bwP8CYttC1lINgPtK7lQja0.png?width=1200&height=1200",
  about1: "https://framerusercontent.com/images/RbmRrHiT87wxDx7Cox6FOA1sM3k.png?width=896&height=1200",
  about2: "https://framerusercontent.com/images/tWbl1rD5H93nV4ujsuqC2FUaqKM.png?width=1200&height=1200",
  about3: "https://framerusercontent.com/images/A7yE2PBsrF4l2EgA4yTO9HiAcPQ.png?width=960&height=1200",
  about4: "https://framerusercontent.com/images/uIxBIlcieM1DRX71NtmymFxTUI.png?width=1200&height=1200",
  work1: "https://framerusercontent.com/images/ffCQ9kReUH25ZCu6Q8kZxqQmMSY.png?width=960&height=1200",
  work2: "https://framerusercontent.com/images/7MZ40PhO3RLhot6UT21CZFk09Ck.jpg?width=1200&height=800",
  work3: "https://framerusercontent.com/images/ww0GmyZcc1yAIo8GBgwRahYQjtc.png?width=1200&height=1200",
  av1: "https://framerusercontent.com/images/7fL4QJDsuimM3GmAxnTxB58Lrw.jpg?width=120&height=120",
  av2: "https://framerusercontent.com/images/AqDU62U0ILWH6uLvadot2OfuggA.jpg?width=120&height=120",
  av3: "https://framerusercontent.com/images/OuUloSm0m69zkSLax5gEBHqD8Y.png?width=120&height=120",
};

const refitTemplate = () => `<style>
.rf{--bg:#0d0d0f;--panel:#16161a;--panel2:#1d1d22;--ink:#f5f3ef;--body:#a7a39c;--muted:#76726c;--line:#2a2a30;--accent:#c9886a;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:var(--body);line-height:1.7;background:var(--bg);max-width:100%;position:relative}
.rf :where(*){box-sizing:border-box}
.rf h1,.rf h2,.rf h3,.rf h4{color:var(--ink);margin:0;line-height:1.05;letter-spacing:-.02em;font-weight:600}
.rf p{margin:0}.rf a{text-decoration:none;color:inherit}
.rf-wrap{max-width:1200px;margin:0 auto;padding:0 1.5rem}
.rf-sec{padding:clamp(3.5rem,7vw,6.5rem) 0}
.rf-eyebrow{display:inline-flex;align-items:center;gap:.5rem;color:var(--body);font-weight:500;font-size:.85rem;letter-spacing:.02em;padding:.45rem 1rem;border:1px solid var(--line);border-radius:40px;margin-bottom:1.2rem}
.rf-eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.rf-h{font-size:clamp(2rem,4.2vw,3.4rem);font-weight:600}
.rf-lead{color:var(--body);font-size:1.05rem;max-width:620px}
.rf-btn{display:inline-flex;align-items:center;gap:.6rem;background:var(--ink);color:#111;padding:.95rem 1.6rem;border-radius:40px;font-weight:600;font-size:.95rem;transition:transform .25s,opacity .25s;border:none;cursor:pointer}
.rf-btn:hover{opacity:.9;transform:translateY(-2px)}
.rf-btn .ar{width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,.12);display:flex;align-items:center;justify-content:center;font-size:.9rem}
.rf-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.rf-nav{position:absolute;top:0;left:0;right:0;z-index:5}
.rf-nav .bar{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1.6rem 1.5rem}
.rf-nav .logo{font-weight:700;font-size:1.4rem;color:var(--ink);letter-spacing:-.01em}
.rf-nav .links{display:flex;gap:1.8rem;font-size:.95rem;color:var(--body)}
.rf-nav .links a:hover{color:var(--ink)}
.rf-nav .pill{background:var(--ink);color:#111;padding:.6rem 1.3rem;border-radius:40px;font-weight:600;font-size:.9rem}
.rf-hero .rf-wrap{padding-top:9rem;padding-bottom:2rem;display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center}
.rf-hero h1{font-size:clamp(2.6rem,5.5vw,4.4rem);max-width:12ch}
.rf-hero p{margin:1.6rem 0 2rem;max-width:440px}
.rf-shot{position:relative;border-radius:22px;overflow:hidden;aspect-ratio:4/5}
.rf-shot img{width:100%;height:100%;object-fit:cover}
.rf-quote{position:absolute;left:1rem;right:1rem;bottom:1rem;background:rgba(13,13,15,.7);backdrop-filter:blur(10px);border:1px solid var(--line);border-radius:16px;padding:1.1rem 1.2rem;color:var(--ink);font-size:.92rem}
.rf-quote .st{color:var(--accent);letter-spacing:2px;font-size:.8rem;margin-bottom:.4rem}
.rf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem}
.rf-stat{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:1.8rem}
.rf-stat .n{font-size:clamp(2.2rem,4vw,3rem);color:var(--ink);font-weight:600;letter-spacing:-.02em}
.rf-stat h4{color:var(--ink);font-size:1.02rem;margin:.6rem 0 .3rem}
.rf-stat small{color:var(--muted)}
.rf-head{max-width:620px;margin-bottom:3rem}
.rf-head.ctr{margin-left:auto;margin-right:auto;text-align:center}
.rf-split{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(2rem,5vw,4rem);align-items:center}
.rf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.rf-grid2 img{width:100%;border-radius:16px;aspect-ratio:3/4;object-fit:cover}
.rf-grid2 img:nth-child(2),.rf-grid2 img:nth-child(3){margin-top:1.4rem}
.rf-feat{display:flex;flex-direction:column;gap:.85rem;margin:1.6rem 0}
.rf-feat .f{display:flex;gap:.7rem;align-items:center;font-weight:500;color:var(--ink)}
.rf-feat .f::before{content:'✓';flex:none;width:24px;height:24px;border-radius:50%;background:rgba(201,136,106,.18);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:.8rem}
.rf-svc{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem}
.rf-scard{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:1.8rem;transition:transform .3s,border-color .3s}
.rf-scard:hover{transform:translateY(-5px);border-color:var(--accent)}
.rf-scard .ic{width:48px;height:48px;border-radius:13px;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:1.1rem}
.rf-scard h3{font-size:1.2rem;margin-bottom:.6rem}
.rf-scard p{color:var(--muted);font-size:.94rem}
.rf-work{display:grid;grid-template-columns:repeat(3,1fr);gap:1.3rem}
.rf-wcard{background:var(--panel);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:transform .3s}
.rf-wcard:hover{transform:translateY(-5px)}
.rf-wcard img{width:100%;aspect-ratio:4/5;object-fit:cover}
.rf-wcard .b{padding:1.4rem}
.rf-wcard .tag{display:inline-block;font-size:.78rem;color:var(--accent);border:1px solid var(--line);border-radius:30px;padding:.25rem .8rem;margin-bottom:.7rem}
.rf-wcard h3{font-size:1.15rem;margin-bottom:.5rem}
.rf-wcard p{color:var(--muted);font-size:.9rem}
.rf-revs{display:grid;grid-template-columns:repeat(3,1fr);gap:1.3rem}
.rf-rev{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:1.8rem;display:flex;flex-direction:column;gap:1.2rem}
.rf-rev .st{color:var(--accent);letter-spacing:2px}
.rf-rev p{color:var(--ink);line-height:1.7;flex:1}
.rf-rev footer{display:flex;align-items:center;gap:.8rem}
.rf-rev footer img{width:46px;height:46px;border-radius:50%;object-fit:cover}
.rf-rev footer b{display:block;color:var(--ink)}
.rf-rev footer small{color:var(--muted)}
.rf-faq{display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(2rem,5vw,3.5rem);align-items:start}
.rf-acc details{border:1px solid var(--line);border-radius:14px;padding:1.1rem 1.3rem;margin-bottom:.9rem;background:var(--panel)}
.rf-acc summary{font-weight:600;color:var(--ink);cursor:pointer;list-style:none;font-size:1.02rem;display:flex;justify-content:space-between;gap:1rem}
.rf-acc summary::-webkit-details-marker{display:none}
.rf-acc summary::after{content:'+';color:var(--accent);font-size:1.3rem;line-height:1}
.rf-acc details[open] summary::after{content:'−'}
.rf-acc p{color:var(--muted);margin-top:.8rem}
.rf-cta{background:var(--panel);border:1px solid var(--line);border-radius:24px;padding:clamp(2.5rem,5vw,4rem);text-align:center}
.rf-cta h2{font-size:clamp(1.9rem,3.8vw,3rem);margin-bottom:1rem}
.rf-cta p{max-width:540px;margin:0 auto 1.8rem}
.rf-info{display:flex;justify-content:center;gap:2.5rem;flex-wrap:wrap;margin-top:2.2rem;color:var(--body);font-size:.95rem}
.rf-info b{display:block;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.3rem;color:var(--muted)}
@media(max-width:900px){.rf-nav .links{display:none}.rf-hero .rf-wrap,.rf-svc,.rf-split,.rf-faq,.rf-work,.rf-revs,.rf-stats{grid-template-columns:1fr}.rf-stats{grid-template-columns:1fr 1fr}}
</style>
<div class="rf">

  <header class="rf-hero" id="home"><div class="rf-wrap">
    <div>
      <span class="rf-eyebrow"><span class="dot"></span>{availability_label}</span>
      <h1>{headline}</h1>
      <p>{subheadline}</p>
      <a href="#contact" class="rf-btn">{cta_text}<span class="ar">↗</span></a>
    </div>
    <div class="rf-shot">
      <img src="{hero_image}" alt="Home renovation by {company_name}"/>
      <div class="rf-quote"><div class="st">★★★★★</div>"{hero_quote}"</div>
    </div>
  </div></header>

  <section class="rf-sec" style="padding-top:2rem"><div class="rf-wrap">
    <div class="rf-stats">
      <div class="rf-stat"><div class="n">{stat_1_value}</div><h4>{stat_1_label}</h4><small>{stat_1_desc}</small></div>
      <div class="rf-stat"><div class="n">{stat_2_value}</div><h4>{stat_2_label}</h4><small>{stat_2_desc}</small></div>
      <div class="rf-stat"><div class="n">{stat_3_value}</div><h4>{stat_3_label}</h4><small>{stat_3_desc}</small></div>
      <div class="rf-stat"><div class="n">{stat_4_value}</div><h4>{stat_4_label}</h4><small>{stat_4_desc}</small></div>
    </div>
  </div></section>

  <section class="rf-sec" id="about"><div class="rf-wrap"><div class="rf-split">
    <div class="rf-grid2"><img src="{about_image_1}" alt="Renovation detail"/><img src="{about_image_2}" alt="Kitchen build"/><img src="{about_image_3}" alt="Interior craftsmanship"/><img src="{about_image_4}" alt="Finished room"/></div>
    <div>
      <span class="rf-eyebrow"><span class="dot"></span>{about_eyebrow}</span>
      <h2 class="rf-h">{about_title}</h2>
      <p class="rf-lead" style="margin-top:1rem">{about_body}</p>
      <div class="rf-feat">
        <div class="f">{about_feature_1}</div>
        <div class="f">{about_feature_2}</div>
        <div class="f">{about_feature_3}</div>
      </div>
      <a href="#contact" class="rf-btn">{cta_text}<span class="ar">↗</span></a>
    </div>
  </div></div></section>

  <section class="rf-sec" id="services"><div class="rf-wrap">
    <div class="rf-head"><span class="rf-eyebrow"><span class="dot"></span>{services_eyebrow}</span><h2 class="rf-h">{services_title}</h2><p class="rf-lead" style="margin-top:1rem">{services_subtitle}</p></div>
    <div class="rf-svc">
      <div class="rf-scard"><div class="ic">🍳</div><h3>{service_1_title}</h3><p>{service_1_desc}</p></div>
      <div class="rf-scard"><div class="ic">🏠</div><h3>{service_2_title}</h3><p>{service_2_desc}</p></div>
      <div class="rf-scard"><div class="ic">🛁</div><h3>{service_3_title}</h3><p>{service_3_desc}</p></div>
      <div class="rf-scard"><div class="ic">📐</div><h3>{service_4_title}</h3><p>{service_4_desc}</p></div>
      <div class="rf-scard"><div class="ic">🧱</div><h3>{service_5_title}</h3><p>{service_5_desc}</p></div>
      <div class="rf-scard"><div class="ic">🌳</div><h3>{service_6_title}</h3><p>{service_6_desc}</p></div>
    </div>
  </div></section>

  <section class="rf-sec" id="work"><div class="rf-wrap">
    <div class="rf-head"><span class="rf-eyebrow"><span class="dot"></span>{work_eyebrow}</span><h2 class="rf-h">{work_title}</h2><p class="rf-lead" style="margin-top:1rem">{work_subtitle}</p></div>
    <div class="rf-work">
      <div class="rf-wcard"><img src="{work_1_image}" alt="{work_1_title}"/><div class="b"><span class="tag">{work_1_tag}</span><h3>{work_1_title}</h3><p>{work_1_desc}</p></div></div>
      <div class="rf-wcard"><img src="{work_2_image}" alt="{work_2_title}"/><div class="b"><span class="tag">{work_2_tag}</span><h3>{work_2_title}</h3><p>{work_2_desc}</p></div></div>
      <div class="rf-wcard"><img src="{work_3_image}" alt="{work_3_title}"/><div class="b"><span class="tag">{work_3_tag}</span><h3>{work_3_title}</h3><p>{work_3_desc}</p></div></div>
    </div>
  </div></section>

  <section class="rf-sec"><div class="rf-wrap">
    <div class="rf-head ctr"><span class="rf-eyebrow"><span class="dot"></span>{reviews_eyebrow}</span><h2 class="rf-h">{reviews_title}</h2><p class="rf-lead" style="margin:1rem auto 0">{reviews_subtitle}</p></div>
    <div class="rf-revs">
      <div class="rf-rev"><div class="st">★★★★★</div><p>"{review_1_text}"</p><footer><img src="{review_1_avatar}" alt="{review_1_name}"/><div><b>{review_1_name}</b><small>{review_1_role}</small></div></footer></div>
      <div class="rf-rev"><div class="st">★★★★★</div><p>"{review_2_text}"</p><footer><img src="{review_2_avatar}" alt="{review_2_name}"/><div><b>{review_2_name}</b><small>{review_2_role}</small></div></footer></div>
      <div class="rf-rev"><div class="st">★★★★★</div><p>"{review_3_text}"</p><footer><img src="{review_3_avatar}" alt="{review_3_name}"/><div><b>{review_3_name}</b><small>{review_3_role}</small></div></footer></div>
    </div>
  </div></section>

  <section class="rf-sec" id="faqs"><div class="rf-wrap"><div class="rf-faq">
    <div>
      <span class="rf-eyebrow"><span class="dot"></span>{faq_eyebrow}</span>
      <h2 class="rf-h">{faq_title}</h2>
      <p class="rf-lead" style="margin-top:1rem">{faq_subtitle}</p>
      <a href="#contact" class="rf-btn" style="margin-top:1.6rem">{cta_text}<span class="ar">↗</span></a>
    </div>
    <div class="rf-acc">
      <details open><summary>{faq_1_question}</summary><p>{faq_1_answer}</p></details>
      <details><summary>{faq_2_question}</summary><p>{faq_2_answer}</p></details>
      <details><summary>{faq_3_question}</summary><p>{faq_3_answer}</p></details>
      <details><summary>{faq_4_question}</summary><p>{faq_4_answer}</p></details>
      <details><summary>{faq_5_question}</summary><p>{faq_5_answer}</p></details>
    </div>
  </div></div></section>

  <section class="rf-sec" id="contact"><div class="rf-wrap">
    <div class="rf-cta">
      <span class="rf-eyebrow"><span class="dot"></span>{contact_eyebrow}</span>
      <h2>{bottom_cta_headline}</h2>
      <p>{bottom_cta_description}</p>
      <a href="tel:{phone}" class="rf-btn">{cta_text}<span class="ar">↗</span></a>
      <div class="rf-info">
        <div><b>Office</b>{address}</div>
        <div><b>Email</b>{email}</div>
        <div><b>Telephone</b>{phone}</div>
      </div>
    </div>
  </div></section>
</div>`;

// ── Templates ──────────────────────────────────────────────────────────────
const RAW_COMMUNITY_TEMPLATES: MarketplaceTemplate[] = [
  // 1. Local Plumber
  {
    id: "plumber-landing",
    name: "Plumber Landing Template",
    description: "High-converting plumbing landing page — blue & yellow hero with a real plumber photo, trust strip, about split, 6-service grid, emergency band, FAQ, customer reviews, blog highlights and a closing call CTA. Modelled 1:1 on the plumbing.framer.media design.",
    content: plumberTemplate(),
    variables: [
      "{company_name}", "{headline}", "{subheadline}", "{cta_text}", "{phone}", "{ratings_count}",
      "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}",
      "{about_eyebrow}", "{about_title}", "{about_body}", "{about_feature_1}", "{about_feature_2}", "{about_feature_3}",
      "{services_eyebrow}", "{services_title}", "{services_subtitle}",
      "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}", "{service_3_title}", "{service_3_desc}",
      "{service_4_title}", "{service_4_desc}", "{service_5_title}", "{service_5_desc}", "{service_6_title}", "{service_6_desc}",
      "{emergency_title}",
      "{faq_eyebrow}", "{faq_title}", "{faq_subtitle}",
      "{faq_1_question}", "{faq_1_answer}", "{faq_2_question}", "{faq_2_answer}", "{faq_3_question}", "{faq_3_answer}", "{faq_4_question}", "{faq_4_answer}",
      "{reviews_eyebrow}", "{reviews_title}", "{reviews_subtitle}",
      "{review_1_text}", "{review_1_name}", "{review_2_text}", "{review_2_name}",
      "{review_3_text}", "{review_3_name}", "{review_4_text}", "{review_4_name}",
      "{blog_eyebrow}", "{blog_title}", "{blog_subtitle}", "{post_1_title}", "{post_2_title}", "{post_3_title}",
      "{bottom_cta_headline}", "{bottom_cta_description}",
    ],
    category: "local-seo",
    tags: ["plumbing", "local", "services", "landing"],
    author: "Community", downloads: 1247, rating: 4.8,
    seo_title_pattern: "{company_name} — Trusted Plumbing Solutions | {headline}",
    seo_description_pattern: "{subheadline} Call {company_name} at {phone} for fast, professional plumbing service available 24/7.",
    og_title_pattern: "{company_name} — Trusted Plumbing Solutions | {headline}", og_description_pattern: "{subheadline} Call {company_name} at {phone} for fast, professional plumbing service available 24/7.", og_image_pattern: "{work_1_image}",
    slug_pattern: "{company_name}-plumbing-services",
    schema_type: "LocalBusiness",
    defaultValues: {
      company_name: "Plumbing",
      headline: "Your trusted plumbing solutions in New York",
      subheadline: "With over 20 years of experience, we have built a reputation for delivering top-notch plumbing solutions tailored to meet your needs.",
      cta_text: "Contact Us",
      phone: "555-0123",
      ratings_count: "2000+",
      feature_1_title: "Call us 555-0123",
      feature_1_desc: "We remain available 24/7",
      feature_2_title: "Expert evaluation",
      feature_2_desc: "We will look for solutions",
      feature_3_title: "We arrive in 30 minutes",
      feature_3_desc: "We'll bring all the equipment",
      about_eyebrow: "About Us",
      about_title: "Plumbing solutions tailored to your needs",
      about_body: "Our team of licensed and experienced plumbers is committed to providing prompt, professional, and courteous service, ensuring that your plumbing system is always in optimal condition.",
      about_feature_1: "Experienced Plumbers",
      about_feature_2: "High-Quality Equipment",
      about_feature_3: "High Customer Satisfaction",
      services_eyebrow: "Our services",
      services_title: "Our services",
      services_subtitle: "We offer a comprehensive range of plumbing services designed to address all your plumbing needs.",
      service_1_title: "Leak Detection",
      service_1_desc: "Advanced technology to locate and repair hidden leaks.",
      service_2_title: "Drain Cleaning",
      service_2_desc: "Effective unclogging and thorough drain cleaning solutions.",
      service_3_title: "Water Heater",
      service_3_desc: "Professional installation, service and repair of water heaters.",
      service_4_title: "Bathroom and Kitchen",
      service_4_desc: "Comprehensive plumbing services for kitchens and bathrooms.",
      service_5_title: "Water Filtration",
      service_5_desc: "Ensure clean, safe water with our reliable filtration systems.",
      service_6_title: "Pipe Repair",
      service_6_desc: "Reliable repair and replacement services for damaged pipes.",
      emergency_title: "Have a plumbing emergency?",
      faq_eyebrow: "FAQ",
      faq_title: "Your questions, answered",
      faq_subtitle: "Answers to the most common questions our customers have. If you don't find the information you're looking for, feel free to contact us.",
      faq_1_question: "Are your plumbers licensed and insured?",
      faq_1_answer: "Yes, all our plumbers are fully licensed, insured, and have undergone extensive training to ensure they provide the highest quality service.",
      faq_2_question: "Do you offer free estimates?",
      faq_2_answer: "Absolutely. We provide free, no-obligation estimates for all our plumbing services so you know exactly what to expect before any work begins.",
      faq_3_question: "What payment methods do you accept?",
      faq_3_answer: "We accept all major credit cards, debit cards, cash, and bank transfers for your convenience.",
      faq_4_question: "Do you offer financing options?",
      faq_4_answer: "Yes, we offer flexible financing options to help make larger plumbing projects more affordable.",
      reviews_eyebrow: "Testimonials",
      reviews_title: "What our customers say",
      reviews_subtitle: "Our customers are at the heart of everything we do. We listen to your needs and tailor our services to meet them.",
      review_1_text: "Plumbing provided quick and efficient service for our clogged drain, restoring our plumbing system to perfect condition.",
      review_1_name: "Ryan Johnson",
      review_2_text: "We're impressed with Plumbing's outstanding job on our kitchen. Their thoroughness and expertise exceeded our expectations.",
      review_2_name: "Michael Brown",
      review_3_text: "Plumbing's team is reliable and courteous, resolving our plumbing issues promptly and with meticulous attention to detail.",
      review_3_name: "David Martinez",
      review_4_text: "Plumbing's rapid response and expert handling of our emergency saved the day. Highly recommend their professional service!",
      review_4_name: "John Smith",
      blog_eyebrow: "Our blog",
      blog_title: "Latest blog posts",
      blog_subtitle: "Our blog is designed to help you understand your plumbing system better and provide valuable insights to keep it running smoothly.",
      post_1_title: "How to Identify and Fix Common Plumbing Leaks",
      post_2_title: "The Benefits of Installing a Tankless Water Heater",
      post_3_title: "Eco-Friendly Solutions to Reduce Your Water Bill",
      bottom_cta_headline: "Need a plumber fast?",
      bottom_cta_description: "Our licensed plumbers are available 24/7 to handle any emergency. Get in touch for fast, reliable service you can trust.",
    },
  },

  // 1b. Home & Kitchen Renovation (Refit)
  {
    id: "home-renovation",
    name: "Home Renovation Template",
    description: "Sleek dark-theme landing page for a home & kitchen renovation company — bold hero with a real kitchen photo and floating review, stats strip, about gallery, 6-service grid, project showcase, client testimonials, FAQ accordion and a contact CTA. Modelled 1:1 on the refit.framer.website design.",
    content: refitTemplate(),
    variables: [
      "{company_name}", "{availability_label}", "{headline}", "{subheadline}", "{cta_text}", "{hero_quote}", "{phone}", "{email}", "{address}",
      "{stat_1_value}", "{stat_1_label}", "{stat_1_desc}", "{stat_2_value}", "{stat_2_label}", "{stat_2_desc}",
      "{stat_3_value}", "{stat_3_label}", "{stat_3_desc}", "{stat_4_value}", "{stat_4_label}", "{stat_4_desc}",
      "{about_eyebrow}", "{about_title}", "{about_body}", "{about_feature_1}", "{about_feature_2}", "{about_feature_3}",
      "{services_eyebrow}", "{services_title}", "{services_subtitle}",
      "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}", "{service_3_title}", "{service_3_desc}",
      "{service_4_title}", "{service_4_desc}", "{service_5_title}", "{service_5_desc}", "{service_6_title}", "{service_6_desc}",
      "{work_eyebrow}", "{work_title}", "{work_subtitle}",
      "{work_1_tag}", "{work_1_title}", "{work_1_desc}", "{work_2_tag}", "{work_2_title}", "{work_2_desc}", "{work_3_tag}", "{work_3_title}", "{work_3_desc}",
      "{reviews_eyebrow}", "{reviews_title}", "{reviews_subtitle}",
      "{review_1_text}", "{review_1_name}", "{review_1_role}", "{review_2_text}", "{review_2_name}", "{review_2_role}", "{review_3_text}", "{review_3_name}", "{review_3_role}",
      "{faq_eyebrow}", "{faq_title}", "{faq_subtitle}",
      "{faq_1_question}", "{faq_1_answer}", "{faq_2_question}", "{faq_2_answer}", "{faq_3_question}", "{faq_3_answer}", "{faq_4_question}", "{faq_4_answer}", "{faq_5_question}", "{faq_5_answer}",
      "{contact_eyebrow}", "{bottom_cta_headline}", "{bottom_cta_description}",
      "{hero_image}", "{about_image_1}", "{about_image_2}", "{about_image_3}", "{about_image_4}",
      "{work_1_image}", "{work_2_image}", "{work_3_image}",
      "{review_1_avatar}", "{review_2_avatar}", "{review_3_avatar}",
    ],
    category: "local-seo",
    tags: ["renovation", "kitchen", "home-improvement", "construction", "landing"],
    author: "Community", downloads: 932, rating: 4.9,
    seo_title_pattern: "{company_name} — Home & Kitchen Renovation Specialists",
    seo_description_pattern: "{subheadline} Contact {company_name} at {phone} for expert kitchens, bathrooms, extensions and renovations.",
    og_title_pattern: "{company_name} — Home & Kitchen Renovation Specialists", og_description_pattern: "{subheadline} Contact {company_name} at {phone} for expert kitchens, bathrooms, extensions and renovations.", og_image_pattern: "{hero_image}",
    slug_pattern: "{company_name}-home-renovation",
    schema_type: "LocalBusiness",
    defaultValues: {
      company_name: "Refit",
      availability_label: "Available for work",
      headline: "Your trusted partner for quality home improvement",
      subheadline: "Refit delivers expert home improvements, creating beautiful and functional spaces with quality craftsmanship.",
      cta_text: "Work with us",
      hero_quote: "Refit has been a game-changer for my home. Their ability to blend functionality with exquisite design is unparalleled.",
      phone: "07716 534984",
      email: "hello@refit.com",
      address: "150 Old Park Ln, London W1K 1QZ",
      stat_1_value: "15+",
      stat_1_label: "Years experience",
      stat_1_desc: "Improving homes with expert craftsmanship for years",
      stat_2_value: "250+",
      stat_2_label: "Projects completed",
      stat_2_desc: "Over 250 successful projects delivered with quality and care",
      stat_3_value: "30",
      stat_3_label: "Skilled tradespeople",
      stat_3_desc: "Our team of 30 experts ensures top-quality results",
      stat_4_value: "100%",
      stat_4_label: "Client satisfaction",
      stat_4_desc: "All of our clients are satisfied with our work and service",
      about_eyebrow: "About us",
      about_title: "Home improvement specialists",
      about_body: "Welcome to Refit, your trusted home improvement experts, dedicated to transforming homes with precision and care. With years of experience in building kitchens, bathrooms, garages, and more, we take pride in delivering top-quality craftsmanship and a seamless customer experience.",
      about_feature_1: "Quality craftsmanship guaranteed",
      about_feature_2: "Clear communication at every step",
      about_feature_3: "Trusted, experienced tradespeople",
      services_eyebrow: "Services",
      services_title: "What we do",
      services_subtitle: "Find out which one of our services fit the needs of your project.",
      service_1_title: "Kitchens",
      service_1_desc: "We design and build stunning kitchens tailored to your style and needs, delivering high-quality craftsmanship, functionality and attention to detail.",
      service_2_title: "Loft Conversions",
      service_2_desc: "Maximise your home's potential with a bespoke loft conversion, transforming underused lofts into stylish, functional living spaces that add value.",
      service_3_title: "Bathrooms",
      service_3_desc: "From luxurious en-suites to practical family bathrooms, we deliver beautifully designed spaces that combine style with everyday functionality.",
      service_4_title: "Extensions",
      service_4_desc: "Expand your living space with a seamless home extension, expertly crafted to enhance your home's flow, value and usability.",
      service_5_title: "Restorations",
      service_5_desc: "Bring your home's character back to life with expert restoration, preserving original details while ensuring modern durability.",
      service_6_title: "External Works",
      service_6_desc: "From driveways and patios to fencing and brickwork, we enhance your home's exterior with durable, high-quality craftsmanship.",
      work_eyebrow: "Our work",
      work_title: "Get inspired by our work",
      work_subtitle: "See how we've transformed homes with our expert craftsmanship and attention to detail.",
      work_1_tag: "Kitchen",
      work_1_title: "Modern kitchen refit",
      work_1_desc: "Custom cabinetry, high-quality worktops and state-of-the-art appliances created a stylish yet practical space perfect for cooking and entertaining.",
      work_2_tag: "External Works",
      work_2_title: "External garden path build",
      work_2_desc: "A durable, visually appealing garden path built with premium materials that blends naturally with the landscape.",
      work_3_tag: "Bathroom",
      work_3_title: "Bathroom renovation",
      work_3_desc: "A fresh, modern design with high-end tiling, sleek fixtures and efficient lighting, optimised to maximise space and comfort.",
      reviews_eyebrow: "Testimonials",
      reviews_title: "Hear from our clients",
      reviews_subtitle: "Hear from our happy clients about their experience working with us and the quality of our craftsmanship.",
      review_1_text: "Refit did an incredible job on our kitchen. The craftsmanship was top-notch, and the team was professional from start to finish. Highly recommend!",
      review_1_name: "Emily Carter",
      review_1_role: "Kitchen renovation",
      review_2_text: "Brilliant service from start to finish. The team was professional, communicative, and the results exceeded my expectations. My new bathroom looks amazing!",
      review_2_name: "James Richardson",
      review_2_role: "Bathroom renovation",
      review_3_text: "I couldn't be happier with my loft conversion. The attention to detail and quality of work were outstanding. Refit made the whole process smooth and stress-free!",
      review_3_name: "Sophie Williams",
      review_3_role: "Loft conversion",
      faq_eyebrow: "FAQs",
      faq_title: "Answering your questions",
      faq_subtitle: "Got more questions? Send us your enquiry below.",
      faq_1_question: "What area are you based in?",
      faq_1_answer: "We primarily serve London and surrounding areas, but depending on the project, we may be able to travel further. Get in touch to discuss your location and project needs.",
      faq_2_question: "How long does a typical project take?",
      faq_2_answer: "Project timelines vary depending on the scope of work. A kitchen or bathroom renovation can take a few weeks, while larger projects like extensions or loft conversions may take several months. We provide clear timelines before starting any work.",
      faq_3_question: "Do you offer free quotes?",
      faq_3_answer: "Yes! We offer free, no-obligation quotes. After an initial consultation, we'll assess your project needs and provide a detailed estimate so you know exactly what to expect.",
      faq_4_question: "Will I need planning permission for my project?",
      faq_4_answer: "Some projects, such as extensions and loft conversions, may require planning permission, while others fall under permitted development. We can advise on the necessary permissions and help with the process if needed.",
      faq_5_question: "Do you provide a guarantee for your work?",
      faq_5_answer: "Absolutely! We stand by the quality of our craftsmanship and offer guarantees on our work to give you peace of mind. Specific warranties may vary depending on the type of project—just ask us for details.",
      contact_eyebrow: "Contact",
      bottom_cta_headline: "Get in touch",
      bottom_cta_description: "For any inquiries or to explore your vision further, we invite you to contact our professional team using the details below.",
      hero_image: RF_IMG.hero,
      about_image_1: RF_IMG.about1,
      about_image_2: RF_IMG.about2,
      about_image_3: RF_IMG.about3,
      about_image_4: RF_IMG.about4,
      work_1_image: RF_IMG.work1,
      work_2_image: RF_IMG.work2,
      work_3_image: RF_IMG.work3,
      review_1_avatar: RF_IMG.av1,
      review_2_avatar: RF_IMG.av2,
      review_3_avatar: RF_IMG.av3,
    },
  },





  // 3. SaaS landing (LanderX-style dark SaaS)
  {
    id: "saas-startup-2",
    name: "SaaS Startup Template",
    description: "Sleek dark-mode SaaS / startup landing page with a glowing blue hero, social-proof avatars, client logos, benefits grid, wall-of-love testimonials, flexible pricing plans, founder's note and FAQ. Modelled on the LanderX (LanX) design.",
    content: landerxTemplate(),
    variables: ["{headline}", "{subheadline}", "{product_name}", "{cta_text}", "{secondary_cta_text}", "{customers_count}", "{customers_label}", "{benefits_eyebrow}", "{benefits_title}", "{benefits_subtitle}", "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}", "{feature_4_title}", "{feature_4_desc}", "{feature_5_title}", "{feature_5_desc}", "{feature_6_title}", "{feature_6_desc}", "{reviews_eyebrow}", "{reviews_title}", "{reviews_subtitle}", "{review_1_text}", "{review_1_name}", "{review_1_role}", "{review_2_text}", "{review_2_name}", "{review_2_role}", "{review_3_text}", "{review_3_name}", "{review_3_role}", "{review_4_text}", "{review_4_name}", "{review_4_role}", "{review_5_text}", "{review_5_name}", "{review_5_role}", "{review_6_text}", "{review_6_name}", "{review_6_role}", "{pricing_eyebrow}", "{pricing_title}", "{pricing_subtitle}", "{price_period}", "{plan_cta_text}", "{plan_starter_name}", "{price_starter}", "{plan_starter_feature_1}", "{plan_starter_feature_2}", "{plan_starter_feature_3}", "{plan_starter_feature_4}", "{plan_starter_feature_5}", "{plan_pro_badge}", "{plan_pro_name}", "{price_pro}", "{plan_pro_feature_1}", "{plan_pro_feature_2}", "{plan_pro_feature_3}", "{plan_pro_feature_4}", "{plan_pro_feature_5}", "{plan_pro_feature_6}", "{plan_enterprise_name}", "{price_enterprise}", "{plan_enterprise_feature_1}", "{plan_enterprise_feature_2}", "{plan_enterprise_feature_3}", "{plan_enterprise_feature_4}", "{plan_enterprise_feature_5}", "{founder_eyebrow}", "{founder_quote}", "{founder_name}", "{founder_role}", "{faq_eyebrow}", "{faq_title}", "{faq_subtitle}", "{faq_1_question}", "{faq_1_answer}", "{faq_2_question}", "{faq_2_answer}", "{faq_3_question}", "{faq_3_answer}", "{faq_4_question}", "{faq_4_answer}", "{faq_5_question}", "{faq_5_answer}", "{bottom_cta_headline}", "{bottom_cta_description}"],
    category: "saas",
    tags: ["saas", "landing", "startup", "dark", "pricing", "ai"],
    author: "Community", downloads: 1563, rating: 4.9,
    seo_title_pattern: "{headline} | {product_name}",
    seo_description_pattern: "{subheadline}",
    og_title_pattern: "{headline} | {product_name}", og_description_pattern: "{subheadline}", og_image_pattern: "",
    schema_type: "WebPage",
    defaultValues: {
      product_name: "LanderX",
      headline: "Launch your SaaS faster than ever before",
      subheadline: "The all-in-one platform that helps startups ship, scale and convert — with zero engineering overhead.",
      cta_text: "Get Started Free",
      secondary_cta_text: "Book a Demo",
      customers_count: "15,374+",
      customers_label: "other loving customers",
      benefits_eyebrow: "Benefits",
      benefits_title: "Why Choose LanderX?",
      benefits_subtitle: "Innovative tools and powerful insights designed to elevate your business.",
      feature_1_title: "Affordable Pricing",
      feature_1_desc: "Transparent, flexible plans that scale with you — no hidden fees, no surprises.",
      feature_2_title: "Powerful Analytics",
      feature_2_desc: "Track every metric that matters with real-time dashboards and actionable insights.",
      feature_3_title: "Scalable Plans",
      feature_3_desc: "Choose plans that adapt to your business needs, offering unparalleled scalability and cost-effectiveness.",
      feature_4_title: "Secure Transactions",
      feature_4_desc: "Prioritize safety with cutting-edge encryption and robust security features for every interaction.",
      feature_5_title: "Adaptive Systems",
      feature_5_desc: "Leverage AI-driven systems that evolve with your business, ensuring efficiency at every step.",
      feature_6_title: "Dedicated Support",
      feature_6_desc: "Access expert assistance 24/7 to ensure you're never alone on your growth journey.",
      reviews_eyebrow: "Wall of love",
      reviews_title: "Loved by thinkers",
      reviews_subtitle: "Here's what people worldwide are saying about us.",
      review_1_text: "\"Highly intuitive and polished. It's everything we needed and more!\"",
      review_1_name: "Alex Jonas",
      review_1_role: "JS Marketing",
      review_2_text: "\"This is truly incredible and has saved us countless hours!\"",
      review_2_name: "John Robert",
      review_2_role: "SM Strategy",
      review_3_text: "\"Pure brilliance! This has streamlined our workflow massively.\"",
      review_3_name: "Maggie Hue",
      review_3_role: "BS Growth CEO",
      review_4_text: "\"A top-notch solution! It's been transformative for our entire team.\"",
      review_4_name: "Tappo Kao",
      review_4_role: "PO Marketing",
      review_5_text: "\"Amazing product! It's made our processes seamless and effective.\"",
      review_5_name: "Jack Hanma",
      review_5_role: "JK Finance",
      review_6_text: "\"Incredible design and functionality! This has exceeded our expectations.\"",
      review_6_name: "John Robert",
      review_6_role: "JO Strategy",
      pricing_eyebrow: "Pricing & plans",
      pricing_title: "Flexible Pricing Plans",
      pricing_subtitle: "Choose a plan that fits your business needs and unlock the full potential of our platform.",
      price_period: "month",
      plan_cta_text: "Get Started Now",
      plan_starter_name: "Starter",
      price_starter: "$19",
      plan_starter_feature_1: "Unlimited AI usage",
      plan_starter_feature_2: "Premium support",
      plan_starter_feature_3: "Customer care on point",
      plan_starter_feature_4: "Collaboration tools",
      plan_starter_feature_5: "Regular updates",
      plan_pro_badge: "Popular",
      plan_pro_name: "Pro",
      price_pro: "$49",
      plan_pro_feature_1: "Integrations with 3rd-party",
      plan_pro_feature_2: "Advanced analytics",
      plan_pro_feature_3: "Team performance tracking",
      plan_pro_feature_4: "Top grade security",
      plan_pro_feature_5: "Priority customer support",
      plan_pro_feature_6: "Detailed usage reports",
      plan_enterprise_name: "Enterprise",
      price_enterprise: "Custom",
      plan_enterprise_feature_1: "Dedicated account manager",
      plan_enterprise_feature_2: "Custom reports & dashboards",
      plan_enterprise_feature_3: "Tailored onboarding & training",
      plan_enterprise_feature_4: "Customizable API access",
      plan_enterprise_feature_5: "Dedicated success manager",
      founder_eyebrow: "Founder's note",
      founder_quote: "\"We gather your site data. We know your target audience & how your brand can stand out from the crowd. Best part is we also help you with solutions.\"",
      founder_name: "Daniel Carter",
      founder_role: "Co-founder & ex-Google designer",
      faq_eyebrow: "FAQ's section",
      faq_title: "Some Common FAQ's",
      faq_subtitle: "Get answers to your questions and learn about our platform.",
      faq_1_question: "What makes LanderX unique?",
      faq_1_answer: "LanderX is designed to streamline your SaaS or startup's online presence with modern, user-centric design and seamless functionality, ensuring you stand out from competitors.",
      faq_2_question: "Can I customize it to match my brand?",
      faq_2_answer: "Absolutely! Everything is fully customizable, allowing you to change colors, fonts, images, and content to perfectly align with your brand identity.",
      faq_3_question: "Is it optimized for SEO and speed?",
      faq_3_answer: "Yes — built for exceptional performance, fast loading times, and SEO-friendly structure to boost your online visibility.",
      faq_4_question: "Is it mobile-friendly?",
      faq_4_answer: "Yes, fully responsive, ensuring a seamless user experience across desktop, tablet, and mobile devices.",
      faq_5_question: "Can I use this for commercial projects?",
      faq_5_answer: "Yes. You're free to use it for both personal and commercial projects — no attribution required.",
      bottom_cta_headline: "Ready to grow your business?",
      bottom_cta_description: "Join thousands of teams already shipping faster with LanderX. Start your free trial today.",
    },
  },

  // 4. Lums — SEO Landing Page (modelled 1:1 on the Lums Vue/Nuxt SEO template)
  lumsSeoLanding(),







  // 7. Law firm
  nobleLawFirm(),


  // 8. Restaurant
  heavenPalateRestaurant(),

  // 8b. Cleaning service
  ceviraCleaning(),

  // 8c-8f. Framer-modelled designs (Astralab, Powder, Fabrica, Hanzo)
  ...FRAMER_TEMPLATES,

  // Batch 1 — Framer featured clones (Nexa, Lumen, Orbit, Verde, Studio Mono, Pulse)
  ...FRAMER_BATCH1_TEMPLATES,

  // Batch 2 — Framer featured clones (Aurora, Savora, Cira, Nova, Evena, Terra)
  ...FRAMER_BATCH2_TEMPLATES,

  // Batch 3 — Framer featured clones (Sonic, Wander, Bloom, Fade, Roast, Ledger)
  ...FRAMER_BATCH3_TEMPLATES,
  ...FRAMER_BATCH4_TEMPLATES,

  // Batch 5 — Framer featured clones (Estate, Pulse, Stack, Savor, Frame, Learn)
  ...FRAMER_BATCH5_TEMPLATES,

  // Batch 6 — Framer featured clones (Paws, Vow, Azure, Shield, Petal, Hire)
  ...FRAMER_BATCH6_TEMPLATES,

  // Batch 7 — Framer featured clones (Zen, Craft, Build, Quill, Trek, Mint)
  ...FRAMER_BATCH7_TEMPLATES,

  // Batch 8 — Framer featured clones (Drive, Smile, Lush, Spark, Aroma, Pixel)
  ...FRAMER_BATCH8_TEMPLATES,

  // Batch 9 — Framer featured clones (Peak, Ledger, Nest, Savor, Scholar, Journey)
  ...FRAMER_BATCH9_TEMPLATES,

  // Batch 10 — Framer featured clones (Orbit, Aperture, Justice, Glow, Wave, Unity)
  ...FRAMER_BATCH10_TEMPLATES,

  // Batch 11 — Framer featured clones (Pulse, Forge, Bloom, Vault, Roam, Canvas)
  ...FRAMER_BATCH11_TEMPLATES,

  // Batch 12 — Framer featured clones (Summit, Craft, Volt, Harvest, Stage, Thread)
  ...FRAMER_BATCH12_TEMPLATES,

  // Batch 13 — Framer featured clones (Mentor, Clean, PixelPlay, Roast, Insure, Moment)
  ...FRAMER_BATCH13_TEMPLATES,

  // Batch 14 — Framer featured clones (Flex, Build, Paws, Stream, Grow, Hearth)
  ...FRAMER_BATCH14_TEMPLATES,
  ...FRAMER_BATCH15_TEMPLATES,
  ...FRAMER_BATCH16_TEMPLATES,
  ...FRAMER_BATCH17_TEMPLATES,
  ...FRAMER_BATCH18_TEMPLATES,
  ...FRAMER_BATCH19_TEMPLATES,





  // 31. Dentexa — premium dentist landing (modelled on the Dentexa HTML theme)
  {
    id: "dental-studio",
    name: "Dental Studio Template",
    description: "Premium, conversion-focused dentist landing page with a Dentexa-style teal design — hero booking, services, smile gallery, dentist profile, patient reviews, transparent pricing and FAQ. Uses real dental photography throughout.",
    content: dentexaTemplate(),
    variables: [
      "{clinic_name}", "{city}", "{state}", "{phone}", "{email}", "{address}",
      "{clinic_description}", "{doctor_name}", "{doctor_bio}", "{nearby_areas}",
      "{years_experience}", "{patients_count}",
      "{price_checkup}", "{price_whitening}", "{price_aligners}",
    ],
    category: "health",
    tags: ["dental", "dentist", "clinic", "health", "local", "booking", "cosmetic"],
    author: "Community", downloads: 0, rating: 5.0,
    seo_title_pattern: "{clinic_name} — Dentist in {city}, {state} | Book Online",
    seo_description_pattern: "Modern dental care at {clinic_name} in {city}, {state}. Cosmetic, family & emergency dentistry. Call {phone} or book online today.",
    og_title_pattern: "{clinic_name} — Dentist in {city}, {state} | Book Online", og_description_pattern: "Modern dental care at {clinic_name} in {city}, {state}. Cosmetic, family & emergency dentistry. Call {phone} or book online today.", og_image_pattern: "",
    schema_type: "Dentist",
  },

  // 32. Consulting — business consulting landing (modelled on consulting.framer.media)
  {
    id: "consulting-agency",
    name: "Consulting Agency Template",
    description: "Clean, professional business consulting landing page — bold hero ('Grow your business faster'), trusted-by logos, services grid, about split, results stats, client testimonials, FAQ and contact. Modelled on the consulting.framer.media design.",
    content: consultingTemplate(),
    variables: [
      "{headline}", "{subheadline}", "{company_name}", "{cta_text}",
      "{years_experience}", "{clients_count}", "{success_rate}",
      "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}",
      "{service_3_title}", "{service_3_desc}", "{about_body}",
      "{bottom_cta_headline}", "{bottom_cta_description}",
      "{phone}", "{email}", "{address}",
    ],
    category: "professional",
    tags: ["consulting", "business", "agency", "strategy", "corporate", "services"],
    author: "Community", downloads: 0, rating: 5.0,
    seo_title_pattern: "{company_name} — Business Consulting | {headline}",
    seo_description_pattern: "{subheadline} Work with {company_name} to grow your business. Call {phone}.",
    og_title_pattern: "{company_name} — Business Consulting | {headline}", og_description_pattern: "{subheadline} Work with {company_name} to grow your business. Call {phone}.", og_image_pattern: "",
    schema_type: "WebPage",
  },

  // 33. Gardener — landscaping & garden service landing (modelled on gardener.framer.media)
  {
    id: "landscaping",
    name: "Landscaping Template",
    description: "Beautiful gardening & landscaping landing page — full-bleed hero with a glass booking form, about split, services gallery, FAQ, recent works grid, customer reviews, blog highlights and a closing CTA. Modelled 1:1 on the gardener.framer.media design with real photography.",
    content: gardenerTemplate(),
    variables: [
      "{company_name}", "{headline}", "{subheadline}", "{cta_text}", "{phone}", "{booking_title}",
      "{ratings_count}", "{rating_value}",
      "{about_eyebrow}", "{about_title}", "{about_body}", "{feature_1}", "{feature_2}", "{feature_3}",
      "{services_eyebrow}", "{services_title}", "{services_subtitle}",
      "{service_1_title}", "{service_2_title}", "{service_3_title}",
      "{faq_eyebrow}", "{faq_title}",
      "{faq_1_question}", "{faq_1_answer}", "{faq_2_question}", "{faq_2_answer}", "{faq_3_question}", "{faq_3_answer}",
      "{works_eyebrow}", "{works_title}", "{works_subtitle}",
      "{reviews_eyebrow}",
      "{review_1_text}", "{review_1_name}", "{review_2_text}", "{review_2_name}",
      "{review_3_text}", "{review_3_name}", "{review_4_text}", "{review_4_name}",
      "{blog_eyebrow}", "{blog_title}", "{blog_subtitle}", "{post_1_title}", "{post_2_title}", "{post_3_title}",
      "{bottom_cta_headline}", "{bottom_cta_description}",
    ],
    category: "professional",
    tags: ["gardener", "landscaping", "garden", "lawn", "outdoor", "local", "booking"],
    author: "Community", downloads: 0, rating: 5.0,
    seo_title_pattern: "{company_name} — Garden & Landscaping | {headline}",
    seo_description_pattern: "{subheadline} Book your free appointment with {company_name}. Call {phone}.",
    og_title_pattern: "{company_name} — Garden & Landscaping | {headline}", og_description_pattern: "{subheadline} Book your free appointment with {company_name}. Call {phone}.", og_image_pattern: "",
    schema_type: "LocalBusiness",
    defaultValues: {
      company_name: "Gardener",
      headline: "Your Outdoor Space, Rebuilt",
      subheadline: "With our expert team of gardeners and landscapers, we turn ordinary gardens into extraordinary havens of beauty.",
      cta_text: "Book Your Call",
      phone: "(595) 555-0123",
      booking_title: "Book Your Free Appointment",
      ratings_count: "2000+",
      rating_value: "4.9",
      about_eyebrow: "About Us",
      about_title: "Build a Space That Matches Your Home",
      about_body: "Whether you have a sprawling backyard or a cozy balcony, our team of experienced gardeners and landscapers is dedicated to bringing your green dreams to life.",
      feature_1: "Sustainable Gardening Practices",
      feature_2: "Personalized Services Available",
      feature_3: "Available Monday to Friday, 9am to 5pm",
      services_eyebrow: "Our Services",
      services_title: "Our Services",
      services_subtitle: "Our team combines expertise with creativity to transform outdoor spaces into breathtaking landscapes that enhance the beauty of any property.",
      service_1_title: "Landscaping Works",
      service_2_title: "Garden Design",
      service_3_title: "Seasonal Planting",
      faq_eyebrow: "FAQ",
      faq_title: "Frequently asked questions",
      faq_1_question: "Do you offer maintenance services?",
      faq_1_answer: "Yes, we provide comprehensive landscape maintenance services to keep your garden looking its best year-round. We offer tailored maintenance plans to suit your schedule and budget.",
      faq_2_question: "Do you use organic gardening methods?",
      faq_2_answer: "Absolutely. We prioritise sustainable, organic practices that protect your soil, plants and local wildlife while keeping your garden thriving.",
      faq_3_question: "Are your gardeners licensed and insured?",
      faq_3_answer: "Yes, every member of our team is fully licensed and insured, so you can have complete peace of mind throughout your project.",
      review_1_text: "Despite the tight deadline, they completed the project on time and within budget, exceeding my expectations every step of the way. I highly recommend!",
      review_1_name: "Alex Stokes",
      review_2_text: "I'm so grateful to have found Gardener. Their team not only transformed my neglected garden into a lush oasis but also provided great advice on how to maintain it.",
      review_2_name: "John Smith",
      review_3_text: "I've been using Gardener for years now, and I couldn't be happier with the results. Their team always go above and beyond to ensure that my garden looks its best.",
      review_3_name: "Michael Harrison",
      review_4_text: "Gardener completely exceeded my expectations. From the initial consultation to the final touches, their team was professional and attentive to every detail.",
      review_4_name: "David Peterson",
      works_eyebrow: "Our Recent Works",
      works_title: "A reflection of our clients' vision",
      works_subtitle: "We take a personalized approach to every project, ensuring each garden reflects our client's unique vision and lifestyle.",
      reviews_eyebrow: "Loved By Our Customers",
      blog_eyebrow: "Explore Our Blog",
      blog_title: "Explore Our Blog",
      blog_subtitle: "Whether you're a seasoned gardener or just getting started, our blog is your go-to resource for all things gardening.",
      post_1_title: "The Art of Designing Gardens: A Detailed Step-by-Step Guide",
      post_2_title: "Plant Spotlight: 10 Must-Have Perennials for Every Garden",
      post_3_title: "Garden Pest Control: Useful Strategies for a Healthy Garden",
      bottom_cta_headline: "Need a Gardener?",
      bottom_cta_description: "Let our expert team rebuild your outdoor space into a beautiful, thriving garden. Request your free quote today.",
    },
  },
];

// Universal responsive safety-net. Every marketplace template ships with its
// own media queries, but this guarantees that ALL designs collapse gracefully
// to a fluid single-column (flex/grid container) layout on tablets and phones,
// never overflow horizontally, and keep media fully fluid — regardless of the
// per-template class prefix (pgp-, lums-, nbl-, hp-, cv-, es-, dxa-, …).
const RESPONSIVE_SAFETY_NET = `
<style data-responsive-global>
*,*::before,*::after{box-sizing:border-box}
img,svg,video,iframe,canvas{max-width:100%;height:auto}
[data-responsive-global] ~ *{overflow-wrap:break-word;word-break:break-word}
@media(max-width:992px){
  [class*="grid-4"],[class*="grid4"],[class*="grid-3"],[class*="grid3"]{grid-template-columns:repeat(2,1fr)!important}
}
@media(max-width:768px){
  [class*="grid"],[class*="split"],[class*="cols"],[class*="-row"],[class*="hero-grid"],[class*="contact"],[class*="feat"],[class*="svc"],[class*="proc"],[class*="revs"],[class*="cards"],[class*="cats"],[class*="stats"]{grid-template-columns:1fr!important}
  [class*="carousel"],[class*="scroller"]{flex-wrap:wrap!important}
  [class*="hero"]{min-height:auto!important}
}
@media(max-width:640px){
  [class*="grid"],[class*="split"],[class*="price"],[class*="plan"],[class*="gallery"],[class*="gal"],[class*="tgrid"],[class*="sgrid"],[class*="bgrid"],[class*="stats"]{grid-template-columns:1fr!important}
}
/* Fluid, perfectly responsive typography — scales smoothly phone→tablet→desktop */
[data-responsive-global] ~ * h1,[data-responsive-global] ~ h1{font-size:clamp(1.9rem,1.2rem + 3.2vw,3.6rem)!important;line-height:1.1!important}
[data-responsive-global] ~ * h2,[data-responsive-global] ~ h2{font-size:clamp(1.55rem,1.05rem + 2.2vw,2.6rem)!important;line-height:1.15!important}
[data-responsive-global] ~ * h3,[data-responsive-global] ~ h3{font-size:clamp(1.25rem,0.95rem + 1.3vw,1.8rem)!important;line-height:1.2!important}
[data-responsive-global] ~ * h4,[data-responsive-global] ~ h4{font-size:clamp(1.05rem,0.9rem + 0.7vw,1.35rem)!important}
[data-responsive-global] ~ * p,[data-responsive-global] ~ * li,[data-responsive-global] ~ p{font-size:clamp(0.95rem,0.9rem + 0.25vw,1.08rem)!important;line-height:1.65}
@media(max-width:640px){
  [data-responsive-global] ~ * section,[data-responsive-global] ~ section{padding-left:1rem!important;padding-right:1rem!important}
}
</style>`;

const ensureResponsive = (content: string): string =>
  content.includes("data-responsive-global") ? content : RESPONSIVE_SAFETY_NET + content;

// Final catalog: each template gets a derived `platform` and, for WordPress /
// Shopify / PrestaShop entries, a platform-native re-skin + wrapper classes so
// they look and publish natively on their target CMS.
// Guard against duplicate template IDs or slug patterns when registering batches.
// Keeps the FIRST occurrence and warns about any conflicts so they can be fixed.
function dedupeTemplates(templates: MarketplaceTemplate[]): MarketplaceTemplate[] {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const out: MarketplaceTemplate[] = [];
  for (const t of templates) {
    if (seenIds.has(t.id)) {
      console.warn(`[marketplace] Duplicate template id skipped: "${t.id}"`);
      continue;
    }
    if (t.slug_pattern && seenSlugs.has(t.slug_pattern)) {
      console.warn(`[marketplace] Duplicate slug_pattern on "${t.id}": "${t.slug_pattern}"`);
    }
    seenIds.add(t.id);
    if (t.slug_pattern) seenSlugs.add(t.slug_pattern);
    out.push(t);
  }
  return out;
}

export const COMMUNITY_TEMPLATES: MarketplaceTemplate[] = dedupeTemplates(RAW_COMMUNITY_TEMPLATES)
  .map((t) => {
    const platform = platformFromCategory(t.category);
    const base =
      platform === "generic"
        ? { ...t, platform }
        : { ...t, platform, content: applyPlatformTheme(t.content, platform) };
    return { ...base, content: ensureResponsive(base.content) };
  });
