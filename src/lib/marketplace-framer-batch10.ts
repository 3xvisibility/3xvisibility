// Framer-modelled marketplace templates — Batch 10 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 55. ORBIT — SaaS / startup ──────────────── */
const orbitSaas = (): MarketplaceTemplate => {
  const content = `<style>
.ob{--bg:#0a0a12;--fg:#f2f3f8;--muted:#9aa0b4;--line:rgba(255,255,255,.1);--ac:#7c5cff;--card:#13131f;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ob *{box-sizing:border-box;margin:0}
.ob-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.ob h1,.ob h2,.ob h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.ob-hero{text-align:center;padding:clamp(72px,11vw,140px) 0 clamp(40px,6vw,72px);max-width:760px;margin:0 auto}
.ob-eye{display:inline-block;color:var(--ac);background:rgba(124,92,255,.16);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:20px}
.ob-hero h1{font-size:clamp(40px,6.5vw,70px);margin-bottom:20px}
.ob-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:48ch;margin:0 auto 28px}
.ob-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.ob-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.ob-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(124,92,255,.34)}
.ob-btn-p:hover{transform:translateY(-2px)}
.ob-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.ob-shot{max-width:980px;margin:0 auto;padding:0 24px}
.ob-shot img{width:100%;border-radius:18px;border:1px solid var(--line);box-shadow:0 30px 64px rgba(0,0,0,.5)}
.ob-sec{padding:clamp(54px,8vw,100px) 0}
.ob-head{text-align:center;max-width:600px;margin:0 auto 48px}
.ob-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.ob-head p{color:var(--muted);font-size:17px}
.ob-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.ob-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:30px;transition:.25s}
.ob-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.ob-card .ic{width:52px;height:52px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(124,92,255,.18);margin-bottom:18px}
.ob-card h3{font-size:20px;margin-bottom:8px}
.ob-card p{color:var(--muted);font-size:15px}
.ob-final{text-align:center;background:linear-gradient(135deg,#1a172e,#0a0a12);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.ob-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.ob-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.ob-grid{grid-template-columns:1fr}}
</style>
<div class="ob">
  <section class="ob-hero">
    <span class="ob-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="ob-cta"><a class="ob-btn ob-btn-p" href="#">{cta_primary}</a><a class="ob-btn ob-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="ob-shot"><img src="{hero_image}" alt="{hero_title}"></section>
  <section class="ob-sec"><div class="ob-wrap">
    <div class="ob-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="ob-grid">
      <div class="ob-card"><div class="ic">⚡</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="ob-card"><div class="ic">🔒</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="ob-card"><div class="ic">📈</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="ob-sec"><div class="ob-wrap"><div class="ob-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="ob-btn ob-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "saas-startup-orbit", name: "SaaS & Startup Template", description: "Modern dark SaaS landing with centered hero, product shot and feature cards.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["saas", "startup", "software", "tech", "dark"],
    author: "Community", downloads: 467, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-saas",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1551288049-bebda4e38f71", 1200, 630),
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "Built for teams", hero_title: "Ship faster with one connected workspace",
      hero_subtitle: "Plan, build and launch your product from a single platform your whole team will love.",
      cta_primary: "Start free", cta_secondary: "Watch demo", hero_image: U("1551288049-bebda4e38f71"),
      services_title: "Everything you need to scale", services_subtitle: "Powerful features that grow with your business.",
      svc_1_title: "Lightning fast", svc_1_desc: "Optimised performance so your team never waits.",
      svc_2_title: "Secure by default", svc_2_desc: "Enterprise-grade security and access controls built in.",
      svc_3_title: "Insightful analytics", svc_3_desc: "Real-time dashboards to track every metric that matters.",
      final_title: "Ready to get started?", final_subtitle: "Join thousands of teams shipping better products, faster.",
      final_cta: "Try it free",
    },
  };
};

/* ───────────────────────── 56. APERTURE — Photography ──────────────── */
const aperturePhotography = (): MarketplaceTemplate => {
  const content = `<style>
.ap{--bg:#0d0d0d;--fg:#f5f5f5;--muted:#a0a0a0;--line:rgba(255,255,255,.12);--ac:#e8b44a;--card:#161616;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ap *{box-sizing:border-box;margin:0}
.ap-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.ap h1,.ap h2,.ap h3{letter-spacing:-.02em;line-height:1.05;font-weight:800}
.ap-hero{text-align:center;padding:clamp(72px,11vw,130px) 0 clamp(36px,5vw,60px);max-width:780px;margin:0 auto}
.ap-eye{display:inline-block;color:var(--ac);letter-spacing:.2em;text-transform:uppercase;font-size:12px;font-weight:700;margin-bottom:20px}
.ap-hero h1{font-size:clamp(40px,7vw,76px);margin-bottom:20px}
.ap-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:46ch;margin:0 auto 28px}
.ap-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.ap-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.ap-btn-p{background:var(--ac);color:#0d0d0d}
.ap-btn-p:hover{transform:translateY(-2px)}
.ap-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.ap-sec{padding:clamp(40px,7vw,80px) 0}
.ap-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ap-gallery img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:12px;transition:.35s}
.ap-gallery img:hover{transform:scale(1.02);filter:brightness(1.08)}
.ap-head{text-align:center;max-width:600px;margin:0 auto 44px}
.ap-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.ap-head p{color:var(--muted);font-size:17px}
.ap-final{text-align:center;background:linear-gradient(135deg,#1f1a10,#0d0d0d);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.ap-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.ap-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:760px){.ap-gallery{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="ap">
  <section class="ap-hero">
    <span class="ap-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="ap-cta"><a class="ap-btn ap-btn-p" href="#">{cta_primary}</a><a class="ap-btn ap-btn-g" href="#">{cta_secondary}</a></div>
  </section>
  <section class="ap-sec"><div class="ap-wrap">
    <div class="ap-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="ap-gallery">
      <img src="{gal_1}" alt="{hero_title}"><img src="{gal_2}" alt="{hero_title}"><img src="{gal_3}" alt="{hero_title}">
      <img src="{gal_4}" alt="{hero_title}"><img src="{gal_5}" alt="{hero_title}"><img src="{gal_6}" alt="{hero_title}">
    </div>
  </div></section>
  <section class="ap-sec"><div class="ap-wrap"><div class="ap-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="ap-btn ap-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "photography-aperture", name: "Photography Portfolio Template", description: "Minimal dark photography portfolio with a clean image gallery grid.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{gal_1}", "{gal_2}", "{gal_3}", "{gal_4}", "{gal_5}", "{gal_6}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["photography", "portfolio", "gallery", "creative", "dark"],
    author: "Community", downloads: 341, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-photography",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1502920917128-1aa500764cbd", 1200, 630),
    schema_type: "LocalBusiness", platform: "generic",
    defaultValues: {
      eyebrow: "Photographer", hero_title: "Capturing moments that last forever",
      hero_subtitle: "Fine-art portrait, wedding and lifestyle photography crafted with care.",
      cta_primary: "Book a session", cta_secondary: "View portfolio",
      services_title: "Selected work", services_subtitle: "A glimpse into recent shoots and personal projects.",
      gal_1: U("1502920917128-1aa500764cbd", 600, 800), gal_2: U("1519741497674-611481863552", 600, 800),
      gal_3: U("1492691527719-9d1e07e534b4", 600, 800), gal_4: U("1500648767791-00dcc994a43e", 600, 800),
      gal_5: U("1524504388940-b1c1722653e1", 600, 800), gal_6: U("1506794778202-cad84cf45f1d", 600, 800),
      final_title: "Let's create something beautiful", final_subtitle: "Get in touch to book your photography session today.",
      final_cta: "Contact me",
    },
  };
};

