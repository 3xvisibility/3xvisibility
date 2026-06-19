// Framer-modelled marketplace templates — Batch 16 (1:1 design clones).
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

/* ───────── 91. CASE — Law firm ───────── */
const caseLaw = (): MarketplaceTemplate => ({
  id: "law-case", name: "Law Firm Template",
  description: "Authoritative law firm landing with practice-area cards and dark tones.",
  content: base("cs", "--bg:#0e131c;--fg:#eef2f8;--muted:#8a97ab;--line:rgba(255,255,255,.1);--ac:#b08d57;--acbg:rgba(176,141,87,.16);--acsh:rgba(176,141,87,.3);--card:#151c28;--finalbg:linear-gradient(135deg,#1a2433,#0e131c);background:var(--bg);color:var(--fg)") + body("cs", ["⚖️", "📜", "🤝"]),
  variables: VARS, category: "business", tags: ["law", "legal", "attorney", "dark"],
  author: "Community", downloads: 281, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-law",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1589829545856-d10d557cf95f", 1200, 630),
  schema_type: "LegalService", platform: "generic",
  defaultValues: {
    eyebrow: "Justice, done right", hero_title: "Trusted legal counsel when it matters most",
    hero_subtitle: "Experienced attorneys fighting for your rights with integrity, clarity, and relentless dedication.",
    hero_image: U("1589829545856-d10d557cf95f"), cta_primary: "Free consultation", cta_secondary: "Our practice areas",
    services_title: "Practice areas", services_subtitle: "Comprehensive legal services you can rely on.",
    svc_1_title: "Family Law", svc_1_desc: "Compassionate guidance through divorce, custody, and more.",
    svc_2_title: "Corporate Law", svc_2_desc: "Protect and grow your business with sound counsel.",
    svc_3_title: "Litigation", svc_3_desc: "Aggressive representation to win the outcome you deserve.",
    final_title: "Let us fight for you", final_subtitle: "Schedule a confidential consultation with our team today.",
    final_cta: "Talk to a lawyer",
  },
});

/* ───────── 92. PULSE — Medical / clinic ───────── */
const pulseClinic = (): MarketplaceTemplate => ({
  id: "medical-pulse", name: "Medical Clinic Template",
  description: "Clean, reassuring medical clinic landing with service cards.",
  content: base("pl", "--bg:#f1f8fa;--fg:#0f2b33;--muted:#557079;--line:rgba(0,0,0,.07);--ac:#0ea5b7;--acbg:rgba(14,165,183,.12);--acsh:rgba(14,165,183,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#dcf0f3,#f1f8fa);background:var(--bg);color:var(--fg)") + body("pl", ["🩺", "❤️", "💊"]),
  variables: VARS, category: "business", tags: ["medical", "clinic", "health", "light"],
  author: "Community", downloads: 309, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-clinic",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1576091160550-2173dba999ef", 1200, 630),
  schema_type: "MedicalClinic", platform: "generic",
  defaultValues: {
    eyebrow: "Your health, our priority", hero_title: "Modern care for a healthier you",
    hero_subtitle: "Patient-first medical care from a caring team, with same-day appointments and a comfortable clinic.",
    hero_image: U("1576091160550-2173dba999ef"), cta_primary: "Book appointment", cta_secondary: "Our services",
    services_title: "How we care", services_subtitle: "Comprehensive healthcare for the whole family.",
    svc_1_title: "Primary Care", svc_1_desc: "Routine check-ups and ongoing care you can count on.",
    svc_2_title: "Specialists", svc_2_desc: "Expert consultations across a range of specialties.",
    svc_3_title: "Diagnostics", svc_3_desc: "On-site testing for fast, accurate results.",
    final_title: "Feel better, sooner", final_subtitle: "Book an appointment and take the first step today.",
    final_cta: "Schedule now",
  },
});

