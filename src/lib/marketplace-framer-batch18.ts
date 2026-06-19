// Framer-modelled marketplace templates — Batch 18 (1:1 design clones).
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

/* ───────── 103. HAUL — Moving / logistics ───────── */
const haulMoving = (): MarketplaceTemplate => ({
  id: "moving-haul", name: "Moving Company Template",
  description: "Reliable moving/logistics landing with service cards and bold tones.",
  content: base("hl", "--bg:#f3f6fb;--fg:#16202e;--muted:#5c6779;--line:rgba(0,0,0,.08);--ac:#ea580c;--acbg:rgba(234,88,12,.12);--acsh:rgba(234,88,12,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#e3eaf5,#f3f6fb);background:var(--bg);color:var(--fg)") + body("hl", ["📦", "🚚", "🏠"]),
  variables: VARS, category: "business", tags: ["moving", "logistics", "delivery", "light"],
  author: "Community", downloads: 258, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-moving",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1600585154340-be6161a56a0c", 1200, 630),
  schema_type: "MovingCompany", platform: "generic",
  defaultValues: {
    eyebrow: "Stress-free moving", hero_title: "We move your world with care",
    hero_subtitle: "Professional movers who pack, transport, and unpack your belongings safely — so you can settle in faster.",
    hero_image: U("1600585154340-be6161a56a0c"), cta_primary: "Get a free quote", cta_secondary: "Our services",
    services_title: "How we help", services_subtitle: "Full-service moving for homes and businesses.",
    svc_1_title: "Local Moves", svc_1_desc: "Fast, careful moves across town with zero hassle.",
    svc_2_title: "Long Distance", svc_2_desc: "Reliable interstate relocation, tracked every mile.",
    svc_3_title: "Packing", svc_3_desc: "Expert packing and supplies to protect what matters.",
    final_title: "Ready to move?", final_subtitle: "Get a free, no-obligation quote in just minutes.",
    final_cta: "Request a quote",
  },
});

/* ───────── 104. FRESH — Grocery / organic food ───────── */
const freshGrocery = (): MarketplaceTemplate => ({
  id: "grocery-fresh", name: "Organic Grocery Template",
  description: "Wholesome organic grocery landing with product cards and green tones.",
  content: base("fr", "--bg:#f4f8ef;--fg:#1c2914;--muted:#5e6c50;--line:rgba(0,0,0,.08);--ac:#5a9216;--acbg:rgba(90,146,22,.12);--acsh:rgba(90,146,22,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#e4f0d3,#f4f8ef);background:var(--bg);color:var(--fg)") + body("fr", ["🥬", "🍎", "🥕"]),
  variables: VARS, category: "ecommerce", tags: ["grocery", "organic", "food", "light"],
  author: "Community", downloads: 276, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-grocery",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1542838132-92c53300491e", 1200, 630),
  schema_type: "GroceryStore", platform: "generic",
  defaultValues: {
    eyebrow: "Fresh from the farm", hero_title: "Real food, delivered to your door",
    hero_subtitle: "Locally sourced organic produce and pantry staples, picked at peak freshness and brought straight to you.",
    hero_image: U("1542838132-92c53300491e"), cta_primary: "Shop groceries", cta_secondary: "How it works",
    services_title: "Why shop with us", services_subtitle: "Fresher food, fairer prices, zero compromise.",
    svc_1_title: "Organic Produce", svc_1_desc: "Seasonal fruits and veg from trusted local farms.",
    svc_2_title: "Pantry Staples", svc_2_desc: "Wholesome essentials with clean, honest labels.",
    svc_3_title: "Fast Delivery", svc_3_desc: "Same-day delivery slots that fit your schedule.",
    final_title: "Eat better, effortlessly", final_subtitle: "Start your first order and taste the difference today.",
    final_cta: "Shop now",
  },
});

/* ───────── 105. SIGNAL — Podcast / media ───────── */
const signalPodcast = (): MarketplaceTemplate => ({
  id: "podcast-signal", name: "Podcast Template",
  description: "Bold dark podcast/media landing with episode cards and vibrant accent.",
  content: base("sg", "--bg:#0b0a12;--fg:#f1eef9;--muted:#928bab;--line:rgba(255,255,255,.1);--ac:#f43f5e;--acbg:rgba(244,63,94,.16);--acsh:rgba(244,63,94,.32);--card:#14111f;--finalbg:linear-gradient(135deg,#1b1730,#0b0a12);background:var(--bg);color:var(--fg)") + body("sg", ["🎙️", "🎧", "📻"]),
  variables: VARS, category: "business", tags: ["podcast", "media", "audio", "dark"],
  author: "Community", downloads: 298, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-podcast",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1478737270239-2f02b77fc618", 1200, 630),
  schema_type: "PodcastSeries", platform: "generic",
  defaultValues: {
    eyebrow: "New episode every week", hero_title: "Conversations worth your ears",
    hero_subtitle: "Honest interviews, big ideas, and stories that stick — tune in wherever you get your podcasts.",
    hero_image: U("1478737270239-2f02b77fc618"), cta_primary: "Listen now", cta_secondary: "Browse episodes",
    services_title: "What's inside", services_subtitle: "Real talk with the people shaping our world.",
    svc_1_title: "Deep Interviews", svc_1_desc: "Long-form chats that go beyond the surface.",
    svc_2_title: "Weekly Drops", svc_2_desc: "Fresh episodes every week, right on schedule.",
    svc_3_title: "Bonus Content", svc_3_desc: "Exclusive extras and ad-free listening for members.",
    final_title: "Never miss an episode", final_subtitle: "Subscribe and join the conversation today.",
    final_cta: "Subscribe",
  },
});