/* ───────────────────────── 57. JUSTICE — Law firm ──────────────── */
const justiceLaw = (): MarketplaceTemplate => {
  const content = `<style>
.js{--bg:#0f1419;--fg:#eef2f6;--muted:#94a0ac;--line:rgba(255,255,255,.1);--ac:#c9a227;--card:#161d24;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.js *{box-sizing:border-box;margin:0}
.js-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.js h1,.js h2,.js h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.js-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.js-eye{display:inline-block;color:var(--ac);letter-spacing:.16em;text-transform:uppercase;font-size:12px;font-weight:700;margin-bottom:18px}
.js-hero h1{font-size:clamp(38px,6vw,66px);margin-bottom:18px}
.js-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.js-cta{display:flex;gap:14px;flex-wrap:wrap}
.js-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:6px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.js-btn-p{background:var(--ac);color:#0f1419}
.js-btn-p:hover{transform:translateY(-2px)}
.js-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.js-hero img{width:100%;border-radius:12px;aspect-ratio:4/4;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.5)}
.js-sec{padding:clamp(54px,8vw,100px) 0}
.js-head{text-align:center;max-width:600px;margin:0 auto 48px}
.js-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.js-head p{color:var(--muted);font-size:17px}
.js-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.js-card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:30px;transition:.25s}
.js-card:hover{transform:translateY(-4px);border-color:var(--ac)}
.js-card .ic{width:52px;height:52px;border-radius:8px;display:grid;place-items:center;font-size:24px;background:rgba(201,162,39,.16);margin-bottom:18px}
.js-card h3{font-size:20px;margin-bottom:8px}
.js-card p{color:var(--muted);font-size:15px}
.js-final{text-align:center;background:linear-gradient(135deg,#1c2530,#0f1419);border:1px solid var(--line);border-radius:18px;padding:clamp(54px,8vw,96px) 24px}
.js-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.js-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.js-hero{grid-template-columns:1fr}.js-grid{grid-template-columns:1fr}}
</style>
<div class="js">
  <section class="js-wrap js-hero">
    <div>
      <span class="js-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="js-cta"><a class="js-btn js-btn-p" href="#">{cta_primary}</a><a class="js-btn js-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="js-sec"><div class="js-wrap">
    <div class="js-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="js-grid">
      <div class="js-card"><div class="ic">⚖️</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="js-card"><div class="ic">🏛️</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="js-card"><div class="ic">📜</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="js-sec"><div class="js-wrap"><div class="js-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="js-btn js-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "law-firm-justice", name: "Law Firm Template", description: "Authoritative dark law-firm landing with gold accents, split hero and practice areas.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["law", "legal", "attorney", "firm", "dark"],
    author: "Community", downloads: 372, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-law-firm",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1589829545856-d10d557cf95f", 1200, 630),
    schema_type: "LegalService", platform: "generic",
    defaultValues: {
      eyebrow: "Trusted counsel", hero_title: "Protecting your rights with experience",
      hero_subtitle: "A dedicated team of attorneys fighting for the best outcome in every case.",
      cta_primary: "Free consultation", cta_secondary: "Our practice areas", hero_image: U("1589829545856-d10d557cf95f"),
      services_title: "Our practice areas", services_subtitle: "Comprehensive legal services across a range of disciplines.",
      svc_1_title: "Corporate law", svc_1_desc: "Advising businesses on contracts, compliance and disputes.",
      svc_2_title: "Family law", svc_2_desc: "Compassionate guidance through divorce and custody matters.",
      svc_3_title: "Personal injury", svc_3_desc: "Securing fair compensation for accidents and negligence.",
      final_title: "Get the representation you deserve", final_subtitle: "Schedule a free, confidential consultation with our team today.",
      final_cta: "Book consultation",
    },
  };
};

/* ───────────────────────── 58. GLOW — Beauty / salon ──────────────── */
const glowBeauty = (): MarketplaceTemplate => {
  const content = `<style>
.gw{--bg:#fdf6f3;--fg:#2a1d22;--muted:#8a7178;--line:rgba(0,0,0,.08);--ac:#d98a8a;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.gw *{box-sizing:border-box;margin:0}
.gw-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.gw h1,.gw h2,.gw h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.gw-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.gw-eye{display:inline-block;color:var(--ac);background:rgba(217,138,138,.16);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.gw-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.gw-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.gw-cta{display:flex;gap:14px;flex-wrap:wrap}
.gw-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.gw-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(217,138,138,.34)}
.gw-btn-p:hover{transform:translateY(-2px)}
.gw-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.gw-hero img{width:100%;border-radius:20px;aspect-ratio:4/4.2;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.14)}
.gw-sec{padding:clamp(54px,8vw,100px) 0}
.gw-head{text-align:center;max-width:600px;margin:0 auto 48px}
.gw-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.gw-head p{color:var(--muted);font-size:17px}
.gw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.gw-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;text-align:center;transition:.25s}
.gw-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(0,0,0,.1)}
.gw-card .ic{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-size:24px;background:rgba(217,138,138,.16);margin:0 auto 18px}
.gw-card h3{font-size:20px;margin-bottom:8px}
.gw-card p{color:var(--muted);font-size:15px;margin-bottom:10px}
.gw-card .price{color:var(--ac);font-weight:800;font-size:18px}
.gw-final{text-align:center;background:linear-gradient(135deg,#f4d9d4,#fdf6f3);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.gw-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.gw-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.gw-hero{grid-template-columns:1fr}.gw-grid{grid-template-columns:1fr}}
</style>
<div class="gw">
  <section class="gw-wrap gw-hero">
    <div>
      <span class="gw-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="gw-cta"><a class="gw-btn gw-btn-p" href="#">{cta_primary}</a><a class="gw-btn gw-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="gw-sec"><div class="gw-wrap">
    <div class="gw-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="gw-grid">
      <div class="gw-card"><div class="ic">💆</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p><div class="price">{svc_1_price}</div></div>
      <div class="gw-card"><div class="ic">💅</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p><div class="price">{svc_2_price}</div></div>
      <div class="gw-card"><div class="ic">✨</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p><div class="price">{svc_3_price}</div></div>
    </div>
  </div></section>
  <section class="gw-sec"><div class="gw-wrap"><div class="gw-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="gw-btn gw-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "beauty-salon-glow", name: "Beauty & Salon Template", description: "Soft, elegant beauty salon landing with service price cards and warm tones.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_1_price}", "{svc_2_title}", "{svc_2_desc}", "{svc_2_price}",
      "{svc_3_title}", "{svc_3_desc}", "{svc_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["beauty", "salon", "spa", "wellness", "light"],
    author: "Community", downloads: 398, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-beauty-salon",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1560066984-138dadb4c035", 1200, 630),
    schema_type: "BeautySalon", platform: "generic",
    defaultValues: {
      eyebrow: "Look & feel your best", hero_title: "Beauty, crafted just for you",
      hero_subtitle: "Indulge in expert hair, skin and nail treatments in a calm, luxurious space.",
      cta_primary: "Book appointment", cta_secondary: "View services", hero_image: U("1560066984-138dadb4c035"),
      services_title: "Our signature treatments", services_subtitle: "Pamper yourself with our most popular services.",
      svc_1_title: "Facial & skincare", svc_1_desc: "Glowing, refreshed skin with bespoke facial treatments.", svc_1_price: "$65",
      svc_2_title: "Manicure & pedicure", svc_2_desc: "Flawless nails with premium polishes and care.", svc_2_price: "$45",
      svc_3_title: "Hair styling", svc_3_desc: "Cuts, colour and styling by our expert stylists.", svc_3_price: "$80",
      final_title: "Treat yourself today", final_subtitle: "Book your appointment online and enjoy 10% off your first visit.",
      final_cta: "Reserve your spot",
    },
  };
};

