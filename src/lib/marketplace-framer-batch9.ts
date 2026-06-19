// Framer-modelled marketplace templates — Batch 9 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 49. PEAK — Fitness / gym ──────────────── */
const peakFitness = (): MarketplaceTemplate => {
  const content = `<style>
.pk{--bg:#0c0d10;--fg:#f4f6f8;--muted:#98a0aa;--line:rgba(255,255,255,.1);--ac:#c6f04a;--card:#15171c;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.pk *{box-sizing:border-box;margin:0}
.pk-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.pk h1,.pk h2,.pk h3{letter-spacing:-.02em;line-height:1.05;font-weight:800}
.pk-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.pk-eye{display:inline-block;color:var(--ac);background:rgba(198,240,74,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.pk-hero h1{font-size:clamp(40px,6.5vw,72px);margin-bottom:18px}
.pk-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.pk-cta{display:flex;gap:14px;flex-wrap:wrap}
.pk-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.pk-btn-p{background:var(--ac);color:#0c0d10}
.pk-btn-p:hover{transform:translateY(-2px)}
.pk-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.pk-hero img{width:100%;border-radius:20px;aspect-ratio:4/4.4;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.5)}
.pk-sec{padding:clamp(54px,8vw,100px) 0}
.pk-head{text-align:center;max-width:600px;margin:0 auto 48px}
.pk-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.pk-head p{color:var(--muted);font-size:17px}
.pk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pk-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;transition:.25s}
.pk-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.pk-card .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:rgba(198,240,74,.16);margin-bottom:18px}
.pk-card h3{font-size:20px;margin-bottom:8px}
.pk-card p{color:var(--muted);font-size:15px}
.pk-final{text-align:center;background:linear-gradient(135deg,#1a1d22,#0c0d10);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.pk-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.pk-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.pk-hero{grid-template-columns:1fr}.pk-grid{grid-template-columns:1fr}}
</style>
<div class="pk">
  <section class="pk-wrap pk-hero">
    <div>
      <span class="pk-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="pk-cta"><a class="pk-btn pk-btn-p" href="#">{cta_primary}</a><a class="pk-btn pk-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="pk-sec"><div class="pk-wrap">
    <div class="pk-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="pk-grid">
      <div class="pk-card"><div class="ic">🏋️</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="pk-card"><div class="ic">🤸</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="pk-card"><div class="ic">🥗</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="pk-sec"><div class="pk-wrap"><div class="pk-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="pk-btn pk-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "fitness-gym-peak", name: "Fitness & Gym Template", description: "High-energy dark gym landing with lime accents, hero and class cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["fitness", "gym", "health", "training", "dark"],
    author: "Community", downloads: 388, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-gym",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1534438327276-14e5300c3a48", 1200, 630),
    schema_type: "LocalBusiness", platform: "generic",
    defaultValues: {
      eyebrow: "Train hard", hero_title: "Build the strongest version of you",
      hero_subtitle: "Expert coaches, modern equipment and programs designed to get you real results — fast.",
      cta_primary: "Start free trial", cta_secondary: "View classes", hero_image: U("1534438327276-14e5300c3a48"),
      services_title: "Programs that fit your goals", services_subtitle: "From strength to mobility, we've got a plan for every level.",
      svc_1_title: "Strength training", svc_1_desc: "Build muscle and power with structured progressive programs.",
      svc_2_title: "Group classes", svc_2_desc: "High-energy HIIT, yoga and conditioning sessions every day.",
      svc_3_title: "Nutrition coaching", svc_3_desc: "Personalised meal plans to fuel your transformation.",
      final_title: "Your first session is on us", final_subtitle: "Join today and get a free week plus a personal training assessment.",
      final_cta: "Claim free week",
    },
  };
};

/* ───────────────────────── 50. LEDGER — Finance / accounting ──────────────── */
const ledgerFinance = (): MarketplaceTemplate => {
  const content = `<style>
.lg{--bg:#0b0f14;--fg:#eef3f8;--muted:#93a0b0;--line:rgba(255,255,255,.1);--ac:#3b82f6;--card:#121821;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.lg *{box-sizing:border-box;margin:0}
.lg-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.lg h1,.lg h2,.lg h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.lg-hero{text-align:center;padding:clamp(72px,11vw,140px) 0 clamp(40px,6vw,72px);max-width:760px;margin:0 auto}
.lg-eye{display:inline-block;color:var(--ac);background:rgba(59,130,246,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:20px}
.lg-hero h1{font-size:clamp(40px,6.5vw,70px);margin-bottom:20px}
.lg-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:48ch;margin:0 auto 28px}
.lg-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.lg-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.lg-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(59,130,246,.3)}
.lg-btn-p:hover{transform:translateY(-2px)}
.lg-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.lg-shot{max-width:980px;margin:0 auto;padding:0 24px}
.lg-shot img{width:100%;border-radius:18px;border:1px solid var(--line);box-shadow:0 30px 64px rgba(0,0,0,.5)}
.lg-sec{padding:clamp(54px,8vw,100px) 0}
.lg-head{text-align:center;max-width:600px;margin:0 auto 48px}
.lg-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.lg-head p{color:var(--muted);font-size:17px}
.lg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.lg-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:30px;transition:.25s}
.lg-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.lg-card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(59,130,246,.16);margin-bottom:18px}
.lg-card h3{font-size:20px;margin-bottom:8px}
.lg-card p{color:var(--muted);font-size:15px}
.lg-final{text-align:center;background:linear-gradient(135deg,#15202e,#0b0f14);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.lg-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.lg-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.lg-grid{grid-template-columns:1fr}}
</style>
<div class="lg">
  <section class="lg-hero">
    <span class="lg-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="lg-cta"><a class="lg-btn lg-btn-p" href="#">{cta_primary}</a><a class="lg-btn lg-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="lg-shot"><img src="{hero_image}" alt="{hero_title}"></section>
  <section class="lg-sec"><div class="lg-wrap">
    <div class="lg-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="lg-grid">
      <div class="lg-card"><div class="ic">📊</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="lg-card"><div class="ic">🧾</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="lg-card"><div class="ic">💼</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="lg-sec"><div class="lg-wrap"><div class="lg-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="lg-btn lg-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "finance-accounting-ledger", name: "Finance & Accounting Template", description: "Trustworthy fintech/accounting landing with centered hero and dashboard shot.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["finance", "accounting", "fintech", "saas", "dark"],
    author: "Community", downloads: 412, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-finance",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1554224155-6726b3ff858f", 1200, 630),
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "Smart finance", hero_title: "Accounting that runs itself",
      hero_subtitle: "Automate bookkeeping, taxes and reporting so you can focus on growing your business.",
      cta_primary: "Get started", cta_secondary: "Book a demo", hero_image: U("1554224155-6726b3ff858f"),
      services_title: "Everything your finances need", services_subtitle: "One platform for accounting, payroll and tax — all in sync.",
      svc_1_title: "Real-time reporting", svc_1_desc: "Live dashboards that show exactly where your money goes.",
      svc_2_title: "Automated bookkeeping", svc_2_desc: "Transactions categorised and reconciled automatically.",
      svc_3_title: "Tax & compliance", svc_3_desc: "Stay compliant with automated filings and reminders.",
      final_title: "Take control of your books", final_subtitle: "Join thousands of businesses simplifying their finances today.",
      final_cta: "Start free trial",
    },
  };
};