/* ───────── 93. DRIFT — Travel agency ───────── */
const driftTravel = (): MarketplaceTemplate => ({
  id: "travel-drift", name: "Travel Agency Template",
  description: "Inspiring travel agency landing with destination cards and bright tones.",
  content: base("dr", "--bg:#fff8f0;--fg:#2a1f14;--muted:#766657;--line:rgba(0,0,0,.08);--ac:#f97316;--acbg:rgba(249,115,22,.14);--acsh:rgba(249,115,22,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#ffe6cc,#fff8f0);background:var(--bg);color:var(--fg)") + body("dr", ["✈️", "🏝️", "🗺️"]),
  variables: VARS, category: "business", tags: ["travel", "agency", "tourism", "light"],
  author: "Community", downloads: 327, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-travel",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1507525428034-b723cf961d3e", 1200, 630),
  schema_type: "TravelAgency", platform: "generic",
  defaultValues: {
    eyebrow: "Adventure awaits", hero_title: "Explore the world your way",
    hero_subtitle: "Handcrafted trips and unforgettable experiences, planned by travel experts who sweat the details.",
    hero_image: U("1507525428034-b723cf961d3e"), cta_primary: "Plan your trip", cta_secondary: "Browse destinations",
    services_title: "How we travel", services_subtitle: "Tailored journeys for every kind of explorer.",
    svc_1_title: "Custom Tours", svc_1_desc: "Personalized itineraries built around your dreams.",
    svc_2_title: "Beach Escapes", svc_2_desc: "Sun-soaked getaways to the world's best shores.",
    svc_3_title: "Adventure", svc_3_desc: "Hikes, safaris, and thrills for the bold at heart.",
    final_title: "Where to next?", final_subtitle: "Tell us your dream trip and we'll make it happen.",
    final_cta: "Start planning",
  },
});

/* ───────── 94. KNEAD — Spa / wellness retreat ───────── */
const kneadSpa = (): MarketplaceTemplate => ({
  id: "spa-knead", name: "Spa Wellness Template",
  description: "Serene spa/wellness landing with treatment cards and soft tones.",
  content: base("kn", "--bg:#f6f2ef;--fg:#2c2520;--muted:#736860;--line:rgba(0,0,0,.07);--ac:#a8826b;--acbg:rgba(168,130,107,.14);--acsh:rgba(168,130,107,.3);--card:#fffdfb;--finalbg:linear-gradient(135deg,#ece1d8,#f6f2ef);background:var(--bg);color:var(--fg)") + body("kn", ["💆", "🌸", "🕯️"]),
  variables: VARS, category: "business", tags: ["spa", "wellness", "beauty", "light"],
  author: "Community", downloads: 263, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-spa",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1540555700478-4be289fbecef", 1200, 630),
  schema_type: "HealthAndBeautyBusiness", platform: "generic",
  defaultValues: {
    eyebrow: "Rest and restore", hero_title: "A sanctuary for body and mind",
    hero_subtitle: "Indulge in restorative treatments designed to melt away stress and leave you feeling renewed.",
    hero_image: U("1540555700478-4be289fbecef"), cta_primary: "Book a treatment", cta_secondary: "View menu",
    services_title: "Our treatments", services_subtitle: "Curated experiences for total relaxation.",
    svc_1_title: "Massage", svc_1_desc: "Therapeutic massages tailored to release tension.",
    svc_2_title: "Facials", svc_2_desc: "Glow-boosting facials with premium natural products.",
    svc_3_title: "Body Rituals", svc_3_desc: "Wraps, scrubs, and soaks for head-to-toe renewal.",
    final_title: "You deserve this", final_subtitle: "Book your escape and treat yourself to a little calm.",
    final_cta: "Reserve now",
  },
});

