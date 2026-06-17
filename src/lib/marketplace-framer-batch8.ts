// Framer-modelled marketplace templates — Batch 8 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 43. DRIVE — Auto repair / detailing ──────────────── */
const driveAuto = (): MarketplaceTemplate => {
  const content = `<style>
.dv{--bg:#0e1116;--fg:#f2f4f7;--muted:#9aa3af;--line:rgba(255,255,255,.1);--ac:#ff5722;--card:#161b22;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.dv *{box-sizing:border-box;margin:0}
.dv-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.dv h1,.dv h2,.dv h3{letter-spacing:-.02em;line-height:1.1;font-weight:800}
.dv-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.dv-eye{display:inline-block;color:var(--ac);background:rgba(255,87,34,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.dv-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.dv-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.dv-cta{display:flex;gap:14px;flex-wrap:wrap}
.dv-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.dv-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(255,87,34,.3)}
.dv-btn-p:hover{transform:translateY(-2px)}
.dv-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.dv-hero img{width:100%;border-radius:18px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.4)}
.dv-sec{padding:clamp(54px,8vw,100px) 0}
.dv-head{text-align:center;max-width:600px;margin:0 auto 48px}
.dv-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.dv-head p{color:var(--muted);font-size:17px}
.dv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.dv-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:30px;transition:.25s}
.dv-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.dv-card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(255,87,34,.16);margin-bottom:18px}
.dv-card h3{font-size:20px;margin-bottom:8px}
.dv-card p{color:var(--muted);font-size:15px}
.dv-final{text-align:center;background:linear-gradient(135deg,#1a1f27,#0e1116);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.dv-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.dv-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.dv-hero{grid-template-columns:1fr}.dv-grid{grid-template-columns:1fr}}
</style>
<div class="dv">
  <section class="dv-wrap dv-hero">
    <div>
      <span class="dv-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="dv-cta"><a class="dv-btn dv-btn-p" href="#">{cta_primary}</a><a class="dv-btn dv-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="dv-sec"><div class="dv-wrap">
    <div class="dv-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="dv-grid">
      <div class="dv-card"><div class="ic">🔧</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="dv-card"><div class="ic">🛞</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="dv-card"><div class="ic">✨</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="dv-sec"><div class="dv-wrap"><div class="dv-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="dv-btn dv-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "drive-auto", name: "Drive — Auto Repair & Detailing", description: "Bold auto repair / detailing landing with service cards and a strong CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["auto", "repair", "detailing", "garage", "dark"],
    author: "Community", downloads: 388, rating: 4.7,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-auto",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1486006920555-c77dcf18193c", 1200, 630),
    schema_type: "AutoRepair", platform: "generic",
    defaultValues: {
      eyebrow: "Auto shop", hero_title: "Expert care that keeps you on the road",
      hero_subtitle: "Honest diagnostics, quality repairs and showroom-grade detailing — all under one roof.",
      cta_primary: "Book service", cta_secondary: "Get a quote",
      hero_image: U("1486006920555-c77dcf18193c", 880, 800),
      services_title: "What we do", services_subtitle: "Full-service care for every make and model.",
      svc_1_title: "Repairs & diagnostics", svc_1_desc: "Certified techs fix it right the first time, fast.",
      svc_2_title: "Tires & alignment", svc_2_desc: "Premium tires, balancing and precision alignment.",
      svc_3_title: "Premium detailing", svc_3_desc: "Interior and exterior detailing that turns heads.",
      final_title: "Ready when you are", final_subtitle: "Book online in seconds and get back on the road with confidence.",
      final_cta: "Schedule now",
    },
  };
};

/* ───────────────────────── 44. SMILE — Dental clinic ─────────────────────── */
const smileDental = (): MarketplaceTemplate => {
  const content = `<style>
.sm{--bg:#f3f8fb;--fg:#16252e;--muted:#5f7682;--line:rgba(0,0,0,.08);--ac:#1aa3c4;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.65;overflow:hidden}
.sm *{box-sizing:border-box;margin:0}
.sm-wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.sm h1,.sm h2,.sm h3{letter-spacing:-.02em;line-height:1.12;font-weight:700}
.sm-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,124px) 0}
.sm-eye{display:inline-block;color:var(--ac);background:rgba(26,163,196,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.sm-hero h1{font-size:clamp(40px,6vw,66px);margin-bottom:18px}
.sm-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.sm-cta{display:flex;gap:14px;flex-wrap:wrap}
.sm-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.sm-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(26,163,196,.3)}
.sm-btn-p:hover{transform:translateY(-2px)}
.sm-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.sm-hero img{width:100%;border-radius:24px;aspect-ratio:4/4.2;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.12)}
.sm-sec{padding:clamp(54px,8vw,100px) 0}
.sm-head{text-align:center;max-width:600px;margin:0 auto 48px}
.sm-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.sm-head p{color:var(--muted);font-size:17px}
.sm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.sm-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px;text-align:center;transition:.25s}
.sm-card:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.1)}
.sm-card .ic{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:26px;background:rgba(26,163,196,.14);margin:0 auto 18px}
.sm-card h3{font-size:20px;margin-bottom:8px}
.sm-card p{color:var(--muted);font-size:15px}
.sm-final{text-align:center;background:linear-gradient(135deg,var(--ac),#0d7d99);color:#fff;border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.sm-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.sm-final p{opacity:.92;max-width:46ch;margin:0 auto 28px;font-size:17px}
.sm-final .sm-btn-p{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.sm-hero{grid-template-columns:1fr}.sm-grid{grid-template-columns:1fr}}
</style>
<div class="sm">
  <section class="sm-wrap sm-hero">
    <div>
      <span class="sm-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="sm-cta"><a class="sm-btn sm-btn-p" href="#">{cta_primary}</a><a class="sm-btn sm-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="sm-sec"><div class="sm-wrap">
    <div class="sm-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="sm-grid">
      <div class="sm-card"><div class="ic">🦷</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="sm-card"><div class="ic">✨</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="sm-card"><div class="ic">😁</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="sm-sec"><div class="sm-wrap"><div class="sm-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="sm-btn sm-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "smile-dental", name: "Smile — Dental Clinic", description: "Clean, trustworthy dental clinic landing with treatment cards and a booking CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "health", tags: ["dental", "dentist", "clinic", "health", "light"],
    author: "Community", downloads: 412, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-dental",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1606811841689-23dfddce3e95", 1200, 630),
    schema_type: "Dentist", platform: "generic",
    defaultValues: {
      eyebrow: "Dental care", hero_title: "Healthy smiles, gentle care",
      hero_subtitle: "Modern, pain-free dentistry for the whole family — from routine cleanings to full smile makeovers.",
      cta_primary: "Book appointment", cta_secondary: "Our services",
      hero_image: U("1606811841689-23dfddce3e95", 800, 840),
      services_title: "Our treatments", services_subtitle: "Comprehensive dental care under one calm, modern roof.",
      svc_1_title: "General dentistry", svc_1_desc: "Checkups, cleanings and fillings to keep teeth healthy.",
      svc_2_title: "Cosmetic dentistry", svc_2_desc: "Whitening, veneers and bonding for a brighter smile.",
      svc_3_title: "Orthodontics", svc_3_desc: "Clear aligners and braces for perfectly aligned teeth.",
      final_title: "Your best smile starts here", final_subtitle: "New patients welcome — book your first visit and meet our friendly team.",
      final_cta: "Schedule a visit",
    },
  };
};

