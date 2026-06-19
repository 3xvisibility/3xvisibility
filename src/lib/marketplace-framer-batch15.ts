// Framer-modelled marketplace templates — Batch 15 (1:1 design clones).
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

/* ───────── 85. LEDGER — Accounting / bookkeeping ───────── */
const ledgerAccounting = (): MarketplaceTemplate => ({
  id: "accounting-ledger", name: "Accounting Firm Template",
  description: "Trustworthy accounting/bookkeeping landing with service cards.",
  content: base("lg", "--bg:#f4f7fb;--fg:#15223a;--muted:#5d6b82;--line:rgba(0,0,0,.08);--ac:#2563eb;--acbg:rgba(37,99,235,.12);--acsh:rgba(37,99,235,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#e2eafa,#f4f7fb);background:var(--bg);color:var(--fg)") + body("lg", ["📊", "🧾", "💼"]),
  variables: VARS, category: "business", tags: ["accounting", "finance", "bookkeeping", "light"],
  author: "Community", downloads: 274, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-accounting",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1554224155-6726b3ff858f", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Numbers you can trust", hero_title: "Accounting that keeps you in control",
    hero_subtitle: "Clear bookkeeping, smart tax planning, and friendly advice to keep your finances healthy and stress-free.",
    hero_image: U("1554224155-6726b3ff858f"), cta_primary: "Get a quote", cta_secondary: "Our services",
    services_title: "How we help", services_subtitle: "Full-service accounting for individuals and businesses.",
    svc_1_title: "Bookkeeping", svc_1_desc: "Accurate, up-to-date records so you always know where you stand.",
    svc_2_title: "Tax Planning", svc_2_desc: "Minimize liabilities and file with total confidence.",
    svc_3_title: "Advisory", svc_3_desc: "Strategic guidance to help your business grow profitably.",
    final_title: "Take control of your finances", final_subtitle: "Book a free consultation and see how we can help.",
    final_cta: "Book consultation",
  },
});

/* ───────── 86. VOLT — EV charging / clean energy ───────── */
const voltEnergy = (): MarketplaceTemplate => ({
  id: "energy-volt", name: "Clean Energy Template",
  description: "Modern EV/clean energy landing with feature cards and fresh tones.",
  content: base("vt", "--bg:#061410;--fg:#e9fbf2;--muted:#88a99a;--line:rgba(255,255,255,.1);--ac:#34d399;--acbg:rgba(52,211,153,.16);--acsh:rgba(52,211,153,.32);--card:#0c1f18;--finalbg:linear-gradient(135deg,#0e2a1f,#061410);background:var(--bg);color:var(--fg)") + body("vt", ["⚡", "🔋", "🌍"]),
  variables: VARS, category: "business", tags: ["energy", "ev", "sustainability", "dark"],
  author: "Community", downloads: 318, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-energy",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1593941707882-a5bba14938c7", 1200, 630),
  schema_type: "Organization", platform: "generic",
  defaultValues: {
    eyebrow: "Power the future", hero_title: "Clean energy for everyone, everywhere",
    hero_subtitle: "Smart EV charging and renewable solutions that cut costs and shrink your carbon footprint.",
    hero_image: U("1593941707882-a5bba14938c7"), cta_primary: "Get started", cta_secondary: "Learn more",
    services_title: "What we offer", services_subtitle: "End-to-end clean energy solutions.",
    svc_1_title: "EV Charging", svc_1_desc: "Fast, reliable home and commercial charging stations.",
    svc_2_title: "Solar Storage", svc_2_desc: "Capture and store clean power for use day or night.",
    svc_3_title: "Smart Grid", svc_3_desc: "Optimize energy use with intelligent monitoring.",
    final_title: "Switch to clean energy", final_subtitle: "Join thousands powering their lives sustainably.",
    final_cta: "Get a quote",
  },
});

/* ───────── 87. NEST — Real estate / property ───────── */
const nestRealEstate = (): MarketplaceTemplate => ({
  id: "realestate-nest", name: "Real Estate Template",
  description: "Elegant real estate landing with listing-style cards and warm tones.",
  content: base("ns", "--bg:#faf7f2;--fg:#231d15;--muted:#6e6356;--line:rgba(0,0,0,.08);--ac:#b08945;--acbg:rgba(176,137,69,.14);--acsh:rgba(176,137,69,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#efe6d6,#faf7f2);background:var(--bg);color:var(--fg)") + body("ns", ["🏡", "🔑", "📍"]),
  variables: VARS, category: "business", tags: ["real-estate", "property", "homes", "light"],
  author: "Community", downloads: 341, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-realestate",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1560518883-ce09059eeffa", 1200, 630),
  schema_type: "RealEstateAgent", platform: "generic",
  defaultValues: {
    eyebrow: "Find your place", hero_title: "Homes that feel like you",
    hero_subtitle: "Browse curated listings and work with agents who put your needs first, from first viewing to keys in hand.",
    hero_image: U("1560518883-ce09059eeffa"), cta_primary: "View listings", cta_secondary: "Talk to an agent",
    services_title: "How we help", services_subtitle: "Buying, selling, and renting made simple.",
    svc_1_title: "Buy a Home", svc_1_desc: "Discover properties that match your lifestyle and budget.",
    svc_2_title: "Sell Faster", svc_2_desc: "Smart pricing and marketing to sell for the best price.",
    svc_3_title: "Rentals", svc_3_desc: "Quality rentals with a smooth, transparent process.",
    final_title: "Your dream home awaits", final_subtitle: "Let's find the perfect place for your next chapter.",
    final_cta: "Start searching",
  },
});

