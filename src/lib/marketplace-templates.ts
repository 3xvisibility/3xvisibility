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
  isShared?: boolean;
  shared_id?: string;
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
.pgp-page *{box-sizing:border-box}
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

// ── Page builder ───────────────────────────────────────────────────────────
const page = (sections: string) => `${BASE_STYLES}
<div class="pgp-page">
  <div class="pgp-wrap">
    ${sections}
  </div>
</div>`;

// ── Templates ──────────────────────────────────────────────────────────────
export const COMMUNITY_TEMPLATES: MarketplaceTemplate[] = [
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

  // 3. SaaS landing
  {
    id: "saas-landing",
    name: "SaaS Feature Landing",
    description: "Modern SaaS landing with hero image, feature grid, testimonials, FAQ and final CTA.",
    content: page(
      hero({ bgKeywords: "modern saas dashboard team office", badge: "🚀 New for teams", title: "{headline}", subtitle: "{subheadline}", primaryCta: "{cta_text} →", secondaryCta: "Watch Demo", sig: 3 }) +
      trustStrip([{ num: "10K+", lbl: "Active Users" }, { num: "99.9%", lbl: "Uptime" }, { num: "50M+", lbl: "API Calls/Day" }, { num: "4.9★", lbl: "User Rating" }]) +
      featureGrid("Features", "Why {product_name}?", "Everything you need to scale your business, all in one platform.", [
        { icon: "⚡", title: "{feature_1_title}", desc: "{feature_1_desc}" },
        { icon: "📊", title: "{feature_2_title}", desc: "{feature_2_desc}" },
        { icon: "🔒", title: "{feature_3_title}", desc: "{feature_3_desc}" },
      ]) +
      aboutSplit("Built for teams", "Powerful collaboration, simple workflows", "Bring everyone together in one workspace. Real-time updates, granular permissions, and integrations with the tools you already use.", "team collaboration laptop modern", 8) +
      gallery("Product tour", "See {product_name} in action", ["software dashboard", "data analytics", "team collaboration", "remote work", "saas interface", "mobile app"]) +
      defaultTestimonials +
      faq([
        { q: "Is there a free trial?", a: "Yes — 14 days, no credit card required. Cancel anytime." },
        { q: "Can I change plans later?", a: "Absolutely. Upgrade or downgrade in one click from your account settings." },
        { q: "Do you offer SSO?", a: "Yes, SSO and SAML are available on our Business and Enterprise plans." },
      ]) +
      ctaBand({ bgKeywords: "futuristic technology gradient", title: "{bottom_cta_headline}", subtitle: "{bottom_cta_description}", cta: "{cta_text} →", sig: 13 })
    ),
    variables: ["{headline}", "{subheadline}", "{product_name}", "{cta_text}", "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}", "{bottom_cta_headline}", "{bottom_cta_description}"],
    category: "saas",
    tags: ["saas", "landing", "features", "startup"],
    author: "Community", downloads: 1563, rating: 4.9,
    seo_title_pattern: "{headline} | {product_name}",
    seo_description_pattern: "{subheadline}",
    schema_type: "WebPage",
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
];
