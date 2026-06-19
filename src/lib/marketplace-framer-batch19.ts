// Framer-modelled marketplace templates — Batch 19 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────── shared base ───────── */
const base = (cls: string, vars: string, extra = "") => `<style>
.${cls}{${vars};font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.${cls} *{box-sizing:border-box;margin:0}
.${cls} .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.${cls} h1,.${cls} h2,.${cls} h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.${cls} .hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.${cls} .eye{display:inline-block;color:var(--ac);background:var(--acbg);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.${cls} .hero h1{font-size:clamp(38px,6vw,66px);margin-bottom:18px}
.${cls} .hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.${cls} .cta{display:flex;gap:14px;flex-wrap:wrap}
.${cls} .btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.${cls} .btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px var(--acsh)}
.${cls} .btn-p:hover{transform:translateY(-2px)}
.${cls} .btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.${cls} .hero img{width:100%;border-radius:18px;aspect-ratio:4/4;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.25)}
.${cls} .sec{padding:clamp(54px,8vw,100px) 0}
.${cls} .head{text-align:center;max-width:600px;margin:0 auto 48px}
.${cls} .head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.${cls} .head p{color:var(--muted);font-size:17px}
.${cls} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.${cls} .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:30px;transition:.25s}
.${cls} .card:hover{transform:translateY(-4px);border-color:var(--ac)}
.${cls} .card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:var(--acbg);margin-bottom:18px}
.${cls} .card h3{font-size:20px;margin-bottom:8px}
.${cls} .card p{color:var(--muted);font-size:15px}
.${cls} .final{text-align:center;background:var(--finalbg);border:1px solid var(--line);border-radius:20px;padding:clamp(54px,8vw,96px) 24px}
.${cls} .final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.${cls} .final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.${cls} .hero{grid-template-columns:1fr}.${cls} .grid{grid-template-columns:1fr}}
${extra}
</style>`;