/* ───────────────────────── 45. LUSH — Landscaping / garden ───────────────── */
const lushLandscaping = (): MarketplaceTemplate => {
  const content = `<style>
.lh{--bg:#f4f7f0;--fg:#22301c;--muted:#637157;--line:rgba(0,0,0,.08);--ac:#4c8a3a;--ac2:#a7c957;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.lh *{box-sizing:border-box;margin:0}
.lh-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.lh h1,.lh h2,.lh h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.lh-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.lh-eye{display:inline-block;color:var(--ac);background:rgba(76,138,58,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.lh-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.lh-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.lh-cta{display:flex;gap:14px;flex-wrap:wrap}
.lh-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.lh-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(76,138,58,.28)}
.lh-btn-p:hover{transform:translateY(-2px)}
.lh-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.lh-hero img{width:100%;border-radius:24px;aspect-ratio:4/3.8;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.14)}
.lh-sec{padding:clamp(54px,8vw,100px) 0}
.lh-head{text-align:center;max-width:600px;margin:0 auto 48px}
.lh-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.lh-head p{color:var(--muted);font-size:17px}
.lh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.lh-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;transition:.25s}
.lh-card:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.1)}
.lh-card .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:rgba(167,201,87,.24);margin-bottom:18px}
.lh-card h3{font-size:20px;margin-bottom:8px}
.lh-card p{color:var(--muted);font-size:15px}
.lh-final{text-align:center;background:linear-gradient(135deg,var(--ac),#2f5e25);color:#fff;border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.lh-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.lh-final p{opacity:.92;max-width:46ch;margin:0 auto 28px;font-size:17px}
.lh-final .lh-btn-p{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.lh-hero{grid-template-columns:1fr}.lh-grid{grid-template-columns:1fr}}
</style>
<div class="lh">
  <section class="lh-wrap lh-hero">
    <div>
      <span class="lh-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="lh-cta"><a class="lh-btn lh-btn-p" href="#">{cta_primary}</a><a class="lh-btn lh-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="lh-sec"><div class="lh-wrap">
    <div class="lh-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="lh-grid">
      <div class="lh-card"><div class="ic">🌳</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="lh-card"><div class="ic">🌷</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="lh-card"><div class="ic">💧</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="lh-sec"><div class="lh-wrap"><div class="lh-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="lh-btn lh-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "lush-landscaping", name: "Lush — Landscaping & Garden", description: "Fresh landscaping / garden care landing with service cards and a green CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["landscaping", "garden", "lawn", "outdoor", "green"],
    author: "Community", downloads: 356, rating: 4.7,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-landscaping",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1558904541-efa843a96f01", 1200, 630),
    schema_type: "LocalBusiness", platform: "generic",
    defaultValues: {
      eyebrow: "Landscaping", hero_title: "Gardens that grow with you",
      hero_subtitle: "Design, build and care for outdoor spaces you'll love — from lush lawns to thriving garden beds.",
      cta_primary: "Get a free quote", cta_secondary: "See our work",
      hero_image: U("1558904541-efa843a96f01", 880, 800),
      services_title: "Our services", services_subtitle: "End-to-end landscaping to transform any outdoor space.",
      svc_1_title: "Landscape design", svc_1_desc: "Custom designs that suit your style, site and budget.",
      svc_2_title: "Planting & gardens", svc_2_desc: "Seasonal planting and garden beds that flourish.",
      svc_3_title: "Lawn & irrigation", svc_3_desc: "Healthy lawns with efficient, smart watering systems.",
      final_title: "Let's grow something beautiful", final_subtitle: "Book a free on-site consultation and get a tailored plan for your yard.",
      final_cta: "Request a visit",
    },
  };
};

/* ───────────────────────── 46. SPARK — Electrician / home services ───────── */
const sparkElectrician = (): MarketplaceTemplate => {
  const content = `<style>
.sp{--bg:#101418;--fg:#f4f6f8;--muted:#9aa3ad;--line:rgba(255,255,255,.1);--ac:#f6c343;--card:#181d23;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sp *{box-sizing:border-box;margin:0}
.sp-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.sp h1,.sp h2,.sp h3{letter-spacing:-.02em;line-height:1.1;font-weight:800}
.sp-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.sp-eye{display:inline-block;color:#1a1d22;background:var(--ac);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;margin-bottom:18px}
.sp-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.sp-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.sp-cta{display:flex;gap:14px;flex-wrap:wrap}
.sp-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.sp-btn-p{background:var(--ac);color:#1a1d22;box-shadow:0 14px 32px rgba(246,195,67,.25)}
.sp-btn-p:hover{transform:translateY(-2px)}
.sp-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.sp-hero img{width:100%;border-radius:18px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.4)}
.sp-sec{padding:clamp(54px,8vw,100px) 0}
.sp-head{text-align:center;max-width:600px;margin:0 auto 48px}
.sp-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.sp-head p{color:var(--muted);font-size:17px}
.sp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.sp-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:30px;transition:.25s}
.sp-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.sp-card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(246,195,67,.18);margin-bottom:18px}
.sp-card h3{font-size:20px;margin-bottom:8px}
.sp-card p{color:var(--muted);font-size:15px}
.sp-final{text-align:center;background:linear-gradient(135deg,#1c2128,#101418);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.sp-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.sp-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.sp-hero{grid-template-columns:1fr}.sp-grid{grid-template-columns:1fr}}
</style>
<div class="sp">
  <section class="sp-wrap sp-hero">
    <div>
      <span class="sp-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="sp-cta"><a class="sp-btn sp-btn-p" href="#">{cta_primary}</a><a class="sp-btn sp-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="sp-sec"><div class="sp-wrap">
    <div class="sp-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="sp-grid">
      <div class="sp-card"><div class="ic">⚡</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="sp-card"><div class="ic">💡</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="sp-card"><div class="ic">🔌</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="sp-sec"><div class="sp-wrap"><div class="sp-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="sp-btn sp-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "spark-electrician", name: "Spark — Electrician & Home Services", description: "High-energy electrician / home-services landing with service cards and a clear CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["electrician", "home-services", "electrical", "contractor", "dark"],
    author: "Community", downloads: 341, rating: 4.7,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-electrician",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1621905251189-08b45d6a269e", 1200, 630),
    schema_type: "Electrician", platform: "generic",
    defaultValues: {
      eyebrow: "Electrical services", hero_title: "Licensed electricians you can trust",
      hero_subtitle: "Fast, safe and certified electrical work for homes and businesses — available when you need us.",
      cta_primary: "Book an electrician", cta_secondary: "Emergency call",
      hero_image: U("1621905251189-08b45d6a269e", 880, 800),
      services_title: "What we handle", services_subtitle: "From quick fixes to full rewires, done to code.",
      svc_1_title: "Repairs & faults", svc_1_desc: "Rapid diagnosis and safe repair of any electrical issue.",
      svc_2_title: "Lighting & fixtures", svc_2_desc: "Indoor and outdoor lighting installs that shine.",
      svc_3_title: "Panels & wiring", svc_3_desc: "Upgrades, rewires and EV charger installations.",
      final_title: "Need an electrician today?", final_subtitle: "Call now or book online for a fast, no-surprise quote from a licensed pro.",
      final_cta: "Get a quote",
    },
  };
};