/* ───────── 88. PIXEL — Photography studio ───────── */
const pixelPhoto = (): MarketplaceTemplate => ({
  id: "photography-pixel", name: "Photography Studio Template",
  description: "Sleek dark photography portfolio landing with service cards.",
  content: base("px", "--bg:#0d0d0f;--fg:#f5f5f7;--muted:#9b9ba3;--line:rgba(255,255,255,.1);--ac:#ec4899;--acbg:rgba(236,72,153,.16);--acsh:rgba(236,72,153,.32);--card:#16161a;--finalbg:linear-gradient(135deg,#1c1c22,#0d0d0f);background:var(--bg);color:var(--fg)") + body("px", ["📷", "🎞️", "✨"]),
  variables: VARS, category: "business", tags: ["photography", "portfolio", "studio", "dark"],
  author: "Community", downloads: 302, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-photography",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1452587925148-ce544e77e70d", 1200, 630),
  schema_type: "ProfessionalService", platform: "generic",
  defaultValues: {
    eyebrow: "Moments, made timeless", hero_title: "Photography that tells your story",
    hero_subtitle: "From weddings to portraits and brands, we capture authentic moments with a refined, artful eye.",
    hero_image: U("1452587925148-ce544e77e70d"), cta_primary: "Book a session", cta_secondary: "View portfolio",
    services_title: "What we shoot", services_subtitle: "Tailored sessions for every occasion.",
    svc_1_title: "Weddings", svc_1_desc: "Candid, emotional storytelling for your special day.",
    svc_2_title: "Portraits", svc_2_desc: "Flattering, natural portraits for people and families.",
    svc_3_title: "Branding", svc_3_desc: "Striking visuals that elevate your business and products.",
    final_title: "Let's create something beautiful", final_subtitle: "Reach out to check availability and book your shoot.",
    final_cta: "Get in touch",
  },
});

/* ───────── 89. SPROUT — Garden / landscaping ───────── */
const sproutGarden = (): MarketplaceTemplate => ({
  id: "landscaping-sprout", name: "Landscaping Template",
  description: "Fresh garden/landscaping landing with service cards and green tones.",
  content: base("sp", "--bg:#f3f7ee;--fg:#1f2b16;--muted:#5f6b53;--line:rgba(0,0,0,.08);--ac:#4d7c2f;--acbg:rgba(77,124,47,.14);--acsh:rgba(77,124,47,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#e3eed4,#f3f7ee);background:var(--bg);color:var(--fg)") + body("sp", ["🌱", "🌳", "🪴"]),
  variables: VARS, category: "business", tags: ["landscaping", "garden", "outdoor", "light"],
  author: "Community", downloads: 256, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-landscaping",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1416879595882-3373a0480b5b", 1200, 630),
  schema_type: "LocalBusiness", platform: "generic",
  defaultValues: {
    eyebrow: "Grow something beautiful", hero_title: "Outdoor spaces you'll love to live in",
    hero_subtitle: "Thoughtful landscape design and reliable garden care to transform your yard into a green retreat.",
    hero_image: U("1416879595882-3373a0480b5b"), cta_primary: "Get a free quote", cta_secondary: "See our work",
    services_title: "What we do", services_subtitle: "Design, build, and maintain — all in one place.",
    svc_1_title: "Landscape Design", svc_1_desc: "Custom plans that fit your space, style, and budget.",
    svc_2_title: "Garden Care", svc_2_desc: "Regular maintenance to keep everything lush and tidy.",
    svc_3_title: "Hardscaping", svc_3_desc: "Patios, paths, and features built to last for years.",
    final_title: "Transform your outdoors", final_subtitle: "Book a free site visit and let's bring your vision to life.",
    final_cta: "Request a quote",
  },
});

/* ───────── 90. FORGE — Barber / grooming ───────── */
const forgeBarber = (): MarketplaceTemplate => ({
  id: "barber-forge", name: "Barbershop Template",
  description: "Bold dark barbershop/grooming landing with service cards.",
  content: base("fg", "--bg:#121013;--fg:#f3eee8;--muted:#9c9189;--line:rgba(255,255,255,.1);--ac:#c08a4a;--acbg:rgba(192,138,74,.16);--acsh:rgba(192,138,74,.32);--card:#1b181c;--finalbg:linear-gradient(135deg,#221d22,#121013);background:var(--bg);color:var(--fg)") + body("fg", ["💈", "✂️", "🪒"]),
  variables: VARS, category: "business", tags: ["barber", "grooming", "salon", "dark"],
  author: "Community", downloads: 288, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-barber",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1503951914875-452162b0f3f1", 1200, 630),
  schema_type: "HairSalon", platform: "generic",
  defaultValues: {
    eyebrow: "Sharp looks, every time", hero_title: "Classic cuts, modern style",
    hero_subtitle: "Master barbers delivering precision cuts, clean shaves, and grooming that keeps you looking your best.",
    hero_image: U("1503951914875-452162b0f3f1"), cta_primary: "Book now", cta_secondary: "View services",
    services_title: "Our services", services_subtitle: "Premium grooming for the modern gentleman.",
    svc_1_title: "Haircuts", svc_1_desc: "Tailored cuts and styling to suit your look.",
    svc_2_title: "Shaves", svc_2_desc: "Traditional hot-towel shaves for the smoothest finish.",
    svc_3_title: "Beard Care", svc_3_desc: "Expert trims and grooming to keep your beard sharp.",
    final_title: "Look your best", final_subtitle: "Walk-ins welcome — or book your chair in seconds.",
    final_cta: "Book a chair",
  },
});

export const FRAMER_BATCH15_TEMPLATES: MarketplaceTemplate[] = [
  ledgerAccounting(),
  voltEnergy(),
  nestRealEstate(),
  pixelPhoto(),
  sproutGarden(),
  forgeBarber(),
];
