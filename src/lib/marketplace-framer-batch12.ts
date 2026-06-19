// Framer-modelled marketplace templates — Batch 12 (1:1 design clones).
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

/* ───────── 67. SUMMIT — Coaching / consulting ───────── */
const summitCoaching = (): MarketplaceTemplate => ({
  id: "coaching-summit", name: "Coaching Consultant Template",
  description: "Warm, professional coaching landing with split hero and program cards.",
  content: base("sm", "--bg:#0e1014;--fg:#f5f3ee;--muted:#a39e94;--line:rgba(255,255,255,.1);--ac:#e0a458;--acbg:rgba(224,164,88,.16);--acsh:rgba(224,164,88,.3);--card:#15181e;--finalbg:linear-gradient(135deg,#1a1d24,#0e1014);background:var(--bg);color:var(--fg)") + body("sm", ["🎯", "🚀", "🧭"]),
  variables: VARS, category: "business", tags: ["coaching", "consulting", "mentor", "dark"],
  author: "Community", downloads: 312, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-coaching",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1552664730-d307ca884978", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Unlock your potential", hero_title: "Coaching that turns goals into results",
    hero_subtitle: "Personalized 1:1 coaching and proven frameworks to help you grow faster with clarity and confidence.",
    hero_image: U("1552664730-d307ca884978"), cta_primary: "Book a free call", cta_secondary: "See programs",
    services_title: "Programs built around you", services_subtitle: "Choose the path that fits where you are right now.",
    svc_1_title: "Career Acceleration", svc_1_desc: "Sharpen your strategy, land promotions, and lead with confidence.",
    svc_2_title: "Business Growth", svc_2_desc: "Scale revenue with clear systems and accountable execution.",
    svc_3_title: "Life Alignment", svc_3_desc: "Find balance and direction with structured weekly coaching.",
    final_title: "Ready to make your move?", final_subtitle: "Book a free discovery call and map out your next 90 days.",
    final_cta: "Start today",
  },
});

/* ───────── 68. CRAFT — Furniture / interior ───────── */
const craftFurniture = (): MarketplaceTemplate => ({
  id: "furniture-craft", name: "Furniture Interior Template",
  description: "Elegant light furniture landing with product cards and craftsmanship feel.",
  content: base("cf", "--bg:#f6f3ee;--fg:#221d17;--muted:#6b6258;--line:rgba(0,0,0,.1);--ac:#9a6b3f;--acbg:rgba(154,107,63,.14);--acsh:rgba(154,107,63,.3);--card:#fffdf9;--finalbg:linear-gradient(135deg,#efe7da,#f6f3ee);background:var(--bg);color:var(--fg)") + body("cf", ["🪑", "🛋️", "🪵"]),
  variables: VARS, category: "ecommerce", tags: ["furniture", "interior", "home", "light"],
  author: "Community", downloads: 287, rating: 4.7,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-furniture",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1555041469-a586c61ea9bc", 1200, 630),
  schema_type: "Store", platform: "generic",
  defaultValues: {
    eyebrow: "Handcrafted living", hero_title: "Furniture made to last a lifetime",
    hero_subtitle: "Timeless pieces crafted from solid wood and natural materials for the home you love.",
    hero_image: U("1555041469-a586c61ea9bc"), cta_primary: "Shop collection", cta_secondary: "Visit showroom",
    services_title: "Crafted with care", services_subtitle: "Every piece is built by hand and made to order.",
    svc_1_title: "Living Room", svc_1_desc: "Sofas, chairs, and tables designed for comfort and longevity.",
    svc_2_title: "Bedroom", svc_2_desc: "Beds and storage in warm, natural finishes that feel like home.",
    svc_3_title: "Custom Work", svc_3_desc: "Bespoke furniture tailored to your space and style.",
    final_title: "Bring warmth to your home", final_subtitle: "Explore the collection or book a showroom visit today.",
    final_cta: "Browse pieces",
  },
});