/* ───────────────────────── 59. WAVE — Podcast / audio ──────────────── */
const wavePodcast = (): MarketplaceTemplate => {
  const content = `<style>
.wv{--bg:#0b0e1a;--fg:#eef1fb;--muted:#9099b5;--line:rgba(255,255,255,.1);--ac:#5eead4;--card:#131829;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.wv *{box-sizing:border-box;margin:0}
.wv-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.wv h1,.wv h2,.wv h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.wv-hero{display:grid;grid-template-columns:1fr .85fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.wv-eye{display:inline-block;color:var(--ac);background:rgba(94,234,212,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.wv-hero h1{font-size:clamp(40px,6.2vw,70px);margin-bottom:18px}
.wv-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.wv-cta{display:flex;gap:14px;flex-wrap:wrap}
.wv-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.wv-btn-p{background:var(--ac);color:#0b0e1a}
.wv-btn-p:hover{transform:translateY(-2px)}
.wv-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.wv-hero img{width:100%;border-radius:50%;aspect-ratio:1;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.5);border:6px solid var(--card)}
.wv-sec{padding:clamp(54px,8vw,100px) 0}
.wv-head{text-align:center;max-width:600px;margin:0 auto 48px}
.wv-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.wv-head p{color:var(--muted);font-size:17px}
.wv-list{display:flex;flex-direction:column;gap:14px;max-width:760px;margin:0 auto}
.wv-ep{display:flex;align-items:center;gap:18px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 24px;transition:.25s}
.wv-ep:hover{transform:translateY(-3px);border-color:var(--ac)}
.wv-ep .num{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:rgba(94,234,212,.16);color:var(--ac);flex-shrink:0}
.wv-ep h3{font-size:18px;margin-bottom:4px}
.wv-ep p{color:var(--muted);font-size:14px}
.wv-final{text-align:center;background:linear-gradient(135deg,#13202b,#0b0e1a);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.wv-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.wv-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.wv-hero{grid-template-columns:1fr}}
</style>
<div class="wv">
  <section class="wv-wrap wv-hero">
    <div>
      <span class="wv-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="wv-cta"><a class="wv-btn wv-btn-p" href="#">{cta_primary}</a><a class="wv-btn wv-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="wv-sec"><div class="wv-wrap">
    <div class="wv-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="wv-list">
      <div class="wv-ep"><div class="num">01</div><div><h3>{ep_1_title}</h3><p>{ep_1_desc}</p></div></div>
      <div class="wv-ep"><div class="num">02</div><div><h3>{ep_2_title}</h3><p>{ep_2_desc}</p></div></div>
      <div class="wv-ep"><div class="num">03</div><div><h3>{ep_3_title}</h3><p>{ep_3_desc}</p></div></div>
    </div>
  </div></section>
  <section class="wv-sec"><div class="wv-wrap"><div class="wv-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="wv-btn wv-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "podcast-wave", name: "Podcast Template", description: "Modern dark podcast landing with circular host image and episode list.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{services_title}", "{services_subtitle}",
      "{ep_1_title}", "{ep_1_desc}", "{ep_2_title}", "{ep_2_desc}", "{ep_3_title}", "{ep_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["podcast", "audio", "media", "show", "dark"],
    author: "Community", downloads: 327, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-podcast",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1478737270239-2f02b77fc618", 1200, 630),
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "New episodes weekly", hero_title: "Conversations that move you forward",
      hero_subtitle: "Honest talks with founders, creators and thinkers about life, work and growth.",
      cta_primary: "Listen now", cta_secondary: "Subscribe", hero_image: U("1478737270239-2f02b77fc618", 800, 800),
      services_title: "Latest episodes", services_subtitle: "Catch up on our most recent conversations.",
      ep_1_title: "Building in public", ep_1_desc: "How transparency fuels faster growth — 42 min.",
      ep_2_title: "The creative process", ep_2_desc: "Turning ideas into finished work — 38 min.",
      ep_3_title: "Lessons from failure", ep_3_desc: "What setbacks taught our guests — 51 min.",
      final_title: "Never miss an episode", final_subtitle: "Subscribe on your favourite platform and join the conversation.",
      final_cta: "Subscribe free",
    },
  };
};

/* ───────────────────────── 60. UNITY — Nonprofit / charity ──────────────── */
const unityNonprofit = (): MarketplaceTemplate => {
  const content = `<style>
.un{--bg:#ffffff;--fg:#16241c;--muted:#5f6f66;--line:rgba(0,0,0,.08);--ac:#2f9e6b;--card:#f4f9f6;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.un *{box-sizing:border-box;margin:0}
.un-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.un h1,.un h2,.un h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.un-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.un-eye{display:inline-block;color:var(--ac);background:rgba(47,158,107,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.un-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.un-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.un-cta{display:flex;gap:14px;flex-wrap:wrap}
.un-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.un-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(47,158,107,.3)}
.un-btn-p:hover{transform:translateY(-2px)}
.un-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.un-hero img{width:100%;border-radius:20px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.14)}
.un-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;text-align:center;padding:clamp(40px,6vw,72px) 0}
.un-stat .num{font-size:clamp(32px,5vw,52px);font-weight:800;color:var(--ac)}
.un-stat .lbl{color:var(--muted);font-size:15px;margin-top:6px}
.un-sec{padding:clamp(54px,8vw,100px) 0}
.un-head{text-align:center;max-width:600px;margin:0 auto 48px}
.un-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.un-head p{color:var(--muted);font-size:17px}
.un-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.un-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;transition:.25s}
.un-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(0,0,0,.1)}
.un-card .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:rgba(47,158,107,.16);margin-bottom:18px}
.un-card h3{font-size:20px;margin-bottom:8px}
.un-card p{color:var(--muted);font-size:15px}
.un-final{text-align:center;background:linear-gradient(135deg,#1c3b2c,#16241c);color:#fff;border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.un-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px;color:#fff}
.un-final p{color:rgba(255,255,255,.78);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.un-hero{grid-template-columns:1fr}.un-grid{grid-template-columns:1fr}}
</style>
<div class="un">
  <section class="un-wrap un-hero">
    <div>
      <span class="un-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="un-cta"><a class="un-btn un-btn-p" href="#">{cta_primary}</a><a class="un-btn un-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>
  <section class="un-wrap"><div class="un-stats">
    <div class="un-stat"><div class="num">{stat_1_num}</div><div class="lbl">{stat_1_label}</div></div>
    <div class="un-stat"><div class="num">{stat_2_num}</div><div class="lbl">{stat_2_label}</div></div>
    <div class="un-stat"><div class="num">{stat_3_num}</div><div class="lbl">{stat_3_label}</div></div>
  </div></section>
  <section class="un-sec"><div class="un-wrap">
    <div class="un-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="un-grid">
      <div class="un-card"><div class="ic">🌍</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="un-card"><div class="ic">🤝</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="un-card"><div class="ic">💚</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>
  <section class="un-sec"><div class="un-wrap"><div class="un-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="un-btn un-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "nonprofit-charity-unity", name: "Nonprofit & Charity Template", description: "Warm, hopeful charity landing with impact stats, causes and a donation CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{hero_image}", "{cta_primary}", "{cta_secondary}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["nonprofit", "charity", "donation", "ngo", "light"],
    author: "Community", downloads: 354, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-charity",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1488521787991-ed7bbaae773c", 1200, 630),
    schema_type: "NGO", platform: "generic",
    defaultValues: {
      eyebrow: "Together we can", hero_title: "Bring real change to communities in need",
      hero_subtitle: "Your support helps us deliver clean water, education and hope to families worldwide.",
      cta_primary: "Donate now", cta_secondary: "Become a volunteer", hero_image: U("1488521787991-ed7bbaae773c"),
      stat_1_num: "120k+", stat_1_label: "Lives impacted",
      stat_2_num: "45", stat_2_label: "Countries reached",
      stat_3_num: "$8M", stat_3_label: "Raised for causes",
      services_title: "How your gift helps", services_subtitle: "Every donation goes directly to the causes that need it most.",
      svc_1_title: "Clean water", svc_1_desc: "Building wells and sanitation in underserved regions.",
      svc_2_title: "Education", svc_2_desc: "Funding schools, supplies and teachers for children.",
      svc_3_title: "Healthcare", svc_3_desc: "Providing medical care and supplies to remote communities.",
      final_title: "Your help changes lives", final_subtitle: "Join thousands of supporters making a difference every single day.",
      final_cta: "Make a donation",
    },
  };
};

export const FRAMER_BATCH10_TEMPLATES: MarketplaceTemplate[] = [
  orbitSaas(),
  aperturePhotography(),
  justiceLaw(),
  glowBeauty(),
  wavePodcast(),
  unityNonprofit(),
];