/* ───────── 106. CRAFT — Handmade / artisan shop ───────── */
const craftShop = (): MarketplaceTemplate => ({
  id: "artisan-craft", name: "Artisan Shop Template",
  description: "Warm handmade/artisan shop landing with product cards and cozy tones.",
  content: base("cf", "--bg:#faf6f0;--fg:#2b2118;--muted:#74675a;--line:rgba(0,0,0,.08);--ac:#a96b3f;--acbg:rgba(169,107,63,.14);--acsh:rgba(169,107,63,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#efe2d3,#faf6f0);background:var(--bg);color:var(--fg)") + body("cf", ["🪡", "🎨", "🧶"]),
  variables: VARS, category: "ecommerce", tags: ["artisan", "handmade", "crafts", "light"],
  author: "Community", downloads: 244, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-artisan",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1452860606245-08befc0ff44b", 1200, 630),
  schema_type: "OnlineStore", platform: "generic",
  defaultValues: {
    eyebrow: "Made by hand, made to last", hero_title: "Handcrafted goods with a story",
    hero_subtitle: "Lovingly made pieces from independent makers — unique, sustainable, and built to be treasured.",
    hero_image: U("1452860606245-08befc0ff44b"), cta_primary: "Shop the collection", cta_secondary: "Meet the makers",
    services_title: "Why handmade", services_subtitle: "Every piece is one of a kind, just like you.",
    svc_1_title: "Unique Pieces", svc_1_desc: "No two items are ever exactly the same.",
    svc_2_title: "Sustainable", svc_2_desc: "Natural materials and small-batch, low-waste craft.",
    svc_3_title: "Support Makers", svc_3_desc: "Every purchase directly supports an independent artisan.",
    final_title: "Find something special", final_subtitle: "Browse the collection and discover your next treasure.",
    final_cta: "Shop now",
  },
});

/* ───────── 107. FLOW — Plumbing / home services ───────── */
const flowPlumbing = (): MarketplaceTemplate => ({
  id: "plumbing-flow", name: "Plumbing Services Template",
  description: "Dependable plumbing/home-services landing with service cards.",
  content: base("fl", "--bg:#eef4fa;--fg:#11202f;--muted:#566879;--line:rgba(0,0,0,.08);--ac:#0369a1;--acbg:rgba(3,105,161,.12);--acsh:rgba(3,105,161,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#d8e8f4,#eef4fa);background:var(--bg);color:var(--fg)") + body("fl", ["🔧", "🚿", "🛠️"]),
  variables: VARS, category: "business", tags: ["plumbing", "home-services", "repair", "light"],
  author: "Community", downloads: 252, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-plumbing",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1607472586893-edb57bdc0e39", 1200, 630),
  schema_type: "Plumber", platform: "generic",
  defaultValues: {
    eyebrow: "Fast, reliable, fair", hero_title: "Plumbing problems solved, fast",
    hero_subtitle: "Licensed plumbers available around the clock for repairs, installs, and emergencies — done right the first time.",
    hero_image: U("1607472586893-edb57bdc0e39"), cta_primary: "Book a plumber", cta_secondary: "Our services",
    services_title: "What we fix", services_subtitle: "Honest pricing, quality work, no surprises.",
    svc_1_title: "Repairs", svc_1_desc: "Leaks, clogs, and breakdowns fixed quickly and cleanly.",
    svc_2_title: "Installations", svc_2_desc: "Fixtures, water heaters, and full system installs.",
    svc_3_title: "Emergencies", svc_3_desc: "24/7 rapid response when you need help most.",
    final_title: "Need a plumber now?", final_subtitle: "Call us or book online for fast, friendly service.",
    final_cta: "Get help now",
  },
});

/* ───────── 108. PIXELCRAFT — Design studio / agency ───────── */
const pixelcraftDesign = (): MarketplaceTemplate => ({
  id: "design-pixelcraft", name: "Design Studio Template",
  description: "Bold creative design studio landing with service cards and vivid gradient.",
  content: base("pc", "--bg:#0c0a18;--fg:#f3eefb;--muted:#9489ac;--line:rgba(255,255,255,.1);--ac:#a855f7;--acbg:rgba(168,85,247,.18);--acsh:rgba(168,85,247,.34);--card:#15112a;--finalbg:linear-gradient(135deg,#1d1638,#0c0a18);background:var(--bg);color:var(--fg)") + body("pc", ["🎨", "✏️", "💡"]),
  variables: VARS, category: "business", tags: ["design", "studio", "creative", "dark"],
  author: "Community", downloads: 339, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-design",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1561070791-2526d30994b5", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Design that delights", hero_title: "We craft brands people remember",
    hero_subtitle: "A creative studio turning bold ideas into beautiful brands, websites, and experiences that connect.",
    hero_image: U("1561070791-2526d30994b5"), cta_primary: "Start a project", cta_secondary: "View our work",
    services_title: "What we make", services_subtitle: "Design that's as strategic as it is striking.",
    svc_1_title: "Branding", svc_1_desc: "Identities that capture who you are and what you stand for.",
    svc_2_title: "Web Design", svc_2_desc: "Beautiful, fast websites built to convert and delight.",
    svc_3_title: "Product UI/UX", svc_3_desc: "Intuitive interfaces your users will actually love.",
    final_title: "Let's make something", final_subtitle: "Tell us about your project and let's create together.",
    final_cta: "Get in touch",
  },
});

export const FRAMER_BATCH18_TEMPLATES: MarketplaceTemplate[] = [
  haulMoving(),
  freshGrocery(),
  signalPodcast(),
  craftShop(),
  flowPlumbing(),
  pixelcraftDesign(),
];