/* ───────────────────────── 47. AROMA — Coffee roastery ───────────────────── */
const aromaCoffee = (): MarketplaceTemplate => {
  const content = `<style>
.ar{--bg:#1c130d;--fg:#f4ece3;--muted:#bba894;--line:rgba(255,255,255,.1);--ac:#d99a5b;--card:#27190f;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ar *{box-sizing:border-box;margin:0}
.ar-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.ar h1,.ar h2,.ar h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.ar-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.ar-eye{display:inline-block;color:var(--ac);background:rgba(217,154,91,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.ar-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.ar-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.ar-cta{display:flex;gap:14px;flex-wrap:wrap}
.ar-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.ar-btn-p{background:var(--ac);color:#1c130d;box-shadow:0 14px 32px rgba(217,154,91,.25)}
.ar-btn-p:hover{transform:translateY(-2px)}
.ar-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.ar-hero img{width:100%;border-radius:20px;aspect-ratio:4/3.8;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.4)}
.ar-sec{padding:clamp(54px,8vw,100px) 0}
.ar-head{text-align:center;max-width:600px;margin:0 auto 48px}
.ar-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.ar-head p{color:var(--muted);font-size:17px}
.ar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.ar-prod{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.25s}
.ar-prod:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.3)}
.ar-prod img{width:100%;aspect-ratio:4/3;object-fit:cover}
.ar-prod .b{padding:20px}
.ar-prod h3{font-size:18px;margin-bottom:6px}
.ar-prod p{color:var(--muted);font-size:14px;margin-bottom:8px}
.ar-prod .pr{color:var(--ac);font-weight:700;font-size:17px}
.ar-final{text-align:center;background:linear-gradient(135deg,#3a2415,#1c130d);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.ar-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.ar-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.ar-hero{grid-template-columns:1fr}.ar-grid{grid-template-columns:1fr 1fr}}
</style>
<div class="ar">
  <section class="ar-wrap ar-hero">
    <div>
      <span class="ar-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="ar-cta"><a class="ar-btn ar-btn-p" href="#">{cta_primary}</a><a class="ar-btn ar-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="ar-sec"><div class="ar-wrap">
    <div class="ar-head"><h2>{menu_title}</h2><p>{menu_subtitle}</p></div>
    <div class="ar-grid">
      <div class="ar-prod"><img src="{prod_1_image}" alt="{prod_1_title}"><div class="b"><h3>{prod_1_title}</h3><p>{prod_1_desc}</p><span class="pr">{prod_1_price}</span></div></div>
      <div class="ar-prod"><img src="{prod_2_image}" alt="{prod_2_title}"><div class="b"><h3>{prod_2_title}</h3><p>{prod_2_desc}</p><span class="pr">{prod_2_price}</span></div></div>
      <div class="ar-prod"><img src="{prod_3_image}" alt="{prod_3_title}"><div class="b"><h3>{prod_3_title}</h3><p>{prod_3_desc}</p><span class="pr">{prod_3_price}</span></div></div>
    </div>
  </div></section>
  <section class="ar-sec"><div class="ar-wrap"><div class="ar-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="ar-btn ar-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "aroma-coffee", name: "Aroma — Coffee Roastery", description: "Warm coffee roastery landing with a product grid and a cozy CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{menu_title}", "{menu_subtitle}",
      "{prod_1_image}", "{prod_1_title}", "{prod_1_desc}", "{prod_1_price}",
      "{prod_2_image}", "{prod_2_title}", "{prod_2_desc}", "{prod_2_price}",
      "{prod_3_image}", "{prod_3_title}", "{prod_3_desc}", "{prod_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "ecommerce", tags: ["coffee", "roastery", "cafe", "beans", "dark"],
    author: "Community", downloads: 433, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-coffee",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1447933601403-0c6688de566e", 1200, 630),
    schema_type: "CafeOrCoffeeShop", platform: "generic",
    defaultValues: {
      eyebrow: "Coffee roastery", hero_title: "Freshly roasted, ethically sourced",
      hero_subtitle: "Small-batch specialty coffee roasted in-house and shipped to your door at peak flavor.",
      cta_primary: "Shop beans", cta_secondary: "Visit the café",
      hero_image: U("1447933601403-0c6688de566e", 880, 800),
      menu_title: "Our roasts", menu_subtitle: "Single-origin and signature blends for every brewing style.",
      prod_1_image: U("1559056199-641a0ac8b55e", 600, 450), prod_1_title: "House blend", prod_1_desc: "Balanced, chocolatey and smooth — an everyday favorite.", prod_1_price: "$16",
      prod_2_image: U("1442512595331-e89e73853f31", 600, 450), prod_2_title: "Ethiopia single-origin", prod_2_desc: "Bright, floral notes with a citrus finish.", prod_2_price: "$19",
      prod_3_image: U("1495474472287-4d71bcdd2085", 600, 450), prod_3_title: "Dark espresso", prod_3_desc: "Bold, full-bodied roast made for espresso.", prod_3_price: "$18",
      final_title: "Never run out of great coffee", final_subtitle: "Subscribe and save — fresh beans delivered on your schedule, free shipping.",
      final_cta: "Start a subscription",
    },
  };
};

/* ───────────────────────── 48. PIXEL — Creative / design agency ──────────── */
const pixelAgency = (): MarketplaceTemplate => {
  const content = `<style>
.px{--bg:#0c0c10;--fg:#f5f5f7;--muted:#9a9aa5;--line:rgba(255,255,255,.1);--ac:#7c5cff;--ac2:#ff5ca8;--card:#15151c;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.px *{box-sizing:border-box;margin:0}
.px-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.px h1,.px h2,.px h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.px-hero{text-align:center;padding:clamp(72px,12vw,140px) 0 clamp(48px,7vw,80px)}
.px-eye{display:inline-block;background:linear-gradient(90deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px}
.px-hero h1{font-size:clamp(44px,8vw,92px);max-width:16ch;margin:0 auto 20px}
.px-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:52ch;margin:0 auto 28px}
.px-cta{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.px-btn{display:inline-flex;align-items:center;padding:15px 30px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.px-btn-p{background:linear-gradient(90deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 36px rgba(124,92,255,.35)}
.px-btn-p:hover{transform:translateY(-2px)}
.px-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.px-sec{padding:clamp(54px,8vw,100px) 0}
.px-head{text-align:center;max-width:620px;margin:0 auto 48px}
.px-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.px-head p{color:var(--muted);font-size:17px}
.px-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.px-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;transition:.25s}
.px-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.px-card .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:linear-gradient(135deg,rgba(124,92,255,.25),rgba(255,92,168,.2));margin-bottom:18px}
.px-card h3{font-size:20px;margin-bottom:8px}
.px-card p{color:var(--muted);font-size:15px}
.px-final{text-align:center;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.px-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.px-final p{opacity:.92;max-width:46ch;margin:0 auto 28px;font-size:17px}
.px-final .px-btn-p{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.px-grid{grid-template-columns:1fr}}
</style>
<div class="px">
  <section class="px-wrap px-hero">
    <span class="px-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="px-cta"><a class="px-btn px-btn-p" href="#">{cta_primary}</a><a class="px-btn px-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="px-sec"><div class="px-wrap">
    <div class="px-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="px-grid">
      <div class="px-card"><div class="ic">🎨</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="px-card"><div class="ic">💻</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="px-card"><div class="ic">🚀</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="px-sec"><div class="px-wrap"><div class="px-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="px-btn px-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "pixel-agency", name: "Pixel — Creative & Design Agency", description: "Bold gradient creative/design agency landing with centered hero and service cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["agency", "design", "creative", "studio", "dark"],
    author: "Community", downloads: 471, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-agency",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1561070791-2526d30994b5", 1200, 630),
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "Creative agency", hero_title: "We design brands people remember",
      hero_subtitle: "A full-service creative studio crafting standout brands, websites and campaigns that convert.",
      cta_primary: "Start a project", cta_secondary: "View our work",
      services_title: "What we do", services_subtitle: "Strategy, design and build — everything your brand needs to stand out.",
      svc_1_title: "Brand & identity", svc_1_desc: "Logos, systems and guidelines that make you unforgettable.",
      svc_2_title: "Web & product", svc_2_desc: "Beautiful, fast websites and product experiences.",
      svc_3_title: "Growth & campaigns", svc_3_desc: "Creative campaigns that drive real, measurable results.",
      final_title: "Let's build something bold", final_subtitle: "Tell us about your project and we'll get back within 24 hours.",
      final_cta: "Get in touch",
    },
  };
};

export const FRAMER_BATCH8_TEMPLATES: MarketplaceTemplate[] = [
  driveAuto(),
  smileDental(),
  lushLandscaping(),
  sparkElectrician(),
  aromaCoffee(),
  pixelAgency(),
];
