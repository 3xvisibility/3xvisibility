// Framer-modelled marketplace templates — Batch 14 (1:1 design clones).
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

/* ───────── 79. FLEX — Yoga / wellness studio ───────── */
const flexYoga = (): MarketplaceTemplate => ({
  id: "yoga-flex", name: "Yoga Wellness Template",
  description: "Calm, airy yoga studio landing with class cards and soft tones.",
  content: base("fx", "--bg:#f5f3ef;--fg:#26221c;--muted:#6f685c;--line:rgba(0,0,0,.08);--ac:#7c8f5a;--acbg:rgba(124,143,90,.14);--acsh:rgba(124,143,90,.3);--card:#fffdf9;--finalbg:linear-gradient(135deg,#e8ebdc,#f5f3ef);background:var(--bg);color:var(--fg)") + body("fx", ["🧘", "🌿", "🕉️"]),
  variables: VARS, category: "business", tags: ["yoga", "wellness", "fitness", "light"],
  author: "Community", downloads: 289, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-yoga",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1545205597-3d9d02c29597", 1200, 630),
  schema_type: "LocalBusiness", platform: "generic",
  defaultValues: {
    eyebrow: "Find your balance", hero_title: "Breathe, move, and feel renewed",
    hero_subtitle: "Welcoming yoga and meditation classes for every body and every level, in a calm and caring space.",
    hero_image: U("1545205597-3d9d02c29597"), cta_primary: "Book a class", cta_secondary: "View schedule",
    services_title: "Classes for everyone", services_subtitle: "From gentle flows to dynamic practice.",
    svc_1_title: "Vinyasa Flow", svc_1_desc: "Build strength and flexibility with breath-linked movement.",
    svc_2_title: "Restorative", svc_2_desc: "Slow, supported poses to release tension and reset.",
    svc_3_title: "Meditation", svc_3_desc: "Guided sessions to quiet the mind and find stillness.",
    final_title: "Begin your practice", final_subtitle: "Your first class is on us — book your spot today.",
    final_cta: "Claim free class",
  },
});

/* ───────── 80. BUILD — Architecture studio ───────── */
const buildArch = (): MarketplaceTemplate => ({
  id: "architecture-build", name: "Architecture Studio Template",
  description: "Minimal monochrome architecture landing with project cards.",
  content: base("bd", "--bg:#0f0f0f;--fg:#f2f2f2;--muted:#9a9a9a;--line:rgba(255,255,255,.12);--ac:#d8b777;--acbg:rgba(216,183,119,.14);--acsh:rgba(216,183,119,.28);--card:#171717;--finalbg:linear-gradient(135deg,#1c1c1c,#0f0f0f);background:var(--bg);color:var(--fg)") + body("bd", ["📐", "🏛️", "🪟"]),
  variables: VARS, category: "business", tags: ["architecture", "design", "studio", "dark"],
  author: "Community", downloads: 312, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-architecture",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1487958449943-2429e8be8625", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Form meets function", hero_title: "Spaces designed to inspire",
    hero_subtitle: "An award-winning studio crafting timeless architecture that balances beauty, light, and purpose.",
    hero_image: U("1487958449943-2429e8be8625"), cta_primary: "Start a project", cta_secondary: "View work",
    services_title: "What we do", services_subtitle: "End-to-end design for residential and commercial spaces.",
    svc_1_title: "Residential", svc_1_desc: "Bespoke homes designed around how you live and dream.",
    svc_2_title: "Commercial", svc_2_desc: "Functional, striking spaces that elevate your brand.",
    svc_3_title: "Interiors", svc_3_desc: "Cohesive interior design from concept to completion.",
    final_title: "Let's build something", final_subtitle: "Share your vision and we'll bring it to life.",
    final_cta: "Get in touch",
  },
});

/* ───────── 81. PAWS — Veterinary / pet care ───────── */
const pawsVet = (): MarketplaceTemplate => ({
  id: "vet-paws", name: "Veterinary Clinic Template",
  description: "Warm, friendly vet/pet care landing with service cards.",
  content: base("pw", "--bg:#fef6ef;--fg:#2b1d12;--muted:#7a675a;--line:rgba(0,0,0,.08);--ac:#f0883e;--acbg:rgba(240,136,62,.14);--acsh:rgba(240,136,62,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#fde7d4,#fef6ef);background:var(--bg);color:var(--fg)") + body("pw", ["🐾", "🩺", "🐕"]),
  variables: VARS, category: "business", tags: ["veterinary", "pet", "clinic", "light"],
  author: "Community", downloads: 267, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-vet",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1517849845537-4d257902454a", 1200, 630),
  schema_type: "VeterinaryCare", platform: "generic",
  defaultValues: {
    eyebrow: "Caring for your best friend", hero_title: "Compassionate care for happy pets",
    hero_subtitle: "Gentle, expert veterinary services to keep your furry family members healthy and thriving.",
    hero_image: U("1517849845537-4d257902454a"), cta_primary: "Book a visit", cta_secondary: "Our services",
    services_title: "How we help", services_subtitle: "Full-service care for cats, dogs, and more.",
    svc_1_title: "Wellness Exams", svc_1_desc: "Routine check-ups and vaccinations to prevent illness.",
    svc_2_title: "Surgery & Dental", svc_2_desc: "Safe, modern procedures with caring aftercare.",
    svc_3_title: "Emergency Care", svc_3_desc: "Fast, compassionate help when your pet needs it most.",
    final_title: "Your pet deserves the best", final_subtitle: "Schedule a visit and meet our caring team today.",
    final_cta: "Book appointment",
  },
});

