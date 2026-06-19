// Framer-modelled marketplace templates — Batch 13 (1:1 design clones).
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

/* ───────── 73. MENTOR — Online tutoring ───────── */
const mentorTutoring = (): MarketplaceTemplate => ({
  id: "tutoring-mentor", name: "Online Tutoring Template",
  description: "Friendly light tutoring landing with subject cards and warm tones.",
  content: base("mn", "--bg:#f5f8ff;--fg:#11203a;--muted:#5a6b86;--line:rgba(0,0,0,.08);--ac:#3b6ef5;--acbg:rgba(59,110,245,.12);--acsh:rgba(59,110,245,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#e3ecff,#f5f8ff);background:var(--bg);color:var(--fg)") + body("mn", ["📚", "🧮", "🔬"]),
  variables: VARS, category: "business", tags: ["tutoring", "education", "learning", "light"],
  author: "Community", downloads: 274, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-tutoring",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1503676260728-1c00da094a0b", 1200, 630),
  schema_type: "EducationalOrganization", platform: "generic",
  defaultValues: {
    eyebrow: "Learn with confidence", hero_title: "Personalized tutoring that gets results",
    hero_subtitle: "Expert tutors, flexible scheduling, and lessons built around how your child learns best.",
    hero_image: U("1503676260728-1c00da094a0b"), cta_primary: "Book a free lesson", cta_secondary: "See subjects",
    services_title: "Subjects we cover", services_subtitle: "One-on-one help across every core subject.",
    svc_1_title: "Math & Science", svc_1_desc: "From fractions to calculus, build real understanding step by step.",
    svc_2_title: "Languages", svc_2_desc: "Reading, writing, and speaking practice with patient native tutors.",
    svc_3_title: "Test Prep", svc_3_desc: "Targeted strategies for SAT, ACT, and entrance exams.",
    final_title: "Start learning today", final_subtitle: "Book a free trial lesson and meet your perfect tutor.",
    final_cta: "Get started",
  },
});

/* ───────── 74. CLEAN — Cleaning services ───────── */
const cleanServices = (): MarketplaceTemplate => ({
  id: "cleaning-clean", name: "Cleaning Service Template",
  description: "Fresh, trustworthy cleaning landing with service cards and bright tones.",
  content: base("cl", "--bg:#f1fbfa;--fg:#0f2a28;--muted:#557570;--line:rgba(0,0,0,.08);--ac:#13b5a6;--acbg:rgba(19,181,166,.14);--acsh:rgba(19,181,166,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#d9f4f1,#f1fbfa);background:var(--bg);color:var(--fg)") + body("cl", ["🧹", "✨", "🏠"]),
  variables: VARS, category: "business", tags: ["cleaning", "service", "home", "light"],
  author: "Community", downloads: 233, rating: 4.7,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-cleaning",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1581578731548-c64695cc6952", 1200, 630),
  schema_type: "LocalBusiness", platform: "generic",
  defaultValues: {
    eyebrow: "Spotless, every time", hero_title: "A cleaner home, without the effort",
    hero_subtitle: "Reliable, eco-friendly cleaning by trusted professionals — booked in under a minute.",
    hero_image: U("1581578731548-c64695cc6952"), cta_primary: "Book a clean", cta_secondary: "View pricing",
    services_title: "What we offer", services_subtitle: "Flexible plans for homes and offices of any size.",
    svc_1_title: "Home Cleaning", svc_1_desc: "Regular or one-off deep cleans tailored to your space.",
    svc_2_title: "Office Cleaning", svc_2_desc: "Keep your workplace fresh and healthy for your team.",
    svc_3_title: "Move In/Out", svc_3_desc: "Thorough top-to-bottom cleaning for moving day.",
    final_title: "Reclaim your weekend", final_subtitle: "Book a sparkling clean in just a few clicks today.",
    final_cta: "Book now",
  },
});