/* ───────── 95. VAULT — Fintech / banking ───────── */
const vaultFintech = (): MarketplaceTemplate => ({
  id: "fintech-vault", name: "Fintech App Template",
  description: "Sleek dark fintech/banking landing with feature cards and bold gradient.",
  content: base("vl", "--bg:#070a14;--fg:#eef1fb;--muted:#8690a8;--line:rgba(255,255,255,.1);--ac:#6366f1;--acbg:rgba(99,102,241,.18);--acsh:rgba(99,102,241,.35);--card:#0f1322;--finalbg:linear-gradient(135deg,#161b30,#070a14);background:var(--bg);color:var(--fg)") + body("vl", ["💳", "📈", "🔒"]),
  variables: VARS, category: "business", tags: ["fintech", "banking", "finance", "dark"],
  author: "Community", downloads: 348, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-fintech",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1556742502-ec7c0e9f34b1", 1200, 630),
  schema_type: "FinancialService", platform: "generic",
  defaultValues: {
    eyebrow: "Money, simplified", hero_title: "Banking that works for you",
    hero_subtitle: "Spend, save, and invest from one beautiful app — with zero hidden fees and bank-grade security.",
    hero_image: U("1556742502-ec7c0e9f34b1"), cta_primary: "Open an account", cta_secondary: "See features",
    services_title: "Why choose us", services_subtitle: "Smart money tools built for the way you live.",
    svc_1_title: "Smart Spending", svc_1_desc: "Track every penny with real-time insights and budgets.",
    svc_2_title: "Easy Investing", svc_2_desc: "Grow your wealth with simple, low-cost portfolios.",
    svc_3_title: "Total Security", svc_3_desc: "Bank-grade encryption and instant card controls.",
    final_title: "Take charge of your money", final_subtitle: "Join millions banking smarter — sign up in minutes.",
    final_cta: "Get started",
  },
});

/* ───────── 96. CRUMB — Restaurant / fine dining ───────── */
const crumbRestaurant = (): MarketplaceTemplate => ({
  id: "restaurant-crumb", name: "Restaurant Template",
  description: "Elegant fine-dining restaurant landing with menu cards and warm tones.",
  content: base("cb", "--bg:#161210;--fg:#f4ece2;--muted:#a9988a;--line:rgba(255,255,255,.1);--ac:#cf9b53;--acbg:rgba(207,155,83,.16);--acsh:rgba(207,155,83,.3);--card:#211a16;--finalbg:linear-gradient(135deg,#29201a,#161210);background:var(--bg);color:var(--fg)") + body("cb", ["🍽️", "🍷", "👨‍🍳"]),
  variables: VARS, category: "ecommerce", tags: ["restaurant", "dining", "food", "dark"],
  author: "Community", downloads: 314, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-restaurant",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1517248135467-4c7edcad34c4", 1200, 630),
  schema_type: "Restaurant", platform: "generic",
  defaultValues: {
    eyebrow: "Taste the difference", hero_title: "A dining experience to remember",
    hero_subtitle: "Seasonal menus crafted from the finest local ingredients, served in a warm and elegant setting.",
    hero_image: U("1517248135467-4c7edcad34c4"), cta_primary: "Reserve a table", cta_secondary: "View the menu",
    services_title: "What we offer", services_subtitle: "Thoughtful food, fine wine, unforgettable evenings.",
    svc_1_title: "Seasonal Menu", svc_1_desc: "Dishes that change with the best the season offers.",
    svc_2_title: "Fine Wine", svc_2_desc: "A curated cellar to perfectly pair with every course.",
    svc_3_title: "Private Events", svc_3_desc: "Intimate spaces for celebrations and gatherings.",
    final_title: "Join us for dinner", final_subtitle: "Reserve your table and let us take care of the rest.",
    final_cta: "Book a table",
  },
});

export const FRAMER_BATCH16_TEMPLATES: MarketplaceTemplate[] = [
  caseLaw(),
  pulseClinic(),
  driftTravel(),
  kneadSpa(),
  vaultFintech(),
  crumbRestaurant(),
];