/* ───────────────────────── 51. NEST — Real estate ──────────────── */
const nestRealEstate = (): MarketplaceTemplate => {
  const content = `<style>
.ne{--bg:#faf8f5;--fg:#1c1a17;--muted:#6b665e;--line:rgba(0,0,0,.1);--ac:#b8814a;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ne *{box-sizing:border-box;margin:0}
.ne-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.ne h1,.ne h2,.ne h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.ne-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.ne-eye{display:inline-block;color:var(--ac);background:rgba(184,129,74,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.ne-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.ne-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.ne-cta{display:flex;gap:14px;flex-wrap:wrap}
.ne-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.ne-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(184,129,74,.3)}
.ne-btn-p:hover{transform:translateY(-2px)}
.ne-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.ne-hero img{width:100%;border-radius:18px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.18)}
.ne-sec{padding:clamp(54px,8vw,100px) 0}
.ne-head{text-align:center;max-width:600px;margin:0 auto 48px}
.ne-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.ne-head p{color:var(--muted);font-size:17px}
.ne-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.ne-card{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;transition:.25s}
.ne-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(0,0,0,.12)}
.ne-card img{width:100%;aspect-ratio:4/3;object-fit:cover}
.ne-card .body{padding:22px}
.ne-card h3{font-size:19px;margin-bottom:6px}
.ne-card p{color:var(--muted);font-size:14px}
.ne-card .price{color:var(--ac);font-weight:800;margin-top:12px;font-size:18px}
.ne-final{text-align:center;background:linear-gradient(135deg,#2a2620,#1c1a17);color:#faf8f5;border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.ne-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.ne-final p{color:rgba(250,248,245,.7);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.ne-hero{grid-template-columns:1fr}.ne-grid{grid-template-columns:1fr}}
</style>
<div class="ne">
  <section class="ne-wrap ne-hero">
    <div>
      <span class="ne-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="ne-cta"><a class="ne-btn ne-btn-p" href="#">{cta_primary}</a><a class="ne-btn ne-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="ne-sec"><div class="ne-wrap">
    <div class="ne-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="ne-grid">
      <div class="ne-card"><img src="{prop_1_image}" alt="{prop_1_title}"><div class="body"><h3>{prop_1_title}</h3><p>{prop_1_desc}</p><div class="price">{prop_1_price}</div></div></div>
      <div class="ne-card"><img src="{prop_2_image}" alt="{prop_2_title}"><div class="body"><h3>{prop_2_title}</h3><p>{prop_2_desc}</p><div class="price">{prop_2_price}</div></div></div>
      <div class="ne-card"><img src="{prop_3_image}" alt="{prop_3_title}"><div class="body"><h3>{prop_3_title}</h3><p>{prop_3_desc}</p><div class="price">{prop_3_price}</div></div></div>
    </div>
  </div></section>
  <section class="ne-sec"><div class="ne-wrap"><div class="ne-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="ne-btn ne-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "real-estate-nest", name: "Real Estate Template", description: "Warm, elegant real estate landing with property listing cards and prices.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{prop_1_title}", "{prop_1_desc}", "{prop_1_price}", "{prop_1_image}",
      "{prop_2_title}", "{prop_2_desc}", "{prop_2_price}", "{prop_2_image}",
      "{prop_3_title}", "{prop_3_desc}", "{prop_3_price}", "{prop_3_image}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["real estate", "property", "realtor", "homes", "light"],
    author: "Community", downloads: 356, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-real-estate",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1560518883-ce09059eeffa", 1200, 630),
    schema_type: "RealEstateAgent", platform: "generic",
    defaultValues: {
      eyebrow: "Find your home", hero_title: "Discover the place you'll love to live",
      hero_subtitle: "Browse handpicked homes and apartments with a trusted local agent by your side.",
      cta_primary: "Browse listings", cta_secondary: "Talk to an agent", hero_image: U("1560518883-ce09059eeffa"),
      services_title: "Featured properties", services_subtitle: "A selection of our most sought-after listings this month.",
      prop_1_title: "Modern family home", prop_1_desc: "4 bed · 3 bath · garden", prop_1_price: "$845,000", prop_1_image: U("1568605114967-8130f3a36994"),
      prop_2_title: "Downtown apartment", prop_2_desc: "2 bed · 2 bath · city view", prop_2_price: "$520,000", prop_2_image: U("1502672260266-1c1ef2d93688"),
      prop_3_title: "Coastal villa", prop_3_desc: "5 bed · 4 bath · pool", prop_3_price: "$1,250,000", prop_3_image: U("1512917774080-9991f1c4c750"),
      final_title: "Ready to find your dream home?", final_subtitle: "Get a free consultation with our expert agents today.",
      final_cta: "Book a viewing",
    },
  };
};

/* ───────────────────────── 52. SAVOR — Restaurant ──────────────── */
const savorRestaurant = (): MarketplaceTemplate => {
  const content = `<style>
.sv{--bg:#13100c;--fg:#f6efe6;--muted:#b3a795;--line:rgba(255,255,255,.1);--ac:#e0a64e;--card:#1c1812;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sv *{box-sizing:border-box;margin:0}
.sv-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.sv h1,.sv h2,.sv h3{letter-spacing:-.02em;line-height:1.1;font-weight:800}
.sv-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.sv-eye{display:inline-block;color:var(--ac);background:rgba(224,166,78,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.sv-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.sv-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.sv-cta{display:flex;gap:14px;flex-wrap:wrap}
.sv-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.sv-btn-p{background:var(--ac);color:#13100c;box-shadow:0 14px 32px rgba(224,166,78,.3)}
.sv-btn-p:hover{transform:translateY(-2px)}
.sv-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.sv-hero img{width:100%;border-radius:18px;aspect-ratio:4/4;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.5)}
.sv-sec{padding:clamp(54px,8vw,100px) 0}
.sv-head{text-align:center;max-width:600px;margin:0 auto 48px}
.sv-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.sv-head p{color:var(--muted);font-size:17px}
.sv-menu{display:grid;grid-template-columns:repeat(2,1fr);gap:18px 48px;max-width:880px;margin:0 auto}
.sv-item{display:flex;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px dashed var(--line)}
.sv-item h3{font-size:18px}
.sv-item p{color:var(--muted);font-size:14px;margin-top:4px}
.sv-item .pr{color:var(--ac);font-weight:800;white-space:nowrap}
.sv-final{text-align:center;background:linear-gradient(135deg,#241d14,#13100c);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.sv-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.sv-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.sv-hero{grid-template-columns:1fr}.sv-menu{grid-template-columns:1fr}}
</style>
<div class="sv">
  <section class="sv-wrap sv-hero">
    <div>
      <span class="sv-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="sv-cta"><a class="sv-btn sv-btn-p" href="#">{cta_primary}</a><a class="sv-btn sv-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="sv-sec"><div class="sv-wrap">
    <div class="sv-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="sv-menu">
      <div class="sv-item"><div><h3>{dish_1_title}</h3><p>{dish_1_desc}</p></div><span class="pr">{dish_1_price}</span></div>
      <div class="sv-item"><div><h3>{dish_2_title}</h3><p>{dish_2_desc}</p></div><span class="pr">{dish_2_price}</span></div>
      <div class="sv-item"><div><h3>{dish_3_title}</h3><p>{dish_3_desc}</p></div><span class="pr">{dish_3_price}</span></div>
      <div class="sv-item"><div><h3>{dish_4_title}</h3><p>{dish_4_desc}</p></div><span class="pr">{dish_4_price}</span></div>
    </div>
  </div></section>
  <section class="sv-sec"><div class="sv-wrap"><div class="sv-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="sv-btn sv-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "restaurant-savor", name: "Restaurant & Dining Template", description: "Warm fine-dining restaurant landing with hero and a two-column menu.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{dish_1_title}", "{dish_1_desc}", "{dish_1_price}",
      "{dish_2_title}", "{dish_2_desc}", "{dish_2_price}",
      "{dish_3_title}", "{dish_3_desc}", "{dish_3_price}",
      "{dish_4_title}", "{dish_4_desc}", "{dish_4_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["restaurant", "food", "dining", "menu", "dark"],
    author: "Community", downloads: 401, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-restaurant",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1517248135467-4c7edcad34c4", 1200, 630),
    schema_type: "Restaurant", platform: "generic",
    defaultValues: {
      eyebrow: "Taste the difference", hero_title: "Seasonal food, crafted with love",
      hero_subtitle: "A neighbourhood kitchen serving fresh, locally sourced dishes in a warm, welcoming space.",
      cta_primary: "Reserve a table", cta_secondary: "View full menu", hero_image: U("1517248135467-4c7edcad34c4"),
      services_title: "From our kitchen", services_subtitle: "A taste of our most loved seasonal plates.",
      dish_1_title: "Truffle pasta", dish_1_desc: "Hand-rolled tagliatelle, black truffle, parmesan", dish_1_price: "$24",
      dish_2_title: "Grilled sea bass", dish_2_desc: "Lemon butter, charred greens, herbs", dish_2_price: "$28",
      dish_3_title: "Wagyu burger", dish_3_desc: "Aged cheddar, caramelised onion, brioche", dish_3_price: "$19",
      dish_4_title: "Chocolate fondant", dish_4_desc: "Molten centre, vanilla bean ice cream", dish_4_price: "$12",
      final_title: "Book your table tonight", final_subtitle: "Walk-ins welcome, but reservations are recommended on weekends.",
      final_cta: "Reserve now",
    },
  };
};

/* ───────────────────────── 53. SCHOLAR — Education / course ──────────────── */
const scholarEducation = (): MarketplaceTemplate => {
  const content = `<style>
.sc{--bg:#f5f7fb;--fg:#16181d;--muted:#5f6675;--line:rgba(0,0,0,.1);--ac:#6d4aff;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sc *{box-sizing:border-box;margin:0}
.sc-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.sc h1,.sc h2,.sc h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.sc-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.sc-eye{display:inline-block;color:var(--ac);background:rgba(109,74,255,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.sc-hero h1{font-size:clamp(40px,6vw,66px);margin-bottom:18px}
.sc-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.sc-cta{display:flex;gap:14px;flex-wrap:wrap}
.sc-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.sc-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(109,74,255,.3)}
.sc-btn-p:hover{transform:translateY(-2px)}
.sc-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.sc-hero img{width:100%;border-radius:18px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.16)}
.sc-sec{padding:clamp(54px,8vw,100px) 0}
.sc-head{text-align:center;max-width:600px;margin:0 auto 48px}
.sc-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.sc-head p{color:var(--muted);font-size:17px}
.sc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.sc-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:30px;transition:.25s}
.sc-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(0,0,0,.1)}
.sc-card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(109,74,255,.12);margin-bottom:18px}
.sc-card h3{font-size:20px;margin-bottom:8px}
.sc-card p{color:var(--muted);font-size:15px}
.sc-final{text-align:center;background:linear-gradient(135deg,#6d4aff,#4a2fd6);color:#fff;border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.sc-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.sc-final p{color:rgba(255,255,255,.85);max-width:46ch;margin:0 auto 28px;font-size:17px}
.sc-final .sc-btn-p{background:#fff;color:var(--ac)}
@media(max-width:860px){.sc-hero{grid-template-columns:1fr}.sc-grid{grid-template-columns:1fr}}
</style>
<div class="sc">
  <section class="sc-wrap sc-hero">
    <div>
      <span class="sc-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="sc-cta"><a class="sc-btn sc-btn-p" href="#">{cta_primary}</a><a class="sc-btn sc-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="sc-sec"><div class="sc-wrap">
    <div class="sc-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="sc-grid">
      <div class="sc-card"><div class="ic">🎓</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="sc-card"><div class="ic">📚</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="sc-card"><div class="ic">💡</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="sc-sec"><div class="sc-wrap"><div class="sc-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="sc-btn sc-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "education-course-scholar", name: "Education & Course Template", description: "Friendly online learning landing with hero and course feature cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["education", "course", "elearning", "school", "light"],
    author: "Community", downloads: 374, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-courses",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1503676260728-1c00da094a0b", 1200, 630),
    schema_type: "EducationalOrganization", platform: "generic",
    defaultValues: {
      eyebrow: "Learn online", hero_title: "Master new skills at your own pace",
      hero_subtitle: "Expert-led courses with hands-on projects, certificates and a community to support you.",
      cta_primary: "Browse courses", cta_secondary: "Try free lesson", hero_image: U("1503676260728-1c00da094a0b"),
      services_title: "Why students love us", services_subtitle: "Everything you need to learn faster and go further.",
      svc_1_title: "Expert instructors", svc_1_desc: "Learn from industry pros with real-world experience.",
      svc_2_title: "Lifetime access", svc_2_desc: "Watch lessons anytime, on any device, forever.",
      svc_3_title: "Certificates", svc_3_desc: "Earn shareable certificates to boost your career.",
      final_title: "Start learning today", final_subtitle: "Join over 50,000 students building their future with us.",
      final_cta: "Enroll now",
    },
  };
};

/* ───────────────────────── 54. JOURNEY — Travel / tours ──────────────── */
const journeyTravel = (): MarketplaceTemplate => {
  const content = `<style>
.jy{--bg:#0a1418;--fg:#eafbf6;--muted:#8fb0aa;--line:rgba(255,255,255,.1);--ac:#15c39a;--card:#102023;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.jy *{box-sizing:border-box;margin:0}
.jy-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.jy h1,.jy h2,.jy h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.jy-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.jy-eye{display:inline-block;color:var(--ac);background:rgba(21,195,154,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.jy-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.jy-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.jy-cta{display:flex;gap:14px;flex-wrap:wrap}
.jy-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.jy-btn-p{background:var(--ac);color:#0a1418;box-shadow:0 14px 32px rgba(21,195,154,.3)}
.jy-btn-p:hover{transform:translateY(-2px)}
.jy-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.jy-hero img{width:100%;border-radius:18px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.5)}
.jy-sec{padding:clamp(54px,8vw,100px) 0}
.jy-head{text-align:center;max-width:600px;margin:0 auto 48px}
.jy-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.jy-head p{color:var(--muted);font-size:17px}
.jy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.jy-card{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:3/4;transition:.25s}
.jy-card:hover{transform:translateY(-4px)}
.jy-card img{width:100%;height:100%;object-fit:cover}
.jy-card .ov{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.8));display:flex;flex-direction:column;justify-content:flex-end;padding:22px}
.jy-card h3{font-size:21px;margin-bottom:4px}
.jy-card p{color:rgba(255,255,255,.8);font-size:14px}
.jy-card .pr{color:var(--ac);font-weight:800;margin-top:8px}
.jy-final{text-align:center;background:linear-gradient(135deg,#13282b,#0a1418);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.jy-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.jy-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.jy-hero{grid-template-columns:1fr}.jy-grid{grid-template-columns:1fr}}
</style>
<div class="jy">
  <section class="jy-wrap jy-hero">
    <div>
      <span class="jy-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="jy-cta"><a class="jy-btn jy-btn-p" href="#">{cta_primary}</a><a class="jy-btn jy-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="jy-sec"><div class="jy-wrap">
    <div class="jy-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="jy-grid">
      <div class="jy-card"><img src="{trip_1_image}" alt="{trip_1_title}"><div class="ov"><h3>{trip_1_title}</h3><p>{trip_1_desc}</p><div class="pr">{trip_1_price}</div></div></div>
      <div class="jy-card"><img src="{trip_2_image}" alt="{trip_2_title}"><div class="ov"><h3>{trip_2_title}</h3><p>{trip_2_desc}</p><div class="pr">{trip_2_price}</div></div></div>
      <div class="jy-card"><img src="{trip_3_image}" alt="{trip_3_title}"><div class="ov"><h3>{trip_3_title}</h3><p>{trip_3_desc}</p><div class="pr">{trip_3_price}</div></div></div>
    </div>
  </div></section>
  <section class="jy-sec"><div class="jy-wrap"><div class="jy-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="jy-btn jy-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "travel-tours-journey", name: "Travel & Tours Template", description: "Vibrant travel agency landing with hero and destination/trip cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{trip_1_title}", "{trip_1_desc}", "{trip_1_price}", "{trip_1_image}",
      "{trip_2_title}", "{trip_2_desc}", "{trip_2_price}", "{trip_2_image}",
      "{trip_3_title}", "{trip_3_desc}", "{trip_3_price}", "{trip_3_image}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["travel", "tours", "agency", "vacation", "dark"],
    author: "Community", downloads: 429, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-travel",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1469854523086-cc02fe5d8800", 1200, 630),
    schema_type: "TravelAgency", platform: "generic",
    defaultValues: {
      eyebrow: "Explore the world", hero_title: "Unforgettable journeys, expertly planned",
      hero_subtitle: "Handcrafted tours and adventures to the world's most breathtaking destinations.",
      cta_primary: "Find your trip", cta_secondary: "Talk to an expert", hero_image: U("1469854523086-cc02fe5d8800"),
      services_title: "Popular destinations", services_subtitle: "Our most loved trips, ready to book.",
      trip_1_title: "Bali, Indonesia", trip_1_desc: "7 days · beaches & temples", trip_1_price: "from $1,299", trip_1_image: U("1537953773345-d172ccf13cf1"),
      trip_2_title: "Swiss Alps", trip_2_desc: "5 days · mountains & lakes", trip_2_price: "from $1,799", trip_2_image: U("1531366936337-7c912a4589a7"),
      trip_3_title: "Santorini, Greece", trip_3_desc: "6 days · islands & sunsets", trip_3_price: "from $1,499", trip_3_image: U("1570077188670-e3a8d69ac5ff"),
      final_title: "Your next adventure awaits", final_subtitle: "Let our travel experts craft the perfect itinerary just for you.",
      final_cta: "Plan my trip",
    },
  };
};

export const FRAMER_BATCH9_TEMPLATES: MarketplaceTemplate[] = [
  peakFitness(),
  ledgerFinance(),
  nestRealEstate(),
  savorRestaurant(),
  scholarEducation(),
  journeyTravel(),
];