/* ───────── 75. PIXELPLAY — Gaming / esports ───────── */
const pixelGaming = (): MarketplaceTemplate => ({
  id: "gaming-pixelplay", name: "Gaming Esports Template",
  description: "High-energy dark gaming landing with neon accents and feature cards.",
  content: base("pp", "--bg:#080614;--fg:#f0ecff;--muted:#9089b3;--line:rgba(255,255,255,.1);--ac:#ff2d92;--acbg:rgba(255,45,146,.16);--acsh:rgba(255,45,146,.35);--card:#120e26;--finalbg:linear-gradient(135deg,#1a1238,#080614);background:var(--bg);color:var(--fg)") + body("pp", ["🎮", "🏆", "⚔️"]),
  variables: VARS, category: "business", tags: ["gaming", "esports", "stream", "dark"],
  author: "Community", downloads: 389, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-gaming",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1542751371-adc38448a05e", 1200, 630),
  schema_type: "Organization", platform: "generic",
  defaultValues: {
    eyebrow: "Game on", hero_title: "Level up your play",
    hero_subtitle: "Join the squad, compete in tournaments, and dominate the leaderboards with our gaming community.",
    hero_image: U("1542751371-adc38448a05e"), cta_primary: "Join the squad", cta_secondary: "Watch streams",
    services_title: "Why play with us", services_subtitle: "Everything you need to compete and grow.",
    svc_1_title: "Tournaments", svc_1_desc: "Weekly competitions with real prizes and live brackets.",
    svc_2_title: "Pro Coaching", svc_2_desc: "Learn from ranked players and climb faster than ever.",
    svc_3_title: "Community", svc_3_desc: "Find teammates, join voice chats, and never queue alone.",
    final_title: "Ready to compete?", final_subtitle: "Sign up free and jump into your first match tonight.",
    final_cta: "Create account",
  },
});

/* ───────── 76. ROAST — Coffee shop / café ───────── */
const roastCafe = (): MarketplaceTemplate => ({
  id: "cafe-roast", name: "Coffee Shop Template",
  description: "Cozy warm café landing with menu cards and inviting tones.",
  content: base("rt", "--bg:#f7f1e8;--fg:#2a1d12;--muted:#6e5b48;--line:rgba(0,0,0,.1);--ac:#a9622d;--acbg:rgba(169,98,45,.14);--acsh:rgba(169,98,45,.3);--card:#fffdf8;--finalbg:linear-gradient(135deg,#ece0cf,#f7f1e8);background:var(--bg);color:var(--fg)") + body("rt", ["☕", "🥐", "🫘"]),
  variables: VARS, category: "business", tags: ["coffee", "cafe", "restaurant", "light"],
  author: "Community", downloads: 318, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-cafe",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1495474472287-4d71bcdd2085", 1200, 630),
  schema_type: "CafeOrCoffeeShop", platform: "generic",
  defaultValues: {
    eyebrow: "Freshly roasted daily", hero_title: "Your daily cup, perfected",
    hero_subtitle: "Ethically sourced beans, roasted in-house and brewed with care in the heart of your neighborhood.",
    hero_image: U("1495474472287-4d71bcdd2085"), cta_primary: "See the menu", cta_secondary: "Find us",
    services_title: "Crafted with love", services_subtitle: "From bean to cup, quality in every sip.",
    svc_1_title: "Specialty Coffee", svc_1_desc: "Single-origin espresso and pour-overs from expert baristas.",
    svc_2_title: "Fresh Pastries", svc_2_desc: "Baked every morning to pair perfectly with your brew.",
    svc_3_title: "Cozy Space", svc_3_desc: "A warm spot to work, meet, or simply unwind.",
    final_title: "Come say hello", final_subtitle: "Drop by for your favorite brew or order ahead online.",
    final_cta: "Order ahead",
  },
});