/* ───────── 69. VOLT — EV / automotive ───────── */
const voltAuto = (): MarketplaceTemplate => ({
  id: "automotive-volt", name: "Electric Vehicle Template",
  description: "Sleek dark EV/automotive landing with bold hero and spec cards.",
  content: base("vt", "--bg:#0a0c10;--fg:#eef2f6;--muted:#8a93a0;--line:rgba(255,255,255,.1);--ac:#2fd07b;--acbg:rgba(47,208,123,.16);--acsh:rgba(47,208,123,.3);--card:#11151b;--finalbg:linear-gradient(135deg,#101820,#0a0c10);background:var(--bg);color:var(--fg)") + body("vt", ["⚡", "🔋", "🛞"]),
  variables: VARS, category: "business", tags: ["automotive", "ev", "electric", "car", "dark"],
  author: "Community", downloads: 341, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-ev",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1560958089-b8a1929cea89", 1200, 630),
  schema_type: "Product", platform: "generic",
  defaultValues: {
    eyebrow: "Drive the future", hero_title: "Electric performance, redefined",
    hero_subtitle: "Zero emissions, instant torque, and a 400-mile range. The next era of driving starts here.",
    hero_image: U("1560958089-b8a1929cea89"), cta_primary: "Reserve now", cta_secondary: "Book a test drive",
    services_title: "Engineered to lead", services_subtitle: "Cutting-edge technology in every detail.",
    svc_1_title: "Instant Power", svc_1_desc: "0–60 in 3.2 seconds with smooth, silent acceleration.",
    svc_2_title: "Long Range", svc_2_desc: "Up to 400 miles per charge and fast 15-minute top-ups.",
    svc_3_title: "Smart Drive", svc_3_desc: "Advanced assist features and over-the-air updates.",
    final_title: "Your electric journey awaits", final_subtitle: "Reserve yours today or book a test drive near you.",
    final_cta: "Reserve yours",
  },
});

/* ───────── 70. HARVEST — Agriculture / organic farm ───────── */
const harvestFarm = (): MarketplaceTemplate => ({
  id: "agriculture-harvest", name: "Organic Farm Template",
  description: "Fresh, earthy farm landing with produce cards and natural tones.",
  content: base("hv", "--bg:#f4f7ee;--fg:#1f2a18;--muted:#5c6a4f;--line:rgba(0,0,0,.1);--ac:#5a9134;--acbg:rgba(90,145,52,.14);--acsh:rgba(90,145,52,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#e6efda,#f4f7ee);background:var(--bg);color:var(--fg)") + body("hv", ["🌾", "🥕", "🚜"]),
  variables: VARS, category: "business", tags: ["agriculture", "farm", "organic", "food", "light"],
  author: "Community", downloads: 256, rating: 4.7,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-farm",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1500937386664-56d1dfef3854", 1200, 630),
  schema_type: "Organization", platform: "generic",
  defaultValues: {
    eyebrow: "Farm to table", hero_title: "Fresh, organic produce grown with care",
    hero_subtitle: "Sustainably farmed fruits and vegetables delivered straight from our fields to your door.",
    hero_image: U("1500937386664-56d1dfef3854"), cta_primary: "Order a box", cta_secondary: "Our story",
    services_title: "Naturally better", services_subtitle: "Grown without pesticides, harvested at peak ripeness.",
    svc_1_title: "Seasonal Boxes", svc_1_desc: "Weekly deliveries of the freshest in-season produce.",
    svc_2_title: "Local & Organic", svc_2_desc: "Certified organic, grown right here on our family farm.",
    svc_3_title: "Sustainable", svc_3_desc: "Regenerative practices that care for the soil and planet.",
    final_title: "Taste the difference", final_subtitle: "Order your first box and enjoy farm-fresh goodness.",
    final_cta: "Start your box",
  },
});