/* ───────── 82. STREAM — Music / artist ───────── */
const streamMusic = (): MarketplaceTemplate => ({
  id: "music-stream", name: "Music Artist Template",
  description: "Vibrant dark music/artist landing with release cards and bold visuals.",
  content: base("sr", "--bg:#0a0612;--fg:#f4eefb;--muted:#a094b5;--line:rgba(255,255,255,.1);--ac:#7c3aed;--acbg:rgba(124,58,237,.18);--acsh:rgba(124,58,237,.35);--card:#150e24;--finalbg:linear-gradient(135deg,#1d1336,#0a0612);background:var(--bg);color:var(--fg)") + body("sr", ["🎵", "🎧", "🎤"]),
  variables: VARS, category: "business", tags: ["music", "artist", "band", "dark"],
  author: "Community", downloads: 334, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-music",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1493225457124-a3eb161ffa5f", 1200, 630),
  schema_type: "MusicGroup", platform: "generic",
  defaultValues: {
    eyebrow: "New release out now", hero_title: "Sound that moves you",
    hero_subtitle: "Stream the latest tracks, catch upcoming shows, and join the journey of a sound like no other.",
    hero_image: U("1493225457124-a3eb161ffa5f"), cta_primary: "Listen now", cta_secondary: "Tour dates",
    services_title: "Get closer", services_subtitle: "Everything you need to stay in the loop.",
    svc_1_title: "Latest Album", svc_1_desc: "Stream the new record on all your favorite platforms.",
    svc_2_title: "Live Shows", svc_2_desc: "Find tour dates and grab tickets before they're gone.",
    svc_3_title: "Exclusive Drops", svc_3_desc: "Merch, demos, and behind-the-scenes for true fans.",
    final_title: "Join the movement", final_subtitle: "Follow along and never miss a beat — sign up today.",
    final_cta: "Follow now",
  },
});

/* ───────── 83. GROW — Marketing agency ───────── */
const growAgency = (): MarketplaceTemplate => ({
  id: "marketing-grow", name: "Marketing Agency Template",
  description: "Bold modern marketing agency landing with service cards and stats.",
  content: base("gr", "--bg:#0b0f1a;--fg:#eef2fb;--muted:#8b97ad;--line:rgba(255,255,255,.1);--ac:#22c1a4;--acbg:rgba(34,193,164,.16);--acsh:rgba(34,193,164,.3);--card:#121826;--finalbg:linear-gradient(135deg,#13202c,#0b0f1a);background:var(--bg);color:var(--fg)") + body("gr", ["📈", "🎯", "💡"]),
  variables: VARS, category: "business", tags: ["marketing", "agency", "growth", "dark"],
  author: "Community", downloads: 356, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-marketing",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1460925895917-afdab827c52f", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Growth, engineered", hero_title: "Marketing that drives real results",
    hero_subtitle: "Data-driven campaigns, sharp creative, and relentless optimization to scale your brand faster.",
    hero_image: U("1460925895917-afdab827c52f"), cta_primary: "Get a proposal", cta_secondary: "See case studies",
    services_title: "What we deliver", services_subtitle: "Full-funnel marketing built to convert.",
    svc_1_title: "Performance Ads", svc_1_desc: "ROI-focused paid campaigns across every major channel.",
    svc_2_title: "SEO & Content", svc_2_desc: "Rank higher and earn traffic that compounds over time.",
    svc_3_title: "Brand & Creative", svc_3_desc: "Standout visuals and messaging that make you memorable.",
    final_title: "Ready to grow?", final_subtitle: "Let's build a strategy that moves your numbers up.",
    final_cta: "Book a call",
  },
});

/* ───────── 84. HEARTH — Bakery / pastry ───────── */
const hearthBakery = (): MarketplaceTemplate => ({
  id: "bakery-hearth", name: "Bakery Pastry Template",
  description: "Warm, appetizing bakery landing with product cards and cozy tones.",
  content: base("hr", "--bg:#fbf3e9;--fg:#3a2415;--muted:#7c6450;--line:rgba(0,0,0,.1);--ac:#c9742e;--acbg:rgba(201,116,46,.14);--acsh:rgba(201,116,46,.3);--card:#fffdf8;--finalbg:linear-gradient(135deg,#f3e1c9,#fbf3e9);background:var(--bg);color:var(--fg)") + body("hr", ["🥖", "🧁", "🥧"]),
  variables: VARS, category: "ecommerce", tags: ["bakery", "pastry", "food", "light"],
  author: "Community", downloads: 295, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-bakery",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1509440159596-0249088772ff", 1200, 630),
  schema_type: "Bakery", platform: "generic",
  defaultValues: {
    eyebrow: "Baked fresh daily", hero_title: "Handmade bread and pastries with love",
    hero_subtitle: "Artisan loaves, flaky croissants, and decadent cakes baked from scratch every single morning.",
    hero_image: U("1509440159596-0249088772ff"), cta_primary: "Order online", cta_secondary: "See the menu",
    services_title: "From our oven", services_subtitle: "Real ingredients, traditional techniques, irresistible taste.",
    svc_1_title: "Artisan Breads", svc_1_desc: "Slow-fermented sourdough and rustic loaves baked daily.",
    svc_2_title: "Pastries", svc_2_desc: "Buttery croissants, danishes, and seasonal treats.",
    svc_3_title: "Custom Cakes", svc_3_desc: "Beautiful, delicious cakes for every celebration.",
    final_title: "Treat yourself today", final_subtitle: "Order ahead for pickup or stop by and say hello.",
    final_cta: "Order now",
  },
});

export const FRAMER_BATCH14_TEMPLATES: MarketplaceTemplate[] = [
  flexYoga(),
  buildArch(),
  pawsVet(),
  streamMusic(),
  growAgency(),
  hearthBakery(),
];