const body = (cls: string, icons: [string, string, string]) => `<div class="${cls}">
  <section class="wrap hero">
    <div>
      <span class="eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="cta"><a class="btn btn-p" href="#">{cta_primary}</a><a class="btn btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="sec"><div class="wrap">
    <div class="head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="grid">
      <div class="card"><div class="ic">${icons[0]}</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="card"><div class="ic">${icons[1]}</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="card"><div class="ic">${icons[2]}</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="sec"><div class="wrap"><div class="final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="btn btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;

const VARS = [
  "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
  "{services_title}", "{services_subtitle}",
  "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
  "{final_title}", "{final_subtitle}", "{final_cta}",
];

/* ───────── 109. APEX — Real estate ───────── */
const apexRealEstate = (): MarketplaceTemplate => ({
  id: "realestate-apex", name: "Real Estate Template",
  description: "Polished real estate landing with listing-style cards and trustworthy tones.",
  content: base("ap", "--bg:#f5f7fa;--fg:#15212e;--muted:#586675;--line:rgba(0,0,0,.08);--ac:#1d4ed8;--acbg:rgba(29,78,216,.12);--acsh:rgba(29,78,216,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#dde6f3,#f5f7fa);background:var(--bg);color:var(--fg)") + body("ap", ["🏡", "🔑", "📈"]),
  variables: VARS, category: "business", tags: ["real-estate", "property", "homes", "light"],
  author: "Community", downloads: 287, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-realestate",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1560518883-ce09059eeffa", 1200, 630),
  schema_type: "RealEstateAgent", platform: "generic",
  defaultValues: {
    eyebrow: "Find your place", hero_title: "Homes that match your life",
    hero_subtitle: "Browse handpicked listings and work with agents who put your goals first — from first home to forever home.",
    hero_image: U("1560518883-ce09059eeffa"), cta_primary: "Browse listings", cta_secondary: "Talk to an agent",
    services_title: "How we help", services_subtitle: "Buy, sell, or invest with confidence.",
    svc_1_title: "Buy a Home", svc_1_desc: "Curated listings and expert guidance every step of the way.",
    svc_2_title: "Sell Smart", svc_2_desc: "Strategic pricing and marketing to sell faster, for more.",
    svc_3_title: "Invest", svc_3_desc: "Data-driven advice to grow your property portfolio.",
    final_title: "Ready to make a move?", final_subtitle: "Connect with an agent and start your search today.",
    final_cta: "Get started",
  },
});

/* ───────── 110. CLARITY — Consulting / professional ───────── */
const clarityConsulting = (): MarketplaceTemplate => ({
  id: "consulting-clarity", name: "Consulting Firm Template",
  description: "Sharp consulting landing with capability cards and authoritative tones.",
  content: base("cl", "--bg:#0e1117;--fg:#eef1f6;--muted:#8b94a3;--line:rgba(255,255,255,.1);--ac:#14b8a6;--acbg:rgba(20,184,166,.16);--acsh:rgba(20,184,166,.32);--card:#161b24;--finalbg:linear-gradient(135deg,#1a2230,#0e1117);background:var(--bg);color:var(--fg)") + body("cl", ["📊", "🎯", "🤝"]),
  variables: VARS, category: "business", tags: ["consulting", "advisory", "professional", "dark"],
  author: "Community", downloads: 271, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-consulting",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1454165804606-c3d57bc86b40", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Strategy that delivers", hero_title: "Clarity for your toughest decisions",
    hero_subtitle: "We partner with leaders to solve complex problems, unlock growth, and turn strategy into measurable results.",
    hero_image: U("1454165804606-c3d57bc86b40"), cta_primary: "Book a consultation", cta_secondary: "Our expertise",
    services_title: "What we do", services_subtitle: "Practical advisory, real outcomes.",
    svc_1_title: "Strategy", svc_1_desc: "Clear roadmaps that align teams around what matters.",
    svc_2_title: "Operations", svc_2_desc: "Streamlined processes that cut cost and boost output.",
    svc_3_title: "Growth", svc_3_desc: "Go-to-market plans that win customers and scale fast.",
    final_title: "Let's solve it together", final_subtitle: "Book a free discovery call and map your next move.",
    final_cta: "Get in touch",
  },
});

/* ───────── 111. LUMEN — Photography portfolio ───────── */
const lumenPhotography = (): MarketplaceTemplate => ({
  id: "photography-lumen", name: "Photography Portfolio Template",
  description: "Elegant photography portfolio landing with service cards and moody tones.",
  content: base("lm", "--bg:#0a0a0b;--fg:#f4f3f1;--muted:#9a988f;--line:rgba(255,255,255,.1);--ac:#d4a373;--acbg:rgba(212,163,115,.16);--acsh:rgba(212,163,115,.3);--card:#141312;--finalbg:linear-gradient(135deg,#1c1a17,#0a0a0b);background:var(--bg);color:var(--fg)") + body("lm", ["📷", "🎞️", "✨"]),
  variables: VARS, category: "portfolio", tags: ["photography", "portfolio", "creative", "dark"],
  author: "Community", downloads: 264, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-photography",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1452587925148-ce544e77e70d", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Moments, made timeless", hero_title: "Photography that tells your story",
    hero_subtitle: "Capturing weddings, portraits, and brands with a natural, cinematic eye — beautifully, every time.",
    hero_image: U("1452587925148-ce544e77e70d"), cta_primary: "View portfolio", cta_secondary: "Book a session",
    services_title: "What I shoot", services_subtitle: "Real moments, crafted with care.",
    svc_1_title: "Weddings", svc_1_desc: "Honest, emotional storytelling from your biggest day.",
    svc_2_title: "Portraits", svc_2_desc: "Natural portraits that feel like the real you.",
    svc_3_title: "Brand & Product", svc_3_desc: "Striking imagery that makes your brand stand out.",
    final_title: "Let's create together", final_subtitle: "Get in touch to check dates and plan your shoot.",
    final_cta: "Book now",
  },
});

/* ───────── 112. NEST — Interior design ───────── */
const nestInterior = (): MarketplaceTemplate => ({
  id: "interior-nest", name: "Interior Design Template",
  description: "Refined interior design landing with service cards and warm neutral tones.",
  content: base("ns", "--bg:#faf7f2;--fg:#2a2520;--muted:#766e63;--line:rgba(0,0,0,.08);--ac:#b08968;--acbg:rgba(176,137,104,.14);--acsh:rgba(176,137,104,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#efe6d8,#faf7f2);background:var(--bg);color:var(--fg)") + body("ns", ["🛋️", "🪴", "🎨"]),
  variables: VARS, category: "business", tags: ["interior", "design", "decor", "light"],
  author: "Community", downloads: 256, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-interior",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1586023492125-27b2c045efd7", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Spaces that feel like home", hero_title: "Interiors designed around you",
    hero_subtitle: "Thoughtful, livable spaces that balance beauty and function — tailored to how you really live.",
    hero_image: U("1586023492125-27b2c045efd7"), cta_primary: "Start your project", cta_secondary: "View our work",
    services_title: "How we work", services_subtitle: "From concept to the final cushion.",
    svc_1_title: "Full Design", svc_1_desc: "End-to-end design for rooms, homes, and renovations.",
    svc_2_title: "Styling", svc_2_desc: "Finishing touches that make a space truly yours.",
    svc_3_title: "Consultation", svc_3_desc: "Expert guidance to plan your space with confidence.",
    final_title: "Let's design your space", final_subtitle: "Book a consultation and bring your vision to life.",
    final_cta: "Get started",
  },
});

/* ───────── 113. PULSE — Health & fitness app ───────── */
const pulseHealth = (): MarketplaceTemplate => ({
  id: "healthapp-pulse", name: "Health App Template",
  description: "Energetic health/fitness app landing with feature cards and vivid accent.",
  content: base("pl", "--bg:#0a0f14;--fg:#eef6f2;--muted:#84968f;--line:rgba(255,255,255,.1);--ac:#10b981;--acbg:rgba(16,185,129,.16);--acsh:rgba(16,185,129,.32);--card:#101820;--finalbg:linear-gradient(135deg,#14202a,#0a0f14);background:var(--bg);color:var(--fg)") + body("pl", ["❤️", "📱", "🏃"]),
  variables: VARS, category: "business", tags: ["health", "fitness", "app", "dark"],
  author: "Community", downloads: 312, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-healthapp",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1576678927484-cc907957088c", 1200, 630),
  schema_type: "SoftwareApplication", platform: "generic",
  defaultValues: {
    eyebrow: "Your health, in your pocket", hero_title: "Track, move, and feel your best",
    hero_subtitle: "An all-in-one health app for workouts, nutrition, and sleep — personalized insights that keep you on track.",
    hero_image: U("1576678927484-cc907957088c"), cta_primary: "Download the app", cta_secondary: "See features",
    services_title: "Built for your goals", services_subtitle: "Everything you need to stay healthy, in one place.",
    svc_1_title: "Smart Tracking", svc_1_desc: "Log activity, meals, and sleep with effortless accuracy.",
    svc_2_title: "Personal Plans", svc_2_desc: "Adaptive programs that evolve as you progress.",
    svc_3_title: "Real Insights", svc_3_desc: "Clear data and tips that turn effort into results.",
    final_title: "Start feeling better today", final_subtitle: "Download the app free and build healthier habits.",
    final_cta: "Get the app",
  },
});

/* ───────── 114. ROAST — Coffee shop / café ───────── */
const roastCoffee = (): MarketplaceTemplate => ({
  id: "coffee-roast", name: "Coffee Shop Template",
  description: "Cozy coffee shop/café landing with menu cards and warm roasted tones.",
  content: base("rs", "--bg:#1a1410;--fg:#f5ece2;--muted:#a8978a;--line:rgba(255,255,255,.1);--ac:#c8783c;--acbg:rgba(200,120,60,.18);--acsh:rgba(200,120,60,.32);--card:#241b14;--finalbg:linear-gradient(135deg,#2a201a,#1a1410);background:var(--bg);color:var(--fg)") + body("rs", ["☕", "🥐", "🌱"]),
  variables: VARS, category: "ecommerce", tags: ["coffee", "cafe", "food", "dark"],
  author: "Community", downloads: 289, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-coffee",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1495474472287-4d71bcdd2085", 1200, 630),
  schema_type: "CafeOrCoffeeShop", platform: "generic",
  defaultValues: {
    eyebrow: "Freshly roasted daily", hero_title: "Coffee worth slowing down for",
    hero_subtitle: "Ethically sourced beans, roasted in small batches and brewed with care — your new favorite cup awaits.",
    hero_image: U("1495474472287-4d71bcdd2085"), cta_primary: "See the menu", cta_secondary: "Find us",
    services_title: "What's brewing", services_subtitle: "Crafted with love, served with a smile.",
    svc_1_title: "Specialty Coffee", svc_1_desc: "Single-origin and signature blends, expertly brewed.",
    svc_2_title: "Fresh Bakes", svc_2_desc: "Pastries and treats baked in-house every morning.",
    svc_3_title: "Plant-Based", svc_3_desc: "Delicious dairy-free options for every preference.",
    final_title: "Come say hello", final_subtitle: "Drop by for a cup, or order ahead and skip the line.",
    final_cta: "Order now",
  },
});

export const FRAMER_BATCH19_TEMPLATES: MarketplaceTemplate[] = [
  apexRealEstate(),
  clarityConsulting(),
  lumenPhotography(),
  nestInterior(),
  pulseHealth(),
  roastCoffee(),
];