/* ───────── 71. STAGE — Events / conference ───────── */
const stageEvent = (): MarketplaceTemplate => ({
  id: "event-stage", name: "Event Conference Template",
  description: "Energetic dark event landing with speaker/feature cards and bold CTA.",
  content: base("st", "--bg:#0c0a16;--fg:#f3f0fb;--muted:#9a93b0;--line:rgba(255,255,255,.1);--ac:#a855f7;--acbg:rgba(168,85,247,.18);--acsh:rgba(168,85,247,.35);--card:#16122a;--finalbg:linear-gradient(135deg,#1c1535,#0c0a16);background:var(--bg);color:var(--fg)") + body("st", ["🎤", "📅", "🎟️"]),
  variables: VARS, category: "business", tags: ["event", "conference", "summit", "dark"],
  author: "Community", downloads: 298, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-event",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1505373877841-8d25f7d46678", 1200, 630),
  schema_type: "Event", platform: "generic",
  defaultValues: {
    eyebrow: "The main event", hero_title: "Where ideas take the stage",
    hero_subtitle: "Two days of inspiring talks, hands-on workshops, and connections that shape your future.",
    hero_image: U("1505373877841-8d25f7d46678"), cta_primary: "Get tickets", cta_secondary: "View schedule",
    services_title: "What to expect", services_subtitle: "An experience designed to inform and inspire.",
    svc_1_title: "World-Class Speakers", svc_1_desc: "Hear from industry leaders sharing real, actionable insights.",
    svc_2_title: "Hands-On Workshops", svc_2_desc: "Practical sessions to build skills you can use immediately.",
    svc_3_title: "Networking", svc_3_desc: "Meet peers, partners, and mentors from around the world.",
    final_title: "Don't miss out", final_subtitle: "Early-bird tickets are limited — secure your seat now.",
    final_cta: "Reserve a ticket",
  },
});

/* ───────── 72. THREAD — Fashion / apparel ───────── */
const threadFashion = (): MarketplaceTemplate => ({
  id: "fashion-thread", name: "Fashion Apparel Template",
  description: "Minimal editorial fashion landing with product cards and clean type.",
  content: base("th", "--bg:#faf8f6;--fg:#1a1a1a;--muted:#777;--line:rgba(0,0,0,.1);--ac:#1a1a1a;--acbg:rgba(0,0,0,.06);--acsh:rgba(0,0,0,.2);--card:#ffffff;--finalbg:linear-gradient(135deg,#f1ece8,#faf8f6);background:var(--bg);color:var(--fg)") + body("th", ["👗", "🧥", "👟"]),
  variables: VARS, category: "ecommerce", tags: ["fashion", "apparel", "clothing", "style", "light"],
  author: "Community", downloads: 364, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-fashion",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1490481651871-ab68de25d43d", 1200, 630),
  schema_type: "Store", platform: "generic",
  defaultValues: {
    eyebrow: "New season", hero_title: "Wear what moves you",
    hero_subtitle: "Modern essentials and statement pieces crafted from premium, responsibly-sourced materials.",
    hero_image: U("1490481651871-ab68de25d43d"), cta_primary: "Shop the drop", cta_secondary: "Lookbook",
    services_title: "Designed to last", services_subtitle: "Timeless style meets conscious craftsmanship.",
    svc_1_title: "Everyday Essentials", svc_1_desc: "Versatile basics that pair with everything in your closet.",
    svc_2_title: "Statement Pieces", svc_2_desc: "Bold designs to make every outfit unforgettable.",
    svc_3_title: "Sustainable", svc_3_desc: "Ethically made with eco-friendly fabrics and fair labor.",
    final_title: "Refresh your wardrobe", final_subtitle: "Explore the new collection and find your next favorite.",
    final_cta: "Shop now",
  },
});

export const FRAMER_BATCH12_TEMPLATES: MarketplaceTemplate[] = [
  summitCoaching(),
  craftFurniture(),
  voltAuto(),
  harvestFarm(),
  stageEvent(),
  threadFashion(),
];
