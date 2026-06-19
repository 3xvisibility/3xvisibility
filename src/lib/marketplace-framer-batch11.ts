// Framer-modelled marketplace templates — Batch 11 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 61. PULSE — Medical / clinic ──────────────── */
const pulseMedical = (): MarketplaceTemplate => {
  const content = `<style>
.pl{--bg:#f4f9fb;--fg:#11252e;--muted:#5d7480;--line:rgba(0,0,0,.08);--ac:#0fb0a8;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.pl *{box-sizing:border-box;margin:0}
.pl-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.pl h1,.pl h2,.pl h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.pl-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.pl-eye{display:inline-block;color:var(--ac);background:rgba(15,176,168,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.pl-hero h1{font-size:clamp(38px,6vw,66px);margin-bottom:18px}
.pl-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.pl-cta{display:flex;gap:14px;flex-wrap:wrap}
.pl-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.pl-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(15,176,168,.3)}
.pl-btn-p:hover{transform:translateY(-2px)}
.pl-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.pl-hero img{width:100%;border-radius:18px;aspect-ratio:4/4;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.12)}
.pl-sec{padding:clamp(54px,8vw,100px) 0}
.pl-head{text-align:center;max-width:600px;margin:0 auto 48px}
.pl-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.pl-head p{color:var(--muted);font-size:17px}
.pl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pl-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:30px;transition:.25s}
.pl-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.pl-card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(15,176,168,.14);margin-bottom:18px}
.pl-card h3{font-size:20px;margin-bottom:8px}
.pl-card p{color:var(--muted);font-size:15px}
.pl-final{text-align:center;background:linear-gradient(135deg,#e3f5f3,#f4f9fb);border:1px solid var(--line);border-radius:20px;padding:clamp(54px,8vw,96px) 24px}
.pl-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.pl-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.pl-hero{grid-template-columns:1fr}.pl-grid{grid-template-columns:1fr}}
</style>
<div class="pl">
  <section class="pl-wrap pl-hero">
    <div>
      <span class="pl-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="pl-cta"><a class="pl-btn pl-btn-p" href="#">{cta_primary}</a><a class="pl-btn pl-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="pl-sec"><div class="pl-wrap">
    <div class="pl-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="pl-grid">
      <div class="pl-card"><div class="ic">🩺</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="pl-card"><div class="ic">💉</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="pl-card"><div class="ic">❤️</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="pl-sec"><div class="pl-wrap"><div class="pl-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="pl-btn pl-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "medical-clinic-pulse", name: "Medical Clinic Template", description: "Clean, trustworthy clinic landing with split hero and service cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["medical", "clinic", "health", "doctor", "light"],
    author: "Community", downloads: 398, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-clinic",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1576091160550-2173dba999ef", 1200, 630),
    schema_type: "MedicalOrganization", platform: "generic",
    defaultValues: {
      eyebrow: "Your health, our priority", hero_title: "Compassionate care for the whole family",
      hero_subtitle: "Modern medical services delivered by an experienced, caring team you can trust.",
      cta_primary: "Book appointment", cta_secondary: "Our services", hero_image: U("1576091160550-2173dba999ef"),
      services_title: "Comprehensive care", services_subtitle: "A full range of medical services under one roof.",
      svc_1_title: "General checkups", svc_1_desc: "Routine exams and preventive care for all ages.",
      svc_2_title: "Vaccinations", svc_2_desc: "Stay protected with our complete immunization program.",
      svc_3_title: "Cardiology", svc_3_desc: "Specialist heart care with advanced diagnostics.",
      final_title: "Schedule your visit today", final_subtitle: "Book an appointment online in just a few minutes.",
      final_cta: "Book now",
    },
  };
};

/* ───────────────────────── 62. FORGE — Construction ──────────────── */
const forgeConstruction = (): MarketplaceTemplate => {
  const content = `<style>
.fg{--bg:#14130f;--fg:#f4f1ea;--muted:#a39c8c;--line:rgba(255,255,255,.1);--ac:#f4a623;--card:#1d1c16;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.fg *{box-sizing:border-box;margin:0}
.fg-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.fg h1,.fg h2,.fg h3{letter-spacing:-.02em;line-height:1.06;font-weight:800;text-transform:uppercase}
.fg-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.fg-eye{display:inline-block;color:var(--ac);letter-spacing:.16em;text-transform:uppercase;font-size:12px;font-weight:700;margin-bottom:18px}
.fg-hero h1{font-size:clamp(38px,6vw,68px);margin-bottom:18px}
.fg-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px;text-transform:none}
.fg-cta{display:flex;gap:14px;flex-wrap:wrap}
.fg-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:4px;font-weight:700;font-size:14px;text-decoration:none;transition:.25s;text-transform:uppercase;letter-spacing:.04em}
.fg-btn-p{background:var(--ac);color:#14130f}
.fg-btn-p:hover{transform:translateY(-2px)}
.fg-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.fg-hero img{width:100%;border-radius:8px;aspect-ratio:4/4;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.5)}
.fg-sec{padding:clamp(54px,8vw,100px) 0}
.fg-head{text-align:center;max-width:600px;margin:0 auto 48px}
.fg-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.fg-head p{color:var(--muted);font-size:17px;text-transform:none}
.fg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.fg-card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:30px;transition:.25s}
.fg-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.fg-card .ic{width:52px;height:52px;border-radius:6px;display:grid;place-items:center;font-size:24px;background:rgba(244,166,35,.16);margin-bottom:18px}
.fg-card h3{font-size:20px;margin-bottom:8px}
.fg-card p{color:var(--muted);font-size:15px;text-transform:none}
.fg-final{text-align:center;background:linear-gradient(135deg,#26241b,#14130f);border:1px solid var(--line);border-radius:12px;padding:clamp(54px,8vw,96px) 24px}
.fg-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.fg-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px;text-transform:none}
@media(max-width:860px){.fg-hero{grid-template-columns:1fr}.fg-grid{grid-template-columns:1fr}}
</style>
<div class="fg">
  <section class="fg-wrap fg-hero">
    <div>
      <span class="fg-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="fg-cta"><a class="fg-btn fg-btn-p" href="#">{cta_primary}</a><a class="fg-btn fg-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="fg-sec"><div class="fg-wrap">
    <div class="fg-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="fg-grid">
      <div class="fg-card"><div class="ic">🏗️</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="fg-card"><div class="ic">🔨</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="fg-card"><div class="ic">📐</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="fg-sec"><div class="fg-wrap"><div class="fg-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="fg-btn fg-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "construction-forge", name: "Construction Company Template", description: "Bold industrial construction landing with split hero and service cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["construction", "builder", "contractor", "industrial", "dark"],
    author: "Community", downloads: 312, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-construction",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1504307651254-35680f356dfd", 1200, 630),
    schema_type: "LocalBusiness", platform: "generic",
    defaultValues: {
      eyebrow: "Building since 1998", hero_title: "We build it right the first time",
      hero_subtitle: "Trusted construction and contracting services for residential and commercial projects.",
      cta_primary: "Get a quote", cta_secondary: "View projects", hero_image: U("1504307651254-35680f356dfd"),
      services_title: "What we do", services_subtitle: "End-to-end construction services delivered on time and on budget.",
      svc_1_title: "New builds", svc_1_desc: "Custom homes and commercial structures from the ground up.",
      svc_2_title: "Renovations", svc_2_desc: "Transforming existing spaces with quality craftsmanship.",
      svc_3_title: "Project planning", svc_3_desc: "Detailed design, permits and budgeting handled for you.",
      final_title: "Start your project today", final_subtitle: "Get a free, no-obligation quote from our expert team.",
      final_cta: "Request quote",
    },
  };
};

