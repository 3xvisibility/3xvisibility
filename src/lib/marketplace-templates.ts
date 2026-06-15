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
  schema_type?: string;
  /** Target CMS this template is designed + themed for. Derived from category. */
  platform?: "wordpress" | "shopify" | "prestashop" | "generic";
  isShared?: boolean;
  shared_id?: string;
  /** Sensible default values used to fill {variables} in the preview so no section looks empty. */
  defaultValues?: Record<string, string>;
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
  <div class="dxa-top"><div class="dxa-wrap">
    <span class="dxa-ti">😀 Welcome to <b>{clinic_name}</b> — Best Quality Dental Care</span>
    <span class="dxa-ti">📞 <b>{phone}</b> &nbsp; ✉️ {email}</span>
  </div></div>

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
  <nav class="con-nav"><div class="bar">
    <div class="logo"><span class="dot"></span>{company_name}</div>
    <div class="links"><a href="#home">Home</a><a href="#about">About</a><a href="#services">Services</a><a href="#process">Process</a></div>
    <a href="#contact" class="pill">Contact</a>
  </div></nav>

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
  <nav class="gd-nav"><div class="bar">
    <div class="logo"><span class="dot">🌿</span>{company_name}</div>
    <div class="links"><a href="#home">Home</a><a href="#about">About</a><a href="#services">Services</a><a href="#blog">Blog</a><a href="#contact">Contact</a></div>
    <a href="#contact" class="pill">{cta_text}</a>
  </div></nav>

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