/* ───────── 77. INSURE — Insurance / finance ───────── */
const insureFinance = (): MarketplaceTemplate => ({
  id: "insurance-insure", name: "Insurance Agency Template",
  description: "Reassuring, professional insurance landing with coverage cards.",
  content: base("in", "--bg:#f3f6fb;--fg:#0d2440;--muted:#566a85;--line:rgba(0,0,0,.08);--ac:#1f6fd6;--acbg:rgba(31,111,214,.12);--acsh:rgba(31,111,214,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#dfeaf8,#f3f6fb);background:var(--bg);color:var(--fg)") + body("in", ["🛡️", "🏥", "🚗"]),
  variables: VARS, category: "business", tags: ["insurance", "finance", "agency", "light"],
  author: "Community", downloads: 245, rating: 4.7,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-insurance",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1450101499163-c8848c66ca85", 1200, 630),
  schema_type: "InsuranceAgency", platform: "generic",
  defaultValues: {
    eyebrow: "Protection you can trust", hero_title: "Coverage that gives you peace of mind",
    hero_subtitle: "Personalized insurance plans for your family, home, and future — explained simply, priced fairly.",
    hero_image: U("1450101499163-c8848c66ca85"), cta_primary: "Get a free quote", cta_secondary: "Talk to an agent",
    services_title: "Plans for every need", services_subtitle: "Comprehensive coverage with no hidden surprises.",
    svc_1_title: "Life & Health", svc_1_desc: "Protect what matters most with flexible, affordable plans.",
    svc_2_title: "Home & Property", svc_2_desc: "Cover your home and belongings against the unexpected.",
    svc_3_title: "Auto", svc_3_desc: "Reliable coverage and fast claims when you need them most.",
    final_title: "Get covered today", final_subtitle: "Request a free, no-obligation quote in minutes.",
    final_cta: "Get my quote",
  },
});

/* ───────── 78. MOMENT — Wedding / events ───────── */
const momentWedding = (): MarketplaceTemplate => ({
  id: "wedding-moment", name: "Wedding Planner Template",
  description: "Elegant romantic wedding landing with service cards and soft tones.",
  content: base("mo", "--bg:#fdf6f4;--fg:#2e1a20;--muted:#7a6168;--line:rgba(0,0,0,.08);--ac:#c4748a;--acbg:rgba(196,116,138,.14);--acsh:rgba(196,116,138,.3);--card:#ffffff;--finalbg:linear-gradient(135deg,#f7e6e6,#fdf6f4);background:var(--bg);color:var(--fg)") + body("mo", ["💍", "💐", "🥂"]),
  variables: VARS, category: "business", tags: ["wedding", "planner", "event", "light"],
  author: "Community", downloads: 301, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-wedding",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1519741497674-611481863552", 1200, 630),
  schema_type: "LocalBusiness", platform: "generic",
  defaultValues: {
    eyebrow: "Your perfect day", hero_title: "Weddings, beautifully planned",
    hero_subtitle: "From first idea to final toast, we craft unforgettable celebrations tailored to your love story.",
    hero_image: U("1519741497674-611481863552"), cta_primary: "Plan your day", cta_secondary: "View portfolio",
    services_title: "How we help", services_subtitle: "Full-service planning so you can simply enjoy the moment.",
    svc_1_title: "Full Planning", svc_1_desc: "End-to-end coordination of every detail, big and small.",
    svc_2_title: "Design & Styling", svc_2_desc: "Stunning décor and themes that reflect who you are.",
    svc_3_title: "Day-of Coordination", svc_3_desc: "Seamless execution so your day runs flawlessly.",
    final_title: "Let's create magic", final_subtitle: "Book a complimentary consultation to start planning.",
    final_cta: "Book consultation",
  },
});

export const FRAMER_BATCH13_TEMPLATES: MarketplaceTemplate[] = [
  mentorTutoring(),
  cleanServices(),
  pixelGaming(),
  roastCafe(),
  insureFinance(),
  momentWedding(),
];