/* ───────────────────────── 63. BLOOM — Florist ──────────────── */
const bloomFlorist = (): MarketplaceTemplate => {
  const content = `<style>
.bm{--bg:#fbf7f4;--fg:#2c241f;--muted:#7d716a;--line:rgba(0,0,0,.07);--ac:#c6798a;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.bm *{box-sizing:border-box;margin:0}
.bm-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.bm h1,.bm h2,.bm h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.bm-hero{text-align:center;padding:clamp(72px,11vw,130px) 0 clamp(36px,5vw,60px);max-width:760px;margin:0 auto}
.bm-eye{display:inline-block;color:var(--ac);background:rgba(198,121,138,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:20px}
.bm-hero h1{font-size:clamp(40px,6.5vw,70px);margin-bottom:20px}
.bm-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:46ch;margin:0 auto 28px}
.bm-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.bm-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.bm-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(198,121,138,.3)}
.bm-btn-p:hover{transform:translateY(-2px)}
.bm-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.bm-sec{padding:clamp(40px,7vw,90px) 0}
.bm-head{text-align:center;max-width:600px;margin:0 auto 44px}
.bm-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.bm-head p{color:var(--muted);font-size:17px}
.bm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.bm-prod{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:.25s}
.bm-prod:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(0,0,0,.08)}
.bm-prod img{width:100%;aspect-ratio:1;object-fit:cover}
.bm-prod .bd{padding:20px}
.bm-prod h3{font-size:18px;margin-bottom:6px}
.bm-prod .pr{color:var(--ac);font-weight:700;font-size:18px}
.bm-final{text-align:center;background:linear-gradient(135deg,#f6e7ea,#fbf7f4);border:1px solid var(--line);border-radius:20px;padding:clamp(54px,8vw,96px) 24px}
.bm-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.bm-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:760px){.bm-grid{grid-template-columns:1fr}}
</style>
<div class="bm">
  <section class="bm-hero">
    <span class="bm-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="bm-cta"><a class="bm-btn bm-btn-p" href="#">{cta_primary}</a><a class="bm-btn bm-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="bm-sec"><div class="bm-wrap">
    <div class="bm-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="bm-grid">
      <div class="bm-prod"><img src="{prod_1_image}" alt="{prod_1_title}"><div class="bd"><h3>{prod_1_title}</h3><div class="pr">{prod_1_price}</div></div></div>
      <div class="bm-prod"><img src="{prod_2_image}" alt="{prod_2_title}"><div class="bd"><h3>{prod_2_title}</h3><div class="pr">{prod_2_price}</div></div></div>
      <div class="bm-prod"><img src="{prod_3_image}" alt="{prod_3_title}"><div class="bd"><h3>{prod_3_title}</h3><div class="pr">{prod_3_price}</div></div></div>
    </div>
  </div></section>
  <section class="bm-sec"><div class="bm-wrap"><div class="bm-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="bm-btn bm-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "florist-bloom", name: "Florist Shop Template", description: "Elegant florist landing with centered hero and bouquet product cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{prod_1_image}", "{prod_1_title}", "{prod_1_price}", "{prod_2_image}", "{prod_2_title}", "{prod_2_price}",
      "{prod_3_image}", "{prod_3_title}", "{prod_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "ecommerce", tags: ["florist", "flowers", "shop", "gifts", "light"],
    author: "Community", downloads: 287, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-florist",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1490750967868-88aa4486c946", 1200, 630),
    schema_type: "Store", platform: "generic",
    defaultValues: {
      eyebrow: "Fresh daily", hero_title: "Handcrafted bouquets for every moment",
      hero_subtitle: "Locally sourced, beautifully arranged flowers delivered to your door.",
      cta_primary: "Shop bouquets", cta_secondary: "Our story",
      services_title: "Featured arrangements", services_subtitle: "Our most-loved bouquets, freshly made each morning.",
      prod_1_image: U("1490750967868-88aa4486c946", 600, 600), prod_1_title: "Spring Garden", prod_1_price: "$48",
      prod_2_image: U("1487070183336-b863922373d4", 600, 600), prod_2_title: "Rose Romance", prod_2_price: "$62",
      prod_3_image: U("1463320726281-696a485928c7", 600, 600), prod_3_title: "Wildflower Mix", prod_3_price: "$39",
      final_title: "Send flowers today", final_subtitle: "Same-day delivery available on all local orders.",
      final_cta: "Order now",
    },
  };
};

/* ───────────────────────── 64. VAULT — Crypto / Web3 ──────────────── */
const vaultCrypto = (): MarketplaceTemplate => {
  const content = `<style>
.vt{--bg:#070a16;--fg:#eef1fb;--muted:#8b93b0;--line:rgba(255,255,255,.1);--ac:#3ddc97;--card:#0e1326;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.vt *{box-sizing:border-box;margin:0}
.vt-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.vt h1,.vt h2,.vt h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.vt-hero{text-align:center;padding:clamp(72px,11vw,140px) 0 clamp(40px,6vw,72px);max-width:760px;margin:0 auto}
.vt-eye{display:inline-block;color:var(--ac);background:rgba(61,220,151,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:20px}
.vt-hero h1{font-size:clamp(40px,6.5vw,72px);margin-bottom:20px}
.vt-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:48ch;margin:0 auto 28px}
.vt-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.vt-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.vt-btn-p{background:var(--ac);color:#070a16;box-shadow:0 14px 32px rgba(61,220,151,.28)}
.vt-btn-p:hover{transform:translateY(-2px)}
.vt-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.vt-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:760px;margin:0 auto}
.vt-stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px;text-align:center}
.vt-stat .n{font-size:34px;font-weight:800;color:var(--ac)}
.vt-stat .l{color:var(--muted);font-size:14px;margin-top:6px}
.vt-sec{padding:clamp(54px,8vw,100px) 0}
.vt-head{text-align:center;max-width:600px;margin:0 auto 48px}
.vt-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.vt-head p{color:var(--muted);font-size:17px}
.vt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.vt-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:30px;transition:.25s}
.vt-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.vt-card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(61,220,151,.16);margin-bottom:18px}
.vt-card h3{font-size:20px;margin-bottom:8px}
.vt-card p{color:var(--muted);font-size:15px}
.vt-final{text-align:center;background:linear-gradient(135deg,#0c1f1a,#070a16);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.vt-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.vt-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.vt-grid,.vt-stats{grid-template-columns:1fr}}
</style>
<div class="vt">
  <section class="vt-hero">
    <span class="vt-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="vt-cta"><a class="vt-btn vt-btn-p" href="#">{cta_primary}</a><a class="vt-btn vt-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="vt-sec"><div class="vt-wrap"><div class="vt-stats">
    <div class="vt-stat"><div class="n">{stat_1_num}</div><div class="l">{stat_1_label}</div></div>
    <div class="vt-stat"><div class="n">{stat_2_num}</div><div class="l">{stat_2_label}</div></div>
    <div class="vt-stat"><div class="n">{stat_3_num}</div><div class="l">{stat_3_label}</div></div>
  </div></div></section>
  <section class="vt-sec"><div class="vt-wrap">
    <div class="vt-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="vt-grid">
      <div class="vt-card"><div class="ic">🔐</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="vt-card"><div class="ic">⚡</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="vt-card"><div class="ic">🌐</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="vt-sec"><div class="vt-wrap"><div class="vt-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="vt-btn vt-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "crypto-web3-vault", name: "Crypto & Web3 Template", description: "Sleek dark crypto landing with centered hero, stats and feature cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["crypto", "web3", "blockchain", "fintech", "dark"],
    author: "Community", downloads: 421, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-crypto",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1639762681485-074b7f938ba0", 1200, 630),
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "Decentralized finance", hero_title: "Your gateway to the future of money",
      hero_subtitle: "Buy, trade and securely store digital assets with confidence on our trusted platform.",
      cta_primary: "Get started", cta_secondary: "View markets",
      stat_1_num: "$4.2B", stat_1_label: "Trading volume", stat_2_num: "2.5M+", stat_2_label: "Active users", stat_3_num: "180+", stat_3_label: "Countries",
      services_title: "Why choose us", services_subtitle: "Everything you need to manage your digital assets in one place.",
      svc_1_title: "Bank-grade security", svc_1_desc: "Cold storage and multi-layer encryption protect your funds.",
      svc_2_title: "Instant trades", svc_2_desc: "Lightning-fast execution across hundreds of pairs.",
      svc_3_title: "Global access", svc_3_desc: "Trade anytime, anywhere, from any device.",
      final_title: "Start trading in minutes", final_subtitle: "Create your account and make your first trade today.",
      final_cta: "Create account",
    },
  };
};