// ── Templates ──────────────────────────────────────────────────────────────
const RAW_COMMUNITY_TEMPLATES: MarketplaceTemplate[] = [
  // 1. Local Plumber
  {
    id: "local-plumber",
    name: "Local Plumber Landing",
    description: "High-converting landing page for local plumbing services with hero image, services, testimonials and FAQ.",
    content: page(
      hero({ bgKeywords: "plumber working pipes professional", badge: "⭐ Trusted in {city}", title: "{company_name} — {service} in {city}", subtitle: "Trusted plumbing experts serving {city} and the greater {state} area. Fast response, honest pricing, guaranteed satisfaction.", primaryCta: "📞 Call {phone}", secondaryCta: "Get Free Estimate" }) +
      trustStrip([{ num: "{years_experience}+", lbl: "Years Experience" }, { num: "5★", lbl: "Average Rating" }, { num: "24/7", lbl: "Emergency" }, { num: "100%", lbl: "Satisfaction" }]) +
      featureGrid("Why us", "Why {city} chooses {company_name}", "Reliable, licensed and insured plumbers serving the community.", [
        { icon: "⚡", title: "Same-day service", desc: "Emergency? We arrive within hours, not days. Available 24/7 across {city}." },
        { icon: "💰", title: "Transparent pricing", desc: "Free estimates upfront. No hidden fees, no surprise charges on your bill." },
        { icon: "🛡️", title: "Licensed & insured", desc: "Fully certified professionals with {years_experience}+ years experience in {state}." },
      ]) +
      aboutSplit("About us", "Family-owned plumbing experts", "{service_description}", "plumbing service technician", 6) +
      gallery("Our work", "Recent projects in {city}", ["plumbing repair", "bathroom installation", "kitchen plumbing", "water heater", "pipe leak repair", "modern bathroom"]) +
      defaultTestimonials +
      faq([
        { q: "Do you offer emergency service?", a: "Yes — we operate 24/7 across {city} and {nearby_cities}. Call us anytime." },
        { q: "Are estimates really free?", a: "Always. We never charge for an estimate or inspection." },
        { q: "Are you licensed and insured?", a: "Fully licensed in {state} and insured for both residential and commercial work." },
      ]) +
      ctaBand({ bgKeywords: "plumber tools dark", title: "Need {service} in {city}?", subtitle: "Serving {city}, {nearby_cities} and all of {state}. Available 24/7.", cta: "📞 Call {phone} now", sig: 11 }) +
      contactSection([
        { icon: "📞", label: "Phone", value: "{phone}" },
        { icon: "📍", label: "Service area", value: "{city}, {state}" },
        { icon: "🕐", label: "Hours", value: "24/7 Emergency" },
      ])
    ),
    variables: ["{company_name}", "{service}", "{city}", "{state}", "{phone}", "{service_description}", "{nearby_cities}", "{years_experience}"],
    category: "local-seo",
    tags: ["plumbing", "local", "services", "landing"],
    author: "Community", downloads: 1247, rating: 4.8,
    seo_title_pattern: "{service} in {city}, {state} | {company_name}",
    seo_description_pattern: "Professional {service} in {city}, {state}. Call {company_name} at {phone} for fast, reliable service.",
    schema_type: "LocalBusiness",
  },

  // 2. E-commerce Product
  {
    id: "product-page",
    name: "E-Commerce Product Page",
    description: "Premium product detail page with hero image, features, testimonials, and gallery.",
    content: page(
      hero({ bgKeywords: "{category} product premium studio", badge: "✨ {category}", title: "{product_name}", subtitle: "{description}", primaryCta: "🛒 Buy now — {price}", secondaryCta: "Add to wishlist", sig: 2 }) +
      trustStrip([{ num: "4.9★", lbl: "Customer Rating" }, { num: "10K+", lbl: "Happy Buyers" }, { num: "30-Day", lbl: "Returns" }, { num: "Free", lbl: "Shipping" }]) +
      featureGrid("Why you'll love it", "Designed with care, built to last", "{features}", [
        { icon: "🎯", title: "Premium quality", desc: "Crafted from carefully sourced materials for lasting performance." },
        { icon: "🚚", title: "Free shipping", desc: "On orders over $50 — delivered to your door in 2–5 business days." },
        { icon: "↩️", title: "Easy returns", desc: "Not a perfect fit? Send it back within 30 days, no questions asked." },
      ]) +
      aboutSplit("Product story", "More than just a {category}", "{long_description}", "{category} lifestyle product", 7) +
      gallery("Gallery", "See it in action", ["{category} closeup", "{category} lifestyle", "{category} detail", "{category} packaging", "{category} unboxing", "{category} use"]) +
      defaultTestimonials +
      faq([
        { q: "What's included in the box?", a: "Each {product_name} ships with full accessories, a quick-start guide and our warranty card." },
        { q: "How long does shipping take?", a: "Standard delivery is 2–5 business days. Expedited options are available at checkout." },
        { q: "What's your return policy?", a: "30-day no-questions-asked returns. We even cover the return shipping." },
      ]) +
      ctaBand({ bgKeywords: "premium {category} hero", title: "Ready to upgrade?", subtitle: "Join thousands of happy customers who chose {product_name}.", cta: "🛒 Buy now — {price}", sig: 12 })
    ),
    variables: ["{product_name}", "{category}", "{price}", "{compare_price}", "{discount}", "{description}", "{features}", "{long_description}"],
    category: "ecommerce",
    tags: ["product", "shop", "ecommerce"],
    author: "Community", downloads: 892, rating: 4.6,
    seo_title_pattern: "{product_name} — Buy Online | {category}",
    seo_description_pattern: "{description}",
    schema_type: "Product",
  },

  // 3. SaaS landing (LanderX-style dark SaaS)
  {
    id: "saas-landing",
    name: "LanderX SaaS Startup",
    description: "Sleek dark-mode SaaS / startup landing page with a glowing blue hero, social-proof avatars, client logos, benefits grid, wall-of-love testimonials, flexible pricing plans, founder's note and FAQ. Modelled on the LanderX (LanX) design.",
    content: landerxTemplate(),
    variables: ["{headline}", "{subheadline}", "{product_name}", "{cta_text}", "{secondary_cta_text}", "{customers_count}", "{customers_label}", "{benefits_eyebrow}", "{benefits_title}", "{benefits_subtitle}", "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}", "{feature_4_title}", "{feature_4_desc}", "{feature_5_title}", "{feature_5_desc}", "{feature_6_title}", "{feature_6_desc}", "{reviews_eyebrow}", "{reviews_title}", "{reviews_subtitle}", "{review_1_text}", "{review_1_name}", "{review_1_role}", "{review_2_text}", "{review_2_name}", "{review_2_role}", "{review_3_text}", "{review_3_name}", "{review_3_role}", "{review_4_text}", "{review_4_name}", "{review_4_role}", "{review_5_text}", "{review_5_name}", "{review_5_role}", "{review_6_text}", "{review_6_name}", "{review_6_role}", "{pricing_eyebrow}", "{pricing_title}", "{pricing_subtitle}", "{price_period}", "{plan_cta_text}", "{plan_starter_name}", "{price_starter}", "{plan_starter_feature_1}", "{plan_starter_feature_2}", "{plan_starter_feature_3}", "{plan_starter_feature_4}", "{plan_starter_feature_5}", "{plan_pro_badge}", "{plan_pro_name}", "{price_pro}", "{plan_pro_feature_1}", "{plan_pro_feature_2}", "{plan_pro_feature_3}", "{plan_pro_feature_4}", "{plan_pro_feature_5}", "{plan_pro_feature_6}", "{plan_enterprise_name}", "{price_enterprise}", "{plan_enterprise_feature_1}", "{plan_enterprise_feature_2}", "{plan_enterprise_feature_3}", "{plan_enterprise_feature_4}", "{plan_enterprise_feature_5}", "{founder_eyebrow}", "{founder_quote}", "{founder_name}", "{founder_role}", "{faq_eyebrow}", "{faq_title}", "{faq_subtitle}", "{faq_1_question}", "{faq_1_answer}", "{faq_2_question}", "{faq_2_answer}", "{faq_3_question}", "{faq_3_answer}", "{faq_4_question}", "{faq_4_answer}", "{faq_5_question}", "{faq_5_answer}", "{bottom_cta_headline}", "{bottom_cta_description}"],
    category: "saas",
    tags: ["saas", "landing", "startup", "dark", "pricing", "ai"],
    author: "Community", downloads: 1563, rating: 4.9,
    seo_title_pattern: "{headline} | {product_name}",
    seo_description_pattern: "{subheadline}",
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

  // 4. SEO Blog post
  {
    id: "blog-post",
    name: "SEO Blog Post",
    description: "Magazine-style blog post with hero image, structured sections and author bio.",
    content: page(
      hero({ bgKeywords: "{category} editorial photography", badge: "{category}", title: "{title}", subtitle: "{intro_paragraph}", primaryCta: "Read article ↓", sig: 4 }) +
      `<section class="pgp-section">
        <div style="max-width:760px;margin:0 auto">
          <div style="display:flex;align-items:center;gap:1rem;padding:1rem 0 1.5rem;border-bottom:1px solid rgba(128,128,128,.15);margin-bottom:2rem">
            <img src="${avatar(11)}" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover"/>
            <div><strong style="display:block">{author_name}</strong><span style="font-size:.85rem;opacity:.65">{publish_date} · 📖 {read_time} min read</span></div>
          </div>
          <div style="background:rgba(128,128,128,.05);border:1px solid rgba(128,128,128,.14);padding:1.5rem;border-radius:14px;margin-bottom:2.5rem">
            <strong style="font-size:.92rem">📋 In this article</strong>
            <ol style="margin:.75rem 0 0 1.25rem;line-height:2;font-size:.95rem">
              <li>{section_1_title}</li><li>{section_2_title}</li><li>{section_3_title}</li>
            </ol>
          </div>
          <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:1rem">{section_1_title}</h2>
          <p style="line-height:1.9;opacity:.86;margin-bottom:2rem">{section_1_content}</p>
          <img src="${img("{category} illustration", 1200, 600, 14)}" alt="" loading="lazy" style="width:100%;border-radius:14px;margin-bottom:2rem"/>
          <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:1rem">{section_2_title}</h2>
          <p style="line-height:1.9;opacity:.86;margin-bottom:2rem">{section_2_content}</p>
          <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:1rem">{section_3_title}</h2>
          <p style="line-height:1.9;opacity:.86;margin-bottom:2rem">{section_3_content}</p>
          <div class="pgp-card" style="display:flex;gap:1.25rem;align-items:center;margin-top:3rem">
            <img src="${avatar(11)}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0"/>
            <div><strong>{author_name}</strong><p style="font-size:.9rem;opacity:.75;margin-top:.25rem;line-height:1.6">{author_bio}</p></div>
          </div>
        </div>
      </section>` +
      defaultTestimonials
    ),
    variables: ["{title}", "{category}", "{author_name}", "{publish_date}", "{read_time}", "{intro_paragraph}", "{section_1_title}", "{section_1_content}", "{section_2_title}", "{section_2_content}", "{section_3_title}", "{section_3_content}", "{author_bio}"],
    category: "marketing",
    tags: ["blog", "content", "seo", "article"],
    author: "Community", downloads: 2108, rating: 4.7,
    seo_title_pattern: "{title} | {category}",
    seo_description_pattern: "{intro_paragraph}",
    schema_type: "Article",
  },

  // 5. Dental clinic
  {
    id: "dental-clinic",
    name: "Dental Clinic Location",
    description: "Modern dental practice page with services, doctor profile, gallery and booking CTA.",
    content: page(
      hero({ bgKeywords: "dental clinic modern bright", badge: "🦷 Trusted dental care", title: "{clinic_name} — Your dentist in {city}", subtitle: "Comprehensive dental care for the whole family in {city}, {state}. Gentle, modern dentistry you can trust.", primaryCta: "📞 Call {phone}", secondaryCta: "Book Online", sig: 5 }) +
      trustStrip([{ num: "15+", lbl: "Years Experience" }, { num: "5K+", lbl: "Patients" }, { num: "4.9★", lbl: "Patient Rating" }, { num: "100%", lbl: "Insurance Friendly" }]) +
      featureGrid("Our services", "Dental services in {city}", "Everything you need to keep your family smiling.", [
        { icon: "😁", title: "General dentistry", desc: "Cleanings, fillings, and preventive care for healthy smiles." },
        { icon: "✨", title: "Cosmetic dentistry", desc: "Whitening, veneers and smile makeovers for a confident you." },
        { icon: "🔧", title: "Restorative", desc: "Crowns, bridges and implants to restore your smile's function." },
      ]) +
      aboutSplit("Meet your doctor", "Dr. {doctor_name}", "{doctor_bio}", "dentist doctor friendly portrait", 6) +
      gallery("Our clinic", "A modern, calming environment", ["dental office reception", "dentist chair modern", "dental tools sterile", "happy patient smile", "dental hygiene", "dental xray clean"]) +
      defaultTestimonials +
      faq([
        { q: "Do you accept insurance?", a: "Yes — we accept most major dental insurance plans. Contact us to verify your coverage." },
        { q: "Do you offer emergency appointments?", a: "Same-day emergency appointments are available. Call {phone} immediately." },
        { q: "Is sedation dentistry available?", a: "Yes, for nervous patients we offer multiple safe sedation options." },
      ]) +
      ctaBand({ bgKeywords: "dental smile bright clean", title: "Ready for a healthier smile?", subtitle: "Book your appointment at {clinic_name} in {city} today.", cta: "📞 Call {phone}", sig: 15 }) +
      contactSection([
        { icon: "📞", label: "Phone", value: "{phone}" },
        { icon: "📍", label: "Address", value: "{address}" },
        { icon: "🕐", label: "Hours", value: "Mon–Fri 9am–6pm" },
      ])
    ),
    variables: ["{clinic_name}", "{city}", "{state}", "{phone}", "{address}", "{services_list}", "{doctor_name}", "{doctor_bio}", "{nearby_areas}"],
    category: "health",
    tags: ["dental", "clinic", "local", "health"],
    author: "Community", downloads: 734, rating: 4.5,
    seo_title_pattern: "{clinic_name} — Dentist in {city}, {state}",
    seo_description_pattern: "Visit {clinic_name} for quality dental care in {city}. Call {phone} to book.",
    schema_type: "LocalBusiness",
  },

  // 6. Online course
  {
    id: "course-landing",
    name: "Online Course Landing",
    description: "Conversion-focused online course landing with hero, curriculum, instructor and FAQ.",
    content: page(
      hero({ bgKeywords: "online learning student laptop", badge: "{category}", title: "{course_title}", subtitle: "{course_subtitle}", primaryCta: "Enroll now — {price}", secondaryCta: "Watch Preview", sig: 6 }) +
      trustStrip([{ num: "{lessons_count}", lbl: "Lessons" }, { num: "{duration}", lbl: "Total Duration" }, { num: "4.9★", lbl: "Average Rating" }, { num: "2K+", lbl: "Students" }]) +
      featureGrid("Curriculum", "What you'll learn", "{learning_outcomes}", [
        { icon: "🎯", title: "Clear outcomes", desc: "Every lesson is built around a measurable skill you'll walk away with." },
        { icon: "🎬", title: "HD video lessons", desc: "Watch on any device, at your own pace, with downloadable resources." },
        { icon: "📜", title: "Certificate", desc: "Earn a verified certificate of completion to share on LinkedIn or your CV." },
      ]) +
      aboutSplit("Your instructor", "{instructor_name}", "{instructor_bio}", "professional teacher instructor", 7) +
      gallery("Inside the course", "A peek at what's included", ["online course video", "study laptop", "students learning", "online classroom", "certificate diploma", "study notes"]) +
      defaultTestimonials +
      faq([
        { q: "Do I get lifetime access?", a: "Yes — once enrolled, you keep access forever, including all future updates." },
        { q: "Is there a money-back guarantee?", a: "30-day no-questions-asked refund if it isn't right for you." },
        { q: "Do I need any prior experience?", a: "The course is designed to take you from {level} to confident practitioner." },
      ]) +
      ctaBand({ bgKeywords: "graduation success celebration", title: "Start learning today", subtitle: "Join thousands of students already enrolled in {course_title}.", cta: "Enroll now — {price}", sig: 16 })
    ),
    variables: ["{course_title}", "{course_subtitle}", "{category}", "{lessons_count}", "{duration}", "{level}", "{price}", "{learning_outcomes}", "{instructor_name}", "{instructor_bio}"],
    category: "education",
    tags: ["course", "education", "landing", "online"],
    author: "Community", downloads: 956, rating: 4.7,
    seo_title_pattern: "{course_title} — Online Course | {category}",
    seo_description_pattern: "{course_subtitle}. {lessons_count} lessons, {duration}.",
    schema_type: "Course",
  },

  // 7. Law firm
  {
    id: "law-firm",
    name: "Law Firm Practice Area",
    description: "Authoritative law firm page with hero, results, testimonials and free consultation CTA.",
    content: page(
      hero({ bgKeywords: "law firm office books professional", badge: "⚖️ Experienced legal counsel", title: "{practice_area} attorney in {city}", subtitle: "{firm_name} — experienced {practice_area} lawyers protecting your rights in {city}, {state}.", primaryCta: "Free Consultation — {phone}", secondaryCta: "Our Results", sig: 7 }) +
      trustStrip([{ num: "{years_experience}+", lbl: "Years Experience" }, { num: "{cases_won}+", lbl: "Cases Won" }, { num: "5★", lbl: "Client Rating" }, { num: "$0", lbl: "Unless We Win" }]) +
      featureGrid("How we help", "{practice_area} legal services", "{practice_description}", [
        { icon: "🏛️", title: "Proven track record", desc: "{cases_won}+ successful outcomes in {practice_area} cases across {state}." },
        { icon: "🤝", title: "Personal attention", desc: "Direct access to your attorney. No runaround, no junior associates." },
        { icon: "💼", title: "No fee unless we win", desc: "Contingency-based representation. You pay nothing upfront." },
      ]) +
      aboutSplit("About the firm", "{firm_name}", "Founded with a single mission: to provide every client with the same quality of representation that big-firm clients receive — without the big-firm price tag.", "lawyer office portrait professional", 8) +
      defaultTestimonials +
      faq([
        { q: "Is the consultation really free?", a: "Yes — your initial case review is 100% free with no obligation." },
        { q: "How long do these cases take?", a: "Every case is unique, but we'll give you a realistic timeline at your free consultation." },
        { q: "Do you handle cases outside {city}?", a: "We serve clients throughout {state}." },
      ]) +
      ctaBand({ bgKeywords: "courthouse justice scales", title: "Get your free {practice_area} consultation", subtitle: "Serving {city}, {state} and surrounding communities. Available 24/7 for emergencies.", cta: "📞 Call {phone}", sig: 17 }) +
      contactSection([
        { icon: "📞", label: "Phone", value: "{phone}" },
        { icon: "📍", label: "Office", value: "{city}, {state}" },
        { icon: "💬", label: "Free", value: "Case Review" },
      ])
    ),
    variables: ["{practice_area}", "{city}", "{state}", "{firm_name}", "{phone}", "{practice_description}", "{years_experience}", "{cases_won}"],
    category: "professional",
    tags: ["law", "attorney", "legal", "professional"],
    author: "Community", downloads: 621, rating: 4.4,
    seo_title_pattern: "{practice_area} Lawyer in {city}, {state} | {firm_name}",
    seo_description_pattern: "Experienced {practice_area} attorney in {city}. Call {phone} for a free consultation.",
    schema_type: "LocalBusiness",
  },

  // 8. Restaurant
  {
    id: "restaurant-local",
    name: "Restaurant Location Page",
    description: "Mouth-watering restaurant page with hero, menu highlights, gallery, testimonials and reservations.",
    content: page(
      hero({ bgKeywords: "{cuisine_type} restaurant fine dining ambient", badge: "🍽️ Fine dining in {city}", title: "{restaurant_name}", subtitle: "{cuisine_type} cuisine crafted with passion in {city}, {state}.", primaryCta: "Reserve a Table", secondaryCta: "View Menu", sig: 8 }) +
      trustStrip([{ num: "4.9★", lbl: "Diner Rating" }, { num: "1K+", lbl: "Reviews" }, { num: "{cuisine_type}", lbl: "Cuisine" }, { num: "Daily", lbl: "Fresh" }]) +
      featureGrid("Specialties", "Signature dishes", "Crafted by our chef using locally-sourced ingredients.", [
        { icon: "🥩", title: "{dish_1}", desc: "{dish_1_desc}" },
        { icon: "🍝", title: "{dish_2}", desc: "{dish_2_desc}" },
        { icon: "🍰", title: "{dish_3}", desc: "{dish_3_desc}" },
      ]) +
      aboutSplit("Our story", "Passion on every plate", "Born from a love of {cuisine_type} cuisine and a commitment to fresh, seasonal ingredients. {restaurant_name} brings authentic flavors to the heart of {city}.", "chef cooking restaurant kitchen", 9) +
      gallery("Gallery", "A taste of the experience", ["{cuisine_type} food plating", "restaurant interior cozy", "chef cooking", "wine glass dinner", "dessert plate", "restaurant table candle"]) +
      defaultTestimonials +
      faq([
        { q: "Do you take reservations?", a: "Yes — call {phone} or book online. Walk-ins welcome based on availability." },
        { q: "Is there a dress code?", a: "Smart casual — come comfortable, dine elegantly." },
        { q: "Do you cater for dietary needs?", a: "Absolutely — vegan, gluten-free and allergy options available. Just let us know." },
      ]) +
      ctaBand({ bgKeywords: "dinner table elegant restaurant", title: "Reserve your table at {restaurant_name}", subtitle: "📞 Call {phone} or book online. Walk-ins welcome.", cta: "Make a Reservation", sig: 18 }) +
      contactSection([
        { icon: "📞", label: "Phone", value: "{phone}" },
        { icon: "📍", label: "Address", value: "{address}" },
        { icon: "🕐", label: "Hours", value: "{hours}" },
      ])
    ),
    variables: ["{restaurant_name}", "{cuisine_type}", "{city}", "{state}", "{address}", "{hours}", "{phone}", "{dish_1}", "{dish_1_desc}", "{dish_2}", "{dish_2_desc}", "{dish_3}", "{dish_3_desc}"],
    category: "local-seo",
    tags: ["restaurant", "food", "local", "dining"],
    author: "Community", downloads: 1034, rating: 4.7,
    seo_title_pattern: "{restaurant_name} — {cuisine_type} Restaurant in {city}",
    seo_description_pattern: "Enjoy {cuisine_type} dining at {restaurant_name} in {city}, {state}. Reservations: {phone}.",
    schema_type: "Restaurant",
  },

  // 9. Real estate
  {
    id: "real-estate-listing",
    name: "Real Estate Property Listing",
    description: "Beautiful property listing with hero image, gallery, neighborhood info and agent contact.",
    content: page(
      hero({ bgKeywords: "{property_type} luxury home exterior", badge: "🏠 {property_type} for sale", title: "{property_title}", subtitle: "{address}, {city}, {state} {zip_code} — {price}", primaryCta: "📞 {agent_phone}", secondaryCta: "Schedule a Tour", sig: 9 }) +
      trustStrip([{ num: "{bedrooms}", lbl: "Bedrooms" }, { num: "{bathrooms}", lbl: "Bathrooms" }, { num: "{sqft}", lbl: "Sq. Ft." }, { num: "{year_built}", lbl: "Year Built" }]) +
      aboutSplit("Property overview", "{property_title}", "{description}", "luxury home interior bright", 10) +
      gallery("Gallery", "Inside this home", ["luxury living room", "modern kitchen", "master bedroom", "luxury bathroom", "backyard garden", "home exterior front"]) +
      featureGrid("Features", "Features & amenities", "{features}", [
        { icon: "🛋️", title: "Modern interior", desc: "Open-concept living spaces with high ceilings and natural light throughout." },
        { icon: "🌳", title: "Outdoor living", desc: "Landscaped garden and patio — perfect for entertaining all year round." },
        { icon: "📍", title: "Prime location", desc: "Walkable neighborhood close to schools, parks and downtown {city}." },
      ]) +
      aboutSplit("Neighborhood", "About {city}", "{neighborhood_info}", "{city} neighborhood street", 11) +
      ctaBand({ bgKeywords: "real estate keys home", title: "Interested in this property?", subtitle: "Contact {agent_name} for a private showing.", cta: "📞 Call {agent_phone}", sig: 19 })
    ),
    variables: ["{property_title}", "{property_type}", "{address}", "{city}", "{state}", "{zip_code}", "{price}", "{bedrooms}", "{bathrooms}", "{sqft}", "{year_built}", "{description}", "{features}", "{neighborhood_info}", "{agent_name}", "{agent_phone}"],
    category: "local-seo",
    tags: ["real-estate", "property", "listing", "local"],
    author: "Community", downloads: 876, rating: 4.6,
    seo_title_pattern: "{property_title} | {property_type} in {city}, {state}",
    seo_description_pattern: "{bedrooms} bed, {bathrooms} bath {property_type} at {address}. {price}.",
    schema_type: "RealEstateListing",
  },

  // 10. Gym / fitness
  {
    id: "gym-fitness",
    name: "Gym & Fitness Center",
    description: "Energetic gym landing with hero, programs, membership pricing, gallery and testimonials.",
    content: page(
      hero({ bgKeywords: "gym fitness modern equipment athletic", badge: "💪 Transform your body", title: "{gym_name} — {city}'s premier fitness center", subtitle: "State-of-the-art equipment, expert trainers and results-driven programs in {city}, {state}.", primaryCta: "Start Free Trial", secondaryCta: "View Classes", sig: 10 }) +
      trustStrip([{ num: "5K+", lbl: "Members" }, { num: "30+", lbl: "Classes/Week" }, { num: "20+", lbl: "Trainers" }, { num: "24/7", lbl: "Access" }]) +
      featureGrid("Programs", "Train your way", "Find the perfect program for your fitness goals.", [
        { icon: "🏋️", title: "Strength", desc: "Full free-weight room and machine circuits with expert coaches on hand." },
        { icon: "🏃", title: "Cardio", desc: "Treadmills, bikes, rowers and HIIT classes to torch calories and build stamina." },
        { icon: "🧘", title: "Yoga & mobility", desc: "Restore body and mind with our daily yoga, pilates and stretch classes." },
        { icon: "🥊", title: "Boxing", desc: "Burn fat and build power with high-energy boxing and kickboxing classes." },
      ]) +
      aboutSplit("Our coaches", "Expert trainers, real results", "Every member gets a free fitness assessment and a custom program designed by one of our certified coaches. We're with you every rep of the way.", "personal trainer gym coach", 11) +
      gallery("The space", "Inside {gym_name}", ["gym interior", "weight room", "cardio machines", "yoga class", "boxing class", "fitness training"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "fitness motivation success", title: "Start your fitness journey today", subtitle: "📍 {address}, {city} · 📞 {phone}", cta: "Claim Your Free Trial", sig: 20 })
    ),
    variables: ["{gym_name}", "{city}", "{state}", "{address}", "{phone}", "{price_basic}", "{price_pro}", "{price_elite}"],
    category: "health",
    tags: ["gym", "fitness", "health", "membership"],
    author: "Community", downloads: 645, rating: 4.5,
    seo_title_pattern: "{gym_name} — Gym in {city}, {state}",
    seo_description_pattern: "Join {gym_name} in {city}. Strength, cardio, yoga & more. Call {phone}.",
    schema_type: "LocalBusiness",
  },

  // 11. WordPress blog theme
  {
    id: "wp-blog-theme",
    name: "WordPress Blog Theme",
    description: "Editorial WordPress blog template with hero image, structured content and author box.",
    content: page(
      hero({ bgKeywords: "{category} editorial article", badge: "{category}", title: "{title}", subtitle: "{intro}", primaryCta: "Read article ↓", sig: 21 }) +
      `<section class="pgp-section"><div style="max-width:760px;margin:0 auto">
        <div style="display:flex;align-items:center;gap:1rem;padding:1rem 0 1.5rem;border-bottom:1px solid rgba(128,128,128,.15);margin-bottom:2rem">
          <img src="${avatar(8)}" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover"/>
          <div><strong style="display:block">{author}</strong><span style="font-size:.85rem;opacity:.65">{date}</span></div>
        </div>
        <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:1rem">{heading_1}</h2>
        <p style="line-height:1.9;opacity:.86;margin-bottom:2rem">{content_1}</p>
        <img src="${img("{category} feature article", 1200, 600, 22)}" alt="" loading="lazy" style="width:100%;border-radius:14px;margin-bottom:2rem"/>
        <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:1rem">{heading_2}</h2>
        <p style="line-height:1.9;opacity:.86;margin-bottom:2rem">{content_2}</p>
        <div class="pgp-card" style="display:flex;gap:1.25rem;align-items:center;margin-top:3rem">
          <img src="${avatar(8)}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0"/>
          <div><strong>{author}</strong><p style="font-size:.9rem;opacity:.75;margin-top:.25rem;line-height:1.6">{author_bio}</p></div>
        </div>
      </div></section>` +
      defaultTestimonials
    ),
    variables: ["{title}", "{category}", "{author}", "{date}", "{intro}", "{heading_1}", "{content_1}", "{heading_2}", "{content_2}", "{author_bio}", "{categories_list}", "{popular_posts}"],
    category: "wordpress",
    tags: ["wordpress", "blog", "article", "content"],
    author: "Community", downloads: 1892, rating: 4.8,
    seo_title_pattern: "{title} | {category} Blog",
    seo_description_pattern: "{intro}",
    schema_type: "Article",
  },

  // 12. WordPress service page
  {
    id: "wp-service-page",
    name: "WordPress Service Page",
    description: "Professional WordPress service page with hero, process, FAQ and CTA.",
    content: page(
      hero({ bgKeywords: "{service_name} business professional", badge: "Professional {service_name}", title: "{service_name} services in {city}", subtitle: "Professional {service_name} solutions by {company_name}. Serving {city} and {state}.", primaryCta: "Get Free Quote — {phone}", secondaryCta: "Our Process", sig: 23 }) +
      trustStrip([{ num: "10+", lbl: "Years Experience" }, { num: "500+", lbl: "Projects" }, { num: "5★", lbl: "Rating" }, { num: "Free", lbl: "Estimates" }]) +
      featureGrid("Our process", "How we work", "A proven 4-step process that gets you from idea to launch.", [
        { icon: "1", title: "Consultation", desc: "Free assessment of your needs, goals and constraints." },
        { icon: "2", title: "Planning", desc: "Custom strategy and a clear, transparent quote." },
        { icon: "3", title: "Execution", desc: "Professional delivery, on schedule and on budget." },
        { icon: "4", title: "Support", desc: "Ongoing maintenance and improvements after launch." },
      ]) +
      aboutSplit("About our services", "Why {company_name}", "{service_description}", "professional team meeting", 12) +
      gallery("Recent work", "Projects we're proud of", ["{service_name} project", "team meeting business", "office workspace", "professional service", "happy client", "results growth"]) +
      defaultTestimonials +
      faq([
        { q: "How much does {service_name} cost?", a: "{faq_pricing}" },
        { q: "How long does it take?", a: "{faq_timeline}" },
        { q: "Do you serve my area?", a: "Yes! We serve {city}, {nearby_cities} and all of {state}." },
      ]) +
      ctaBand({ bgKeywords: "business success handshake", title: "Ready to get started?", subtitle: "Call {company_name} today for a free {service_name} consultation.", cta: "📞 {phone}", sig: 24 })
    ),
    variables: ["{service_name}", "{city}", "{state}", "{company_name}", "{phone}", "{service_description}", "{faq_pricing}", "{faq_timeline}", "{nearby_cities}"],
    category: "wordpress",
    tags: ["wordpress", "service", "business", "local"],
    author: "Community", downloads: 1456, rating: 4.7,
    seo_title_pattern: "{service_name} in {city}, {state} | {company_name}",
    seo_description_pattern: "Professional {service_name} services in {city}, {state}. Call {phone}.",
    schema_type: "LocalBusiness",
  },

  // 13. Shopify collection
  {
    id: "shopify-collection",
    name: "Shopify Collection Page",
    description: "Beautiful Shopify collection landing with hero, products gallery and brand story.",
    content: page(
      hero({ bgKeywords: "{collection_name} fashion shop premium", badge: "🛍️ {brand_name}", title: "{collection_name}", subtitle: "{collection_description}", primaryCta: "Shop the collection", sig: 25 }) +
      trustStrip([{ num: "10K+", lbl: "Happy Customers" }, { num: "4.9★", lbl: "Avg Rating" }, { num: "Free", lbl: "Shipping 50+" }, { num: "30-Day", lbl: "Returns" }]) +
      gallery("Featured", "Shop the collection", ["{collection_name} product", "{brand_name} packaging", "lifestyle product", "minimalist product", "premium product", "product detail"]) +
      aboutSplit("About {brand_name}", "Our story", "{brand_story}", "{brand_name} brand lifestyle", 12) +
      featureGrid("Why shop with us", "Built on trust", "Quality you can feel, service you can rely on.", [
        { icon: "✨", title: "Premium quality", desc: "Carefully sourced materials and rigorous quality control on every product." },
        { icon: "🚚", title: "Fast shipping", desc: "Free on orders over $50, delivered in 2–5 business days." },
        { icon: "🔒", title: "Secure checkout", desc: "256-bit encryption and trusted payment providers — your data is safe." },
      ]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "shopping bags premium retail", title: "Discover the {collection_name}", subtitle: "Free shipping on every order over $50.", cta: "Shop now", sig: 26 })
    ),
    variables: ["{brand_name}", "{collection_name}", "{collection_description}", "{product_1_name}", "{product_1_price}", "{product_2_name}", "{product_2_price}", "{product_3_name}", "{product_3_price}", "{brand_story}"],
    category: "shopify",
    tags: ["shopify", "collection", "ecommerce", "products"],
    author: "Community", downloads: 1678, rating: 4.8,
    seo_title_pattern: "{collection_name} | {brand_name} — Shop Online",
    seo_description_pattern: "Shop {collection_name} by {brand_name}. {collection_description}",
    schema_type: "CollectionPage",
  },

  // 14. Shopify product detail
  {
    id: "shopify-product-detail",
    name: "Shopify Product Detail",
    description: "Premium Shopify product page with hero, gallery, features and cross-sell.",
    content: page(
      hero({ bgKeywords: "{product_name} premium product hero", badge: "✓ In stock", title: "{product_name}", subtitle: "{short_description}", primaryCta: "Add to Cart — {price}", secondaryCta: "Save to Wishlist", sig: 27 }) +
      trustStrip([{ num: "{review_count}", lbl: "Reviews" }, { num: "4.9★", lbl: "Average" }, { num: "Free", lbl: "Shipping" }, { num: "30-Day", lbl: "Returns" }]) +
      aboutSplit("Product details", "{product_name}", "{full_description}", "{product_name} lifestyle photo", 13) +
      gallery("Gallery", "See it from every angle", ["{product_name} angle 1", "{product_name} angle 2", "{product_name} detail", "{product_name} lifestyle", "{product_name} packaging", "{product_name} use"]) +
      featureGrid("Features", "What makes it great", "Every detail engineered for performance.", [
        { icon: "🎯", title: "Built to last", desc: "Premium materials and meticulous craftsmanship for years of daily use." },
        { icon: "🚚", title: "Free shipping", desc: "Over $50 — arrives in 2–5 business days, beautifully packaged." },
        { icon: "↩️", title: "Easy returns", desc: "30-day no-questions-asked returns. Try it risk-free." },
      ]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "premium product gift box", title: "Get yours today", subtitle: "Join {review_count}+ happy customers who love {product_name}.", cta: "Add to Cart — {price}", sig: 28 })
    ),
    variables: ["{product_name}", "{collection}", "{price}", "{review_count}", "{short_description}", "{sizes}", "{full_description}", "{related_1}", "{related_2}", "{related_3}", "{related_4}"],
    category: "shopify",
    tags: ["shopify", "product", "ecommerce", "detail"],
    author: "Community", downloads: 2134, rating: 4.9,
    seo_title_pattern: "Buy {product_name} | Free Shipping",
    seo_description_pattern: "{short_description}. {review_count} reviews. Free shipping & easy returns.",
    schema_type: "Product",
  },

  // 15. PrestaShop category
  {
    id: "prestashop-category",
    name: "PrestaShop Category Page",
    description: "Modern PrestaShop category with hero, product gallery and brand highlights.",
    content: page(
      hero({ bgKeywords: "{category_name} shop retail premium", badge: "🏷️ {brand_name}", title: "Shop {category_name}", subtitle: "{category_description}", primaryCta: "Browse products", sig: 29 }) +
      trustStrip([{ num: "1K+", lbl: "Products" }, { num: "Free", lbl: "Shipping 50+" }, { num: "Secure", lbl: "Payment" }, { num: "30-Day", lbl: "Returns" }]) +
      gallery("Featured", "Top picks in {category_name}", ["{category_name} product", "{brand_name} product", "premium product", "lifestyle shop", "shopping bag", "retail product"]) +
      featureGrid("Why choose us", "More than just shopping", "Premium quality, fast delivery and dedicated support.", [
        { icon: "✨", title: "Premium quality", desc: "Hand-picked products from trusted suppliers." },
        { icon: "🚚", title: "Fast delivery", desc: "Express shipping options across the country." },
        { icon: "💳", title: "Secure payment", desc: "All major cards, PayPal, and buy-now-pay-later." },
      ]) +
      aboutSplit("About {category_name}", "Curated for you", "{seo_text}", "{category_name} curated collection", 14) +
      defaultTestimonials
    ),
    variables: ["{brand_name}", "{category_name}", "{category_description}", "{product_1}", "{price_1}", "{product_2}", "{price_2}", "{product_3}", "{price_3}", "{product_4}", "{price_4}", "{seo_text}"],
    category: "prestashop",
    tags: ["prestashop", "category", "ecommerce", "shop"],
    author: "Community", downloads: 923, rating: 4.5,
    seo_title_pattern: "Shop {category_name} | {brand_name}",
    seo_description_pattern: "Browse {category_name} at {brand_name}. {category_description}",
    schema_type: "CollectionPage",
  },

  // 16. PrestaShop product
  {
    id: "prestashop-product",
    name: "PrestaShop Product Page",
    description: "Polished PrestaShop product page with hero, specs and trust badges.",
    content: page(
      hero({ bgKeywords: "{product_name} product showcase", title: "{product_name}", subtitle: "{description}", primaryCta: "🛒 Add to cart — {price} €", secondaryCta: "Save to wishlist", sig: 30 }) +
      trustStrip([{ num: "{reviews}", lbl: "Reviews" }, { num: "4.8★", lbl: "Rating" }, { num: "{delivery_time}", lbl: "Delivery" }, { num: "14-Day", lbl: "Returns" }]) +
      aboutSplit("Description", "{product_name}", "{description}", "{product_name} lifestyle", 15) +
      gallery("Photos", "Product gallery", ["{product_name} front", "{product_name} side", "{product_name} detail", "{product_name} use", "{product_name} packaging", "{product_name} lifestyle"]) +
      featureGrid("Why us", "Shop with confidence", "Every order is backed by our 14-day return guarantee.", [
        { icon: "🔒", title: "Secure payment", desc: "Multiple secure payment options, encrypted checkout." },
        { icon: "📦", title: "Tracked shipping", desc: "Track your parcel every step of the way." },
        { icon: "⭐", title: "Quality guarantee", desc: "Genuine products with manufacturer warranty." },
      ]) +
      defaultTestimonials
    ),
    variables: ["{product_name}", "{category}", "{price}", "{description}", "{reviews}", "{delivery_time}", "{brand}", "{sku}", "{weight}"],
    category: "prestashop",
    tags: ["prestashop", "product", "ecommerce", "french"],
    author: "Community", downloads: 756, rating: 4.4,
    seo_title_pattern: "{product_name} | {brand}",
    seo_description_pattern: "{product_name} par {brand}. {description}",
    schema_type: "Product",
  },

  // 17. HVAC
  {
    id: "hvac-service",
    name: "HVAC & Home Services",
    description: "Trustworthy HVAC home-service page with hero, services, gallery and 24/7 CTA.",
    content: page(
      hero({ bgKeywords: "hvac technician home service repair", badge: "🔧 Licensed & insured", title: "{company_name} — {service_type} in {city}", subtitle: "Reliable {service_type} services for homes & businesses in {city}, {state}. Available 24/7.", primaryCta: "📞 {phone}", secondaryCta: "Schedule Service", sig: 31 }) +
      trustStrip([{ num: "20+", lbl: "Years Service" }, { num: "10K+", lbl: "Repairs" }, { num: "24/7", lbl: "Emergency" }, { num: "5★", lbl: "Rating" }]) +
      featureGrid("Services", "Our {service_type} services", "From new installations to emergency repairs — we do it all.", [
        { icon: "❄️", title: "Installation", desc: "{install_desc}" },
        { icon: "🔧", title: "Repair", desc: "{repair_desc}" },
        { icon: "🛡️", title: "Maintenance", desc: "{maintenance_desc}" },
      ]) +
      aboutSplit("About us", "Trusted by {city} homeowners", "{company_name} has been serving {city} families for over two decades. We treat your home like our own.", "hvac technician working professional", 16) +
      gallery("Recent jobs", "What we do", ["hvac unit", "air conditioner install", "furnace repair", "thermostat smart", "duct work", "happy homeowner"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "home service repair professional", title: "Need {service_type} help in {city}?", subtitle: "Call {company_name} — 24/7 emergency service available.", cta: "📞 {phone}", sig: 32 })
    ),
    variables: ["{company_name}", "{service_type}", "{city}", "{state}", "{phone}", "{promo_title}", "{promo_description}", "{install_desc}", "{repair_desc}", "{maintenance_desc}"],
    category: "local-seo",
    tags: ["hvac", "home-services", "local", "plumbing"],
    author: "Community", downloads: 1123, rating: 4.6,
    seo_title_pattern: "{service_type} in {city}, {state} — {company_name}",
    seo_description_pattern: "{service_type} installation, repair & maintenance in {city}. Call {phone}.",
    schema_type: "LocalBusiness",
  },

  // 18. Shopify fashion
  {
    id: "shopify-fashion",
    name: "Shopify Fashion Lookbook",
    description: "Editorial Shopify lookbook with hero image, fashion gallery and seasonal collection.",
    content: page(
      hero({ bgKeywords: "fashion model editorial photoshoot {season}", badge: "{season} collection", title: "{collection_title}", subtitle: "{tagline}", primaryCta: "Explore Collection →", sig: 33 }) +
      trustStrip([{ num: "Free", lbl: "Worldwide Shipping" }, { num: "30-Day", lbl: "Returns" }, { num: "100%", lbl: "Authentic" }, { num: "{season}", lbl: "Drop" }]) +
      gallery("Lookbook", "The {season} edit", ["fashion model editorial", "fashion lookbook style", "minimal fashion", "streetwear style", "luxury fashion", "fashion accessories"]) +
      aboutSplit("The story", "{brand_name}", "{brand_tagline}", "fashion designer studio creative", 17) +
      gallery("Trending", "Trending now", ["fashion clothing", "fashion bag", "fashion shoes", "fashion accessory", "fashion jewelry", "fashion outfit"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "fashion model dramatic", title: "{brand_name}", subtitle: "{brand_tagline}", cta: "Shop All →", sig: 34 })
    ),
    variables: ["{brand_name}", "{brand_tagline}", "{season}", "{collection_title}", "{tagline}", "{look_1_name}", "{look_2_name}", "{item_1_name}", "{item_1_price}", "{item_2_name}", "{item_2_price}", "{item_3_name}", "{item_3_price}", "{item_4_name}", "{item_4_price}"],
    category: "shopify",
    tags: ["shopify", "fashion", "lookbook", "clothing"],
    author: "Community", downloads: 1345, rating: 4.8,
    seo_title_pattern: "{collection_title} — {season} | {brand_name}",
    seo_description_pattern: "Discover {collection_title} from {brand_name}. {tagline}",
    schema_type: "CollectionPage",
  },

  // 19. WordPress portfolio
  {
    id: "wp-portfolio",
    name: "WordPress Portfolio Page",
    description: "Stunning portfolio page for freelancers — hero, project gallery, testimonials and contact CTA.",
    content: page(
      hero({ bgKeywords: "creative {specialty} workspace designer", badge: "🎨 {specialty}", title: "{name} — {specialty} in {city}", subtitle: "{tagline}", primaryCta: "View My Work →", secondaryCta: "Get in Touch", sig: 35 }) +
      trustStrip([{ num: "{years_exp}+", lbl: "Years Experience" }, { num: "{projects_count}+", lbl: "Projects" }, { num: "{clients_count}+", lbl: "Clients" }, { num: "5★", lbl: "Rating" }]) +
      featureGrid("Featured projects", "Recent work", "A small selection of my favorite recent projects.", [
        { icon: "🎨", title: "{project_1_title}", desc: "{project_1_desc}" },
        { icon: "💻", title: "{project_2_title}", desc: "{project_2_desc}" },
        { icon: "📱", title: "{project_3_title}", desc: "{project_3_desc}" },
      ]) +
      aboutSplit("About", "Hi, I'm {name}", "I'm a {specialty} based in {city} with {years_exp}+ years of experience helping brands and businesses bring their ideas to life.", "creative designer portrait professional", 18) +
      gallery("Gallery", "Selected work", ["graphic design", "web design", "branding", "ui design", "creative portfolio", "design mockup"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "creative collaboration coffee", title: "Let's work together", subtitle: "Have a project in mind? Let's chat about bringing your vision to life.", cta: "📧 {email}", sig: 36 })
    ),
    variables: ["{name}", "{specialty}", "{city}", "{tagline}", "{email}", "{project_1_title}", "{project_1_desc}", "{project_2_title}", "{project_2_desc}", "{project_3_title}", "{project_3_desc}", "{years_exp}", "{projects_count}", "{clients_count}"],
    category: "wordpress",
    tags: ["wordpress", "portfolio", "freelancer", "creative"],
    author: "Community", downloads: 1567, rating: 4.7,
    seo_title_pattern: "{name} — {specialty} in {city}",
    seo_description_pattern: "{tagline}. Contact: {email}.",
    schema_type: "WebPage",
  },

  // 20. Auto dealer
  {
    id: "auto-dealer",
    name: "Auto Dealer Vehicle Page",
    description: "Detailed vehicle listing with hero, specs, financing info and dealer contact.",
    content: page(
      hero({ bgKeywords: "{make} {model} car automotive", badge: "🚗 {condition} {year}", title: "{year} {make} {model}", subtitle: "{price} · {mileage} mi · {transmission} · {color}", primaryCta: "📞 Call {phone}", secondaryCta: "Schedule Test Drive", sig: 37 }) +
      trustStrip([{ num: "{mileage}", lbl: "Miles" }, { num: "{year}", lbl: "Year" }, { num: "{fuel_type}", lbl: "Fuel" }, { num: "{transmission}", lbl: "Trans" }]) +
      aboutSplit("Vehicle overview", "{year} {make} {model}", "{description}", "{make} {model} car interior", 19) +
      gallery("Photos", "Photo gallery", ["{make} {model} exterior", "{make} {model} interior", "{make} {model} dashboard", "{make} {model} wheels", "{make} {model} engine", "{make} {model} side"]) +
      featureGrid("Financing", "Financing made easy", "Drive home today with flexible options that fit your budget.", [
        { icon: "💳", title: "0% APR available", desc: "Qualified buyers can get 0% financing on select vehicles." },
        { icon: "📅", title: "Flexible terms", desc: "Choose 24, 36, 48, 60 or 72-month terms to fit your budget." },
        { icon: "🚗", title: "Trade-in welcome", desc: "Get top dollar for your current vehicle as a down payment." },
      ]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "car dealership showroom", title: "Interested in this {make} {model}?", subtitle: "Visit {dealer_name} in {city} or call for a test drive.", cta: "📞 {phone}", sig: 38 })
    ),
    variables: ["{year}", "{make}", "{model}", "{price}", "{condition}", "{mileage}", "{fuel_type}", "{transmission}", "{color}", "{description}", "{vin}", "{stock_number}", "{dealer_name}", "{city}", "{phone}"],
    category: "local-seo",
    tags: ["auto", "car", "dealer", "vehicle"],
    author: "Community", downloads: 534, rating: 4.3,
    seo_title_pattern: "{year} {make} {model} for Sale in {city} | {dealer_name}",
    seo_description_pattern: "{condition} {year} {make} {model}. {mileage} miles. {price}.",
    schema_type: "Product",
  },

  // 21. WooCommerce product
  {
    id: "wp-woocommerce-product",
    name: "WooCommerce Product Page",
    description: "WordPress WooCommerce product page with hero, gallery, features and reviews.",
    content: page(
      hero({ bgKeywords: "{product_name} ecommerce premium product", badge: "✓ In stock", title: "{product_name}", subtitle: "{short_description}", primaryCta: "🛒 Add to Cart — {price}", secondaryCta: "Save to Wishlist", sig: 39 }) +
      trustStrip([{ num: "{review_count}", lbl: "Reviews" }, { num: "4.9★", lbl: "Rating" }, { num: "Free", lbl: "Shipping 50+" }, { num: "30-Day", lbl: "Returns" }]) +
      aboutSplit("Description", "{product_name}", "{full_description}", "{product_name} hero photography", 20) +
      gallery("Gallery", "All angles", ["{product_name} 1", "{product_name} 2", "{product_name} 3", "{product_name} 4", "{product_name} 5", "{product_name} 6"]) +
      featureGrid("Why this product", "Built different", "Premium materials, thoughtful design, real value.", [
        { icon: "🎯", title: "Quality", desc: "Materials and craftsmanship that you can feel from day one." },
        { icon: "🚚", title: "Free shipping", desc: "On orders over $50, anywhere in the country." },
        { icon: "🔄", title: "30-day returns", desc: "Not perfect for you? Send it back, hassle-free." },
      ]) +
      defaultTestimonials +
      faq([
        { q: "How long does shipping take?", a: "Standard shipping is 3–5 business days. Expedited options available." },
        { q: "Can I return it?", a: "Absolutely — 30-day no-questions-asked returns." },
        { q: "Is there a warranty?", a: "Yes, every {product_name} includes our 12-month manufacturer warranty." },
      ])
    ),
    variables: ["{product_name}", "{category}", "{price}", "{review_count}", "{short_description}", "{sku}", "{tags}", "{full_description}", "{related_1}", "{related_2}", "{related_3}", "{related_4}"],
    category: "wordpress",
    tags: ["wordpress", "woocommerce", "product", "ecommerce"],
    author: "Community", downloads: 1789, rating: 4.8,
    seo_title_pattern: "{product_name} — Buy Online | {category}",
    seo_description_pattern: "{short_description}. {review_count} reviews. Free shipping over $50.",
    schema_type: "Product",
  },

  // 22. Hotel
  {
    id: "hotel-booking",
    name: "Hotel & Travel Landing",
    description: "Luxurious hotel landing with hero image, amenities, room types and booking CTA.",
    content: page(
      hero({ bgKeywords: "luxury hotel pool architecture {country}", badge: "⭐ {star_rating}-star hotel", title: "{hotel_name}", subtitle: "{tagline} — {city}, {country}", primaryCta: "Book Now — From {price_from}/night", secondaryCta: "Virtual Tour", sig: 40 }) +
      trustStrip([{ num: "{star_rating}★", lbl: "Star Rating" }, { num: "1K+", lbl: "Reviews" }, { num: "4.9", lbl: "Guest Score" }, { num: "Free", lbl: "WiFi & Parking" }]) +
      featureGrid("Amenities", "Everything you need", "World-class amenities for an unforgettable stay.", [
        { icon: "🏊", title: "Pool & Spa", desc: "Indoor pool, hot tub and full-service spa with massage treatments." },
        { icon: "🍽️", title: "Restaurant", desc: "Fine dining restaurant featuring local and international cuisine." },
        { icon: "📶", title: "Free WiFi", desc: "Lightning-fast WiFi throughout the property and all rooms." },
        { icon: "🅿️", title: "Free parking", desc: "Complimentary on-site parking for all our guests." },
      ]) +
      aboutSplit("About", "{hotel_name}", "{description}", "luxury hotel lobby interior", 21) +
      gallery("Gallery", "Inside {hotel_name}", ["luxury hotel room", "hotel pool", "hotel restaurant", "hotel lobby", "hotel spa", "hotel view {city}"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "luxury bedroom view {country}", title: "Book your stay at {hotel_name}", subtitle: "📍 {address}, {city}, {country} · 📞 {phone}", cta: "Reserve Now", sig: 41 })
    ),
    variables: ["{hotel_name}", "{tagline}", "{city}", "{country}", "{star_rating}", "{price_from}", "{description}", "{address}", "{phone}", "{room_1_name}", "{room_1_price}", "{room_1_desc}", "{room_2_name}", "{room_2_price}", "{room_2_desc}", "{room_3_name}", "{room_3_price}", "{room_3_desc}"],
    category: "local-seo",
    tags: ["hotel", "travel", "booking", "hospitality"],
    author: "Community", downloads: 678, rating: 4.6,
    seo_title_pattern: "{hotel_name} — {star_rating}-Star Hotel in {city}, {country}",
    seo_description_pattern: "Book {hotel_name} in {city}. {tagline}. From {price_from}/night.",
    schema_type: "Hotel",
  },

  // 23. Cleaning
  {
    id: "cleaning-service",
    name: "Cleaning Service Landing",
    description: "Sparkling cleaning service page with hero, packages, gallery and instant quote CTA.",
    content: page(
      hero({ bgKeywords: "cleaning service home professional sparkling", badge: "✨ 5-star rated", title: "{company_name} — {service_type} in {city}", subtitle: "Professional {service_type} for homes & offices in {city}, {state}. 100% satisfaction guaranteed.", primaryCta: "Get Instant Quote — {phone}", secondaryCta: "View Packages", sig: 42 }) +
      trustStrip([{ num: "{years_exp}+", lbl: "Years Service" }, { num: "{homes_cleaned}+", lbl: "Homes Cleaned" }, { num: "5★", lbl: "Rating" }, { num: "100%", lbl: "Guarantee" }]) +
      featureGrid("Packages", "Choose your clean", "Three flexible packages to suit every home.", [
        { icon: "🧽", title: "Standard Clean", desc: "Kitchen, bathrooms, living areas, dusting, vacuuming. From {price_standard}." },
        { icon: "✨", title: "Deep Clean", desc: "Everything in Standard plus inside appliances, windows and baseboards. From {price_deep}." },
        { icon: "📦", title: "Move In/Out", desc: "Complete top-to-bottom cleaning for move transitions. From {price_movein}." },
      ]) +
      aboutSplit("About us", "Trusted in {city}", "We're a local team of vetted, background-checked cleaners who treat every home with the care we'd give our own.", "cleaning service team friendly", 22) +
      gallery("Before & after", "See the difference", ["clean kitchen", "clean bathroom", "clean living room", "clean bedroom", "clean office", "spotless home"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "sparkling clean home interior", title: "Book your cleaning today", subtitle: "Serving {city}, {nearby_areas} and all of {state}.", cta: "📞 Call {phone}", sig: 43 })
    ),
    variables: ["{company_name}", "{service_type}", "{city}", "{state}", "{phone}", "{price_standard}", "{price_deep}", "{price_movein}", "{years_exp}", "{homes_cleaned}", "{nearby_areas}"],
    category: "local-seo",
    tags: ["cleaning", "home-services", "local", "maid"],
    author: "Community", downloads: 892, rating: 4.5,
    seo_title_pattern: "{service_type} in {city}, {state} | {company_name}",
    seo_description_pattern: "Professional {service_type} in {city}. From {price_standard}. Call {phone}.",
    schema_type: "LocalBusiness",
  },

  // 24. PrestaShop landing
  {
    id: "prestashop-landing",
    name: "PrestaShop Promo Landing",
    description: "Promotional PrestaShop landing with hero, featured deals, countdown and newsletter signup.",
    content: page(
      hero({ bgKeywords: "sale promotion shopping discount", badge: "🔥 {promo_badge}", title: "{promo_title}", subtitle: "{promo_subtitle}", primaryCta: "Shop the Sale →", secondaryCta: "Browse All", sig: 44 }) +
      trustStrip([{ num: "{days_left}", lbl: "Days Left" }, { num: "{hours_left}", lbl: "Hours" }, { num: "Up to 70%", lbl: "Off" }, { num: "Free", lbl: "Shipping" }]) +
      gallery("Hot deals", "Today's featured deals", ["sale product 1", "sale product 2", "sale product 3", "sale product 4", "sale product 5", "sale product 6"]) +
      aboutSplit("About {brand_name}", "Why shop the sale", "{brand_name} brings together the best brands and biggest discounts of the season — but only while stock lasts.", "shopping bags discount sale", 23) +
      featureGrid("Why now", "Don't miss out", "Limited stock, real discounts, real fast.", [
        { icon: "⏰", title: "Limited time", desc: "Sale ends in {days_left} days, {hours_left} hours — and stock is moving fast." },
        { icon: "🚚", title: "Free shipping", desc: "Free delivery on every order during the promotion." },
        { icon: "✅", title: "Easy returns", desc: "Sale items are fully returnable within 14 days, no questions asked." },
      ]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "shopping cart sale celebration", title: "Don't miss out!", subtitle: "Subscribe for exclusive deals from {brand_name}.", cta: "Shop Now →", sig: 45 })
    ),
    variables: ["{brand_name}", "{promo_badge}", "{promo_title}", "{promo_subtitle}", "{days_left}", "{hours_left}", "{deal_1_name}", "{deal_1_price}", "{deal_1_original}", "{deal_2_name}", "{deal_2_price}", "{deal_2_original}", "{deal_3_name}", "{deal_3_price}", "{deal_3_original}"],
    category: "prestashop",
    tags: ["prestashop", "promotion", "sale", "landing"],
    author: "Community", downloads: 654, rating: 4.4,
    seo_title_pattern: "{promo_title} | {brand_name}",
    seo_description_pattern: "{promo_subtitle}. {promo_badge}. Hurry — {days_left} days left!",
    schema_type: "WebPage",
  },

  // 25. Pet services
  {
    id: "pet-services",
    name: "Pet Services & Grooming",
    description: "Loving pet care landing page with hero, services, gallery and booking CTA.",
    content: page(
      hero({ bgKeywords: "happy dog pet grooming love", badge: "🐾 {city}'s favorite pet care", title: "{business_name} — {service_type} in {city}", subtitle: "Loving, professional {service_type} for your furry family members in {city}, {state}.", primaryCta: "Book Appointment", secondaryCta: "📞 {phone}", sig: 46 }) +
      trustStrip([{ num: "10+", lbl: "Years Service" }, { num: "5K+", lbl: "Happy Pets" }, { num: "5★", lbl: "Rating" }, { num: "Cert.", lbl: "Groomers" }]) +
      featureGrid("Services", "Our services", "Everything your pet needs, delivered with love.", [
        { icon: "🐕", title: "Grooming", desc: "{grooming_desc} From {grooming_price}." },
        { icon: "🏠", title: "Boarding", desc: "{boarding_desc} From {boarding_price}/night." },
        { icon: "🦴", title: "Training", desc: "{training_desc} From {training_price}." },
      ]) +
      aboutSplit("About us", "Pets are family", "We treat every pet that walks through our door like our own. Certified groomers, trainers and pet lovers — that's our team.", "dog grooming spa happy", 24) +
      gallery("Our happy clients", "The {business_name} family", ["happy dog", "cute puppy", "dog grooming", "dog playing", "pet care", "happy pet"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "dog cute happy pet love", title: "Book your pet's next visit", subtitle: "📍 {address}, {city} · Serving {nearby_areas}", cta: "📞 {phone}", sig: 47 })
    ),
    variables: ["{business_name}", "{service_type}", "{city}", "{state}", "{phone}", "{address}", "{grooming_desc}", "{grooming_price}", "{boarding_desc}", "{boarding_price}", "{training_desc}", "{training_price}", "{nearby_areas}"],
    category: "local-seo",
    tags: ["pets", "grooming", "local", "veterinary"],
    author: "Community", downloads: 445, rating: 4.5,
    seo_title_pattern: "{business_name} — {service_type} in {city}, {state}",
    seo_description_pattern: "Professional {service_type} at {business_name}. From {grooming_price}.",
    schema_type: "LocalBusiness",
  },

  // 26. Wedding venue
  {
    id: "wedding-venue",
    name: "Wedding & Event Venue",
    description: "Elegant wedding venue page with hero, packages, gallery and booking inquiry.",
    content: page(
      hero({ bgKeywords: "wedding venue elegant ceremony romantic", badge: "💒 {city}'s premier venue", title: "{venue_name}", subtitle: "{tagline}", primaryCta: "Schedule a Tour →", secondaryCta: "View Packages", sig: 48 }) +
      trustStrip([{ num: "300+", lbl: "Weddings" }, { num: "5★", lbl: "Rating" }, { num: "12 mo", lbl: "Booking Window" }, { num: "All-In", lbl: "Packages" }]) +
      featureGrid("Packages", "Our wedding packages", "Three unforgettable options — fully customizable to your vision.", [
        { icon: "💕", title: "Intimate", desc: "Up to {guests_intimate} guests · {hours_intimate} hours · {price_intimate}." },
        { icon: "🥂", title: "Classic", desc: "Up to {guests_classic} guests · {hours_classic} hours · {price_classic}." },
        { icon: "✨", title: "Grand", desc: "Up to {guests_grand} guests · Full day · {price_grand}." },
      ]) +
      aboutSplit("About", "{venue_name}", "{description}", "wedding ceremony elegant flowers", 25) +
      gallery("Gallery", "Real weddings at {venue_name}", ["wedding ceremony", "wedding reception", "wedding flowers", "bride groom", "wedding cake", "wedding venue exterior"]) +
      defaultTestimonials +
      ctaBand({ bgKeywords: "wedding bride flowers romantic", title: "Plan your dream event", subtitle: "📍 {address}, {city}, {state} · 📞 {phone}", cta: "Request a Quote", sig: 49 })
    ),
    variables: ["{venue_name}", "{tagline}", "{city}", "{state}", "{address}", "{phone}", "{description}", "{price_intimate}", "{guests_intimate}", "{hours_intimate}", "{price_classic}", "{guests_classic}", "{hours_classic}", "{price_grand}", "{guests_grand}"],
    category: "local-seo",
    tags: ["wedding", "venue", "events", "local"],
    author: "Community", downloads: 389, rating: 4.6,
    seo_title_pattern: "{venue_name} — Wedding & Event Venue in {city}, {state}",
    seo_description_pattern: "Host your dream wedding at {venue_name}. From {price_intimate}.",
    schema_type: "LocalBusiness",
  },

  // 27. Shopify supplement
  {
    id: "shopify-supplement",
    name: "Shopify Health & Supplement",
    description: "Trustworthy health supplement page with hero, ingredients, benefits and subscription option.",
    content: page(
      hero({ bgKeywords: "natural supplement health wellness organic", badge: "🌿 {brand_name}", title: "{product_name}", subtitle: "{tagline}", primaryCta: "Buy Now — {price}", secondaryCta: "Subscribe & Save 15%", sig: 50 }) +
      trustStrip([{ num: "{review_count}", lbl: "Reviews" }, { num: "4.9★", lbl: "Rating" }, { num: "Lab", lbl: "Tested" }, { num: "USA", lbl: "Made" }]) +
      featureGrid("Benefits", "Why {product_name}?", "Carefully formulated for results you can feel.", [
        { icon: "✅", title: "{benefit_1}", desc: "Backed by science and trusted by thousands of customers." },
        { icon: "✅", title: "{benefit_2}", desc: "Pure, potent, and free from unnecessary fillers." },
        { icon: "✅", title: "{benefit_3}", desc: "Third-party lab tested for purity and potency." },
      ]) +
      aboutSplit("Ingredients", "Made with care", "{ingredients}. Every batch is tested by a third-party lab and we publish the results — so you know exactly what's in every bottle.", "natural ingredients herbs supplement", 26) +
      gallery("Inside the bottle", "Pure & potent", ["supplement bottle", "natural ingredients", "wellness lifestyle", "healthy person", "vitamins capsules", "organic herbs"]) +
      defaultTestimonials +
      faq([
        { q: "Are there side effects?", a: "{product_name} is made from natural ingredients and is generally well-tolerated. As with any supplement, consult your doctor if you have a medical condition." },
        { q: "How fast will I see results?", a: "Most customers report noticeable benefits within 2–4 weeks of consistent daily use." },
        { q: "Is there a money-back guarantee?", a: "Yes — we offer a 60-day full refund if you're not satisfied." },
      ]) +
      ctaBand({ bgKeywords: "wellness lifestyle natural healthy", title: "Feel the difference", subtitle: "Join thousands who chose {product_name}.", cta: "Buy Now — {price}", sig: 51 })
    ),
    variables: ["{brand_name}", "{product_name}", "{tagline}", "{price}", "{benefit_1}", "{benefit_2}", "{benefit_3}", "{description}", "{ingredients}", "{review_count}"],
    category: "shopify",
    tags: ["shopify", "health", "supplement", "product"],
    author: "Community", downloads: 987, rating: 4.7,
    seo_title_pattern: "{product_name} — {brand_name} | Natural Health Supplement",
    seo_description_pattern: "{tagline}. {benefit_1}, {benefit_2}, {benefit_3}.",
    schema_type: "Product",
  },

  // 30. Personal portfolio (WordPress / generic websites)
  {
    id: "wp-personal-portfolio",
    name: "Personal Portfolio",
    description: "Modern personal portfolio with hero, projects gallery, skills, testimonials and contact CTA. Works on WordPress or any generic website.",
    content: page(
      hero({
        bgKeywords: "{profession} workspace creative portrait",
        badge: "👋 Hi, I'm {full_name}",
        title: "{headline}",
        subtitle: "{tagline}",
        primaryCta: "View my work",
        secondaryCta: "Get in touch",
        sig: 60,
      }) +
      trustStrip([
        { num: "{years_experience}+", lbl: "Years experience" },
        { num: "{projects_count}+", lbl: "Projects shipped" },
        { num: "{clients_count}+", lbl: "Happy clients" },
        { num: "{awards_count}", lbl: "Awards" },
      ]) +
      aboutSplit("About me", "Hi, I'm {full_name}", "{about_bio}", "{profession} portrait professional", 13) +
      featureGrid("What I do", "Services & expertise", "I help brands and teams ship beautiful, high-impact work.", [
        { icon: "🎨", title: "{service_1_name}", desc: "{service_1_desc}" },
        { icon: "⚡", title: "{service_2_name}", desc: "{service_2_desc}" },
        { icon: "🚀", title: "{service_3_name}", desc: "{service_3_desc}" },
      ]) +
      gallery("Selected work", "Recent projects", [
        "{profession} project showcase",
        "design portfolio piece",
        "creative work mockup",
        "branding case study",
        "modern web design",
        "creative portfolio image",
      ]) +
      defaultTestimonials +
      faq([
        { q: "What's your typical project timeline?", a: "Most projects ship in 2–6 weeks depending on scope. I'll give you a clear timeline after our first call." },
        { q: "How do we get started?", a: "Drop me a message at {email} or book a call. I reply within 24 hours and we'll scope the project together." },
        { q: "Do you work with clients outside {location}?", a: "Yes — I work remotely with clients worldwide and have shipped projects across {timezone_coverage}." },
      ]) +
      ctaBand({
        bgKeywords: "creative collaboration meeting workspace",
        title: "Let's build something great together",
        subtitle: "Have a project in mind? I'd love to hear about it.",
        cta: "✉️ {email}",
        sig: 61,
      })
    ),
    variables: [
      "{full_name}", "{profession}", "{headline}", "{tagline}", "{about_bio}",
      "{years_experience}", "{projects_count}", "{clients_count}", "{awards_count}",
      "{service_1_name}", "{service_1_desc}",
      "{service_2_name}", "{service_2_desc}",
      "{service_3_name}", "{service_3_desc}",
      "{email}", "{location}", "{timezone_coverage}",
    ],
    category: "wordpress",
    tags: ["wordpress", "portfolio", "personal", "freelancer", "resume", "about-me"],
    author: "Community", downloads: 1340, rating: 4.9,
    seo_title_pattern: "{full_name} — {profession} | Portfolio",
    seo_description_pattern: "{tagline} View selected work, services and contact details.",
    schema_type: "Person",
  },

  // 31. Dentexa — premium dentist landing (modelled on the Dentexa HTML theme)
  {
    id: "dentalflow-dentist",
    name: "Dentexa Dental Studio",
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
    schema_type: "Dentist",
  },

  // 32. Consulting — business consulting landing (modelled on consulting.framer.media)
  {
    id: "consulting-agency",
    name: "Consulting Agency",
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
    schema_type: "WebPage",
  },

  // 33. Gardener — landscaping & garden service landing (modelled on gardener.framer.media)
  {
    id: "gardener-landscaping",
    name: "Gardener Landscaping",
    description: "Beautiful gardening & landscaping landing page — full-bleed hero with a glass booking form, about split, services gallery, FAQ, recent works grid, customer reviews, blog highlights and a closing CTA. Modelled 1:1 on the gardener.framer.media design with real photography.",
    content: gardenerTemplate(),
    variables: [
      "{company_name}", "{headline}", "{subheadline}", "{cta_text}", "{phone}",
      "{ratings_count}", "{rating_value}",
      "{about_title}", "{about_body}", "{feature_1}", "{feature_2}",
      "{services_title}", "{services_subtitle}",
      "{service_1_title}", "{service_2_title}", "{service_3_title}",
      "{faq_1_question}", "{faq_1_answer}", "{faq_2_question}", "{faq_2_answer}", "{faq_3_question}", "{faq_3_answer}",
      "{review_1_text}", "{review_1_name}", "{review_2_text}", "{review_2_name}",
      "{review_3_text}", "{review_3_name}", "{review_4_text}", "{review_4_name}",
      "{blog_title}", "{post_1_title}", "{post_2_title}", "{post_3_title}",
      "{bottom_cta_headline}", "{bottom_cta_description}",
    ],
    category: "professional",
    tags: ["gardener", "landscaping", "garden", "lawn", "outdoor", "local", "booking"],
    author: "Community", downloads: 0, rating: 5.0,
    seo_title_pattern: "{company_name} — Garden & Landscaping | {headline}",
    seo_description_pattern: "{subheadline} Book your free appointment with {company_name}. Call {phone}.",
    schema_type: "LocalBusiness",
    defaultValues: {
      company_name: "Gardener",
      headline: "Your Outdoor Space, Rebuilt",
      subheadline: "With our expert team of gardeners and landscapers, we turn ordinary gardens into extraordinary havens of beauty.",
      cta_text: "Book Your Call",
      phone: "(595) 555-0123",
      ratings_count: "2000+",
      rating_value: "4.9",
      about_title: "Build a Space That Matches Your Home",
      about_body: "Whether you have a sprawling backyard or a cozy balcony, our team of experienced gardeners and landscapers is dedicated to bringing your green dreams to life.",
      feature_1: "Sustainable Gardening Practices",
      feature_2: "Personalized Services Available",
      services_title: "Our Services",
      services_subtitle: "Our team combines expertise with creativity to transform outdoor spaces into breathtaking landscapes that enhance the beauty of any property.",
      service_1_title: "Landscaping Works",
      service_2_title: "Garden Design",
      service_3_title: "Seasonal Planting",
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
      blog_title: "Explore Our Blog",
      post_1_title: "The Art of Designing Gardens: A Detailed Step-by-Step Guide",
      post_2_title: "Plant Spotlight: 10 Must-Have Perennials for Every Garden",
      post_3_title: "Garden Pest Control: Useful Strategies for a Healthy Garden",
      bottom_cta_headline: "Need a Gardener?",
      bottom_cta_description: "Let our expert team rebuild your outdoor space into a beautiful, thriving garden. Request your free quote today.",
    },
  },
];

// Final catalog: each template gets a derived `platform` and, for WordPress /
// Shopify / PrestaShop entries, a platform-native re-skin + wrapper classes so
// they look and publish natively on their target CMS.
export const COMMUNITY_TEMPLATES: MarketplaceTemplate[] = RAW_COMMUNITY_TEMPLATES.map((t) => {
  const platform = platformFromCategory(t.category);
  return platform === "generic"
    ? { ...t, platform }
    : { ...t, platform, content: applyPlatformTheme(t.content, platform) };
});