/* ───────────────────────── 65. ROAM — Hotel / resort ──────────────── */
const roamHotel = (): MarketplaceTemplate => {
  const content = `<style>
.rm{--bg:#0f1512;--fg:#f1f4f0;--muted:#9aa69d;--line:rgba(255,255,255,.1);--ac:#caa45c;--card:#161d18;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.rm *{box-sizing:border-box;margin:0}
.rm-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.rm h1,.rm h2,.rm h3{letter-spacing:-.02em;line-height:1.06;font-weight:800}
.rm-hero{text-align:center;padding:clamp(72px,11vw,140px) 0 clamp(40px,6vw,72px);max-width:780px;margin:0 auto}
.rm-eye{display:inline-block;color:var(--ac);letter-spacing:.2em;text-transform:uppercase;font-size:12px;font-weight:700;margin-bottom:20px}
.rm-hero h1{font-size:clamp(40px,7vw,76px);margin-bottom:20px}
.rm-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:46ch;margin:0 auto 28px}
.rm-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.rm-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:6px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.rm-btn-p{background:var(--ac);color:#0f1512}
.rm-btn-p:hover{transform:translateY(-2px)}
.rm-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.rm-shot{max-width:1000px;margin:0 auto;padding:0 24px}
.rm-shot img{width:100%;border-radius:16px;border:1px solid var(--line);box-shadow:0 30px 64px rgba(0,0,0,.5);aspect-ratio:16/8;object-fit:cover}
.rm-sec{padding:clamp(54px,8vw,100px) 0}
.rm-head{text-align:center;max-width:600px;margin:0 auto 48px}
.rm-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.rm-head p{color:var(--muted);font-size:17px}
.rm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.rm-room{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:.25s}
.rm-room:hover{transform:translateY(-4px);border-color:var(--ac)}
.rm-room img{width:100%;aspect-ratio:4/3;object-fit:cover}
.rm-room .bd{padding:22px}
.rm-room h3{font-size:19px;margin-bottom:6px}
.rm-room p{color:var(--muted);font-size:14px;margin-bottom:10px}
.rm-room .pr{color:var(--ac);font-weight:700;font-size:18px}
.rm-final{text-align:center;background:linear-gradient(135deg,#1c241d,#0f1512);border:1px solid var(--line);border-radius:18px;padding:clamp(54px,8vw,96px) 24px}
.rm-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.rm-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.rm-grid{grid-template-columns:1fr}}
</style>
<div class="rm">
  <section class="rm-hero">
    <span class="rm-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="rm-cta"><a class="rm-btn rm-btn-p" href="#">{cta_primary}</a><a class="rm-btn rm-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="rm-shot"><img src="{hero_image}" alt="{hero_title}"></section>
  <section class="rm-sec"><div class="rm-wrap">
    <div class="rm-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="rm-grid">
      <div class="rm-room"><img src="{room_1_image}" alt="{room_1_title}"><div class="bd"><h3>{room_1_title}</h3><p>{room_1_desc}</p><div class="pr">{room_1_price}</div></div></div>
      <div class="rm-room"><img src="{room_2_image}" alt="{room_2_title}"><div class="bd"><h3>{room_2_title}</h3><p>{room_2_desc}</p><div class="pr">{room_2_price}</div></div></div>
      <div class="rm-room"><img src="{room_3_image}" alt="{room_3_title}"><div class="bd"><h3>{room_3_title}</h3><p>{room_3_desc}</p><div class="pr">{room_3_price}</div></div></div>
    </div>
  </div></section>
  <section class="rm-sec"><div class="rm-wrap"><div class="rm-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="rm-btn rm-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "hotel-resort-roam", name: "Hotel & Resort Template", description: "Luxurious dark resort landing with hero shot and room cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{room_1_image}", "{room_1_title}", "{room_1_desc}", "{room_1_price}",
      "{room_2_image}", "{room_2_title}", "{room_2_desc}", "{room_2_price}",
      "{room_3_image}", "{room_3_title}", "{room_3_desc}", "{room_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["hotel", "resort", "hospitality", "travel", "dark"],
    author: "Community", downloads: 356, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-resort",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1566073771259-6a8506099945", 1200, 630),
    schema_type: "Hotel", platform: "generic",
    defaultValues: {
      eyebrow: "Luxury stays", hero_title: "Escape to a world of comfort",
      hero_subtitle: "Unwind in our beautifully appointed rooms and world-class amenities.",
      cta_primary: "Book your stay", cta_secondary: "Explore rooms", hero_image: U("1566073771259-6a8506099945"),
      services_title: "Our rooms & suites", services_subtitle: "Choose the perfect space for your getaway.",
      room_1_image: U("1611892440504-42a792e24d32", 600, 450), room_1_title: "Deluxe Room", room_1_desc: "Spacious comfort with a garden view.", room_1_price: "$180/night",
      room_2_image: U("1582719478250-c89cae4dc85b", 600, 450), room_2_title: "Ocean Suite", room_2_desc: "Panoramic sea views and a private balcony.", room_2_price: "$320/night",
      room_3_image: U("1618773928121-c32242e63f39", 600, 450), room_3_title: "Family Villa", room_3_desc: "Two bedrooms with a private terrace.", room_3_price: "$450/night",
      final_title: "Reserve your escape", final_subtitle: "Book direct for the best rates and exclusive perks.",
      final_cta: "Check availability",
    },
  };
};

/* ───────────────────────── 66. CANVAS — Agency / portfolio ──────────────── */
const canvasAgency = (): MarketplaceTemplate => {
  const content = `<style>
.cv{--bg:#0c0c0e;--fg:#f4f4f6;--muted:#9a9aa6;--line:rgba(255,255,255,.1);--ac:#ff5c38;--card:#161618;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.cv *{box-sizing:border-box;margin:0}
.cv-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.cv h1,.cv h2,.cv h3{letter-spacing:-.03em;line-height:1.02;font-weight:800}
.cv-hero{padding:clamp(72px,11vw,140px) 0 clamp(40px,6vw,72px);max-width:900px}
.cv-eye{display:inline-block;color:var(--ac);letter-spacing:.16em;text-transform:uppercase;font-size:12px;font-weight:700;margin-bottom:20px}
.cv-hero h1{font-size:clamp(44px,8vw,90px);margin-bottom:24px}
.cv-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,21px);max-width:50ch;margin-bottom:28px}
.cv-cta{display:flex;gap:14px;flex-wrap:wrap}
.cv-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.cv-btn-p{background:var(--ac);color:#0c0c0e}
.cv-btn-p:hover{transform:translateY(-2px)}
.cv-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.cv-sec{padding:clamp(40px,7vw,90px) 0}
.cv-head{max-width:600px;margin:0 0 44px}
.cv-head h2{font-size:clamp(28px,4.4vw,48px);margin-bottom:14px}
.cv-head p{color:var(--muted);font-size:17px}
.cv-work{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
.cv-item{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:4/3}
.cv-item img{width:100%;height:100%;object-fit:cover;transition:.4s}
.cv-item:hover img{transform:scale(1.05)}
.cv-item .cap{position:absolute;inset:auto 0 0 0;padding:24px;background:linear-gradient(transparent,rgba(0,0,0,.8))}
.cv-item .cap h3{font-size:22px}
.cv-item .cap span{color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
.cv-final{text-align:center;background:linear-gradient(135deg,#2a120c,#0c0c0e);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.cv-final h2{font-size:clamp(30px,5vw,56px);max-width:16ch;margin:0 auto 16px}
.cv-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:760px){.cv-work{grid-template-columns:1fr}}
</style>
<div class="cv">
  <section class="cv-wrap cv-hero">
    <span class="cv-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="cv-cta"><a class="cv-btn cv-btn-p" href="#">{cta_primary}</a><a class="cv-btn cv-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="cv-sec"><div class="cv-wrap">
    <div class="cv-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="cv-work">
      <div class="cv-item"><img src="{work_1_image}" alt="{work_1_title}"><div class="cap"><span>{work_1_tag}</span><h3>{work_1_title}</h3></div></div>
      <div class="cv-item"><img src="{work_2_image}" alt="{work_2_title}"><div class="cap"><span>{work_2_tag}</span><h3>{work_2_title}</h3></div></div>
      <div class="cv-item"><img src="{work_3_image}" alt="{work_3_title}"><div class="cap"><span>{work_3_tag}</span><h3>{work_3_title}</h3></div></div>
      <div class="cv-item"><img src="{work_4_image}" alt="{work_4_title}"><div class="cap"><span>{work_4_tag}</span><h3>{work_4_title}</h3></div></div>
    </div>
  </div></section>
  <section class="cv-sec"><div class="cv-wrap"><div class="cv-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="cv-btn cv-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "agency-portfolio-canvas", name: "Creative Agency Template", description: "Bold dark agency portfolio with oversized hero and project grid.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{work_1_image}", "{work_1_title}", "{work_1_tag}", "{work_2_image}", "{work_2_title}", "{work_2_tag}",
      "{work_3_image}", "{work_3_title}", "{work_3_tag}", "{work_4_image}", "{work_4_title}", "{work_4_tag}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["agency", "portfolio", "creative", "studio", "dark"],
    author: "Community", downloads: 489, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-agency",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1497032628192-86f99bcd76bc", 1200, 630),
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "Creative studio", hero_title: "We craft brands that move people",
      hero_subtitle: "A design and digital agency building bold identities and unforgettable experiences.",
      cta_primary: "Start a project", cta_secondary: "See our work",
      services_title: "Selected projects", services_subtitle: "A look at some of the brands we've helped grow.",
      work_1_image: U("1497032628192-86f99bcd76bc", 700, 525), work_1_title: "Nova Rebrand", work_1_tag: "Branding",
      work_2_image: U("1467232004584-a241de8bcf5d", 700, 525), work_2_title: "Pulse App", work_2_tag: "Product Design",
      work_3_image: U("1460925895917-afdab827c52f", 700, 525), work_3_title: "Atlas Campaign", work_3_tag: "Marketing",
      work_4_image: U("1522071820081-009f0129c71c", 700, 525), work_4_title: "Forge Website", work_4_tag: "Web Design",
      final_title: "Let's build something great", final_subtitle: "Tell us about your project and we'll get back within 24 hours.",
      final_cta: "Get in touch",
    },
  };
};

export const FRAMER_BATCH11_TEMPLATES: MarketplaceTemplate[] = [
  pulseMedical(),
  forgeConstruction(),
  bloomFlorist(),
  vaultCrypto(),
  roamHotel(),
  canvasAgency(),
];
