// Framer-modelled marketplace templates — Batch 7 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 37. ZEN — Yoga / wellness studio ──────────────── */
const zenYoga = (): MarketplaceTemplate => {
  const content = `<style>
.zn{--bg:#f6f4ef;--fg:#2c302b;--muted:#6f746b;--line:rgba(0,0,0,.08);--ac:#7fa07a;--ac2:#cbb287;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.65;overflow:hidden}
.zn *{box-sizing:border-box;margin:0}
.zn-wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.zn h1,.zn h2,.zn h3{letter-spacing:-.02em;line-height:1.12;font-weight:600}
.zn-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,124px) 0}
.zn-eye{display:inline-block;color:var(--ac);background:rgba(127,160,122,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.zn-hero h1{font-size:clamp(40px,6vw,66px);margin-bottom:18px}
.zn-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.zn-cta{display:flex;gap:14px;flex-wrap:wrap}
.zn-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.zn-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(127,160,122,.3)}
.zn-btn-p:hover{transform:translateY(-2px)}
.zn-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.zn-hero img{width:100%;border-radius:24px;aspect-ratio:4/4.2;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.12)}
.zn-sec{padding:clamp(54px,8vw,100px) 0}
.zn-head{text-align:center;max-width:600px;margin:0 auto 48px}
.zn-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.zn-head p{color:var(--muted);font-size:17px}
.zn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.zn-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px;text-align:center;transition:.25s}
.zn-card:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.1)}
.zn-card .ic{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:26px;background:rgba(203,178,135,.18);margin:0 auto 18px}
.zn-card h3{font-size:20px;margin-bottom:8px}
.zn-card p{color:var(--muted);font-size:15px}
.zn-final{text-align:center;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.zn-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.zn-final p{opacity:.92;max-width:46ch;margin:0 auto 28px;font-size:17px}
.zn-final .zn-btn-p{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.zn-hero{grid-template-columns:1fr}.zn-grid{grid-template-columns:1fr}}
</style>
<div class="zn">
  <section class="zn-wrap zn-hero">
    <div>
      <span class="zn-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="zn-cta"><a class="zn-btn zn-btn-p" href="#">{cta_primary}</a><a class="zn-btn zn-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="zn-sec"><div class="zn-wrap">
    <div class="zn-head"><h2>{classes_title}</h2><p>{classes_subtitle}</p></div>
    <div class="zn-grid">
      <div class="zn-card"><div class="ic">🧘</div><h3>{class_1_title}</h3><p>{class_1_desc}</p></div>
      <div class="zn-card"><div class="ic">🌿</div><h3>{class_2_title}</h3><p>{class_2_desc}</p></div>
      <div class="zn-card"><div class="ic">☀️</div><h3>{class_3_title}</h3><p>{class_3_desc}</p></div>
    </div>
  </div></section>

  <section class="zn-sec"><div class="zn-wrap"><div class="zn-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="zn-btn zn-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "zen-yoga", name: "Yoga & Wellness Template", description: "Calm yoga / wellness studio landing with class types and a soft CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{classes_title}", "{classes_subtitle}",
      "{class_1_title}", "{class_1_desc}", "{class_2_title}", "{class_2_desc}", "{class_3_title}", "{class_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "health", tags: ["yoga", "wellness", "studio", "meditation", "light"],
    author: "Community", downloads: 421, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-yoga",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1545205597-3d9d02c29597", 1200, 630),
    schema_type: "ExerciseGym", platform: "generic",
    defaultValues: {
      eyebrow: "Yoga studio", hero_title: "Find your calm, one breath at a time",
      hero_subtitle: "Join nurturing classes for every level — build strength, ease stress and reconnect with yourself.",
      cta_primary: "Book a class", cta_secondary: "View schedule",
      hero_image: U("1545205597-3d9d02c29597", 800, 840),
      classes_title: "Our classes", classes_subtitle: "Mindful movement designed to meet you where you are.",
      class_1_title: "Vinyasa flow", class_1_desc: "Dynamic, breath-led sequences to energize and strengthen.",
      class_2_title: "Restorative", class_2_desc: "Slow, supported poses to deeply relax body and mind.",
      class_3_title: "Morning yoga", class_3_desc: "Gentle sunrise sessions to start your day grounded.",
      final_title: "Begin your practice today", final_subtitle: "Your first class is on us — come as you are and breathe easy.",
      final_cta: "Claim free class",
    },
  };
};

/* ───────────────────────── 38. CRAFT — Bakery / café ─────────────────────── */
const craftBakery = (): MarketplaceTemplate => {
  const content = `<style>
.cf{--bg:#fff8f0;--fg:#3a2c22;--muted:#86715f;--line:rgba(0,0,0,.08);--ac:#c8732e;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.cf *{box-sizing:border-box;margin:0}
.cf-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.cf h1,.cf h2,.cf h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.cf-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.cf-eye{display:inline-block;color:var(--ac);background:rgba(200,115,46,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.cf-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.cf-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.cf-cta{display:flex;gap:14px;flex-wrap:wrap}
.cf-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.cf-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(200,115,46,.28)}
.cf-btn-p:hover{transform:translateY(-2px)}
.cf-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.cf-hero img{width:100%;border-radius:24px;aspect-ratio:4/3.8;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.14)}
.cf-sec{padding:clamp(54px,8vw,100px) 0}
.cf-head{text-align:center;max-width:600px;margin:0 auto 48px}
.cf-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.cf-head p{color:var(--muted);font-size:17px}
.cf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.cf-prod{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.25s}
.cf-prod:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.1)}
.cf-prod img{width:100%;aspect-ratio:4/3;object-fit:cover}
.cf-prod .b{padding:20px}
.cf-prod h3{font-size:18px;margin-bottom:6px}
.cf-prod p{color:var(--muted);font-size:14px;margin-bottom:8px}
.cf-prod .pr{color:var(--ac);font-weight:700;font-size:17px}
.cf-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.cf-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.cf-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.cf-hero{grid-template-columns:1fr}.cf-grid{grid-template-columns:1fr 1fr}}
</style>
<div class="cf">
  <section class="cf-wrap cf-hero">
    <div>
      <span class="cf-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="cf-cta"><a class="cf-btn cf-btn-p" href="#">{cta_primary}</a><a class="cf-btn cf-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="cf-sec"><div class="cf-wrap">
    <div class="cf-head"><h2>{menu_title}</h2><p>{menu_subtitle}</p></div>
    <div class="cf-grid">
      <div class="cf-prod"><img src="{item_1_image}" alt="{item_1_title}"><div class="b"><h3>{item_1_title}</h3><p>{item_1_desc}</p><div class="pr">{item_1_price}</div></div></div>
      <div class="cf-prod"><img src="{item_2_image}" alt="{item_2_title}"><div class="b"><h3>{item_2_title}</h3><p>{item_2_desc}</p><div class="pr">{item_2_price}</div></div></div>
      <div class="cf-prod"><img src="{item_3_image}" alt="{item_3_title}"><div class="b"><h3>{item_3_title}</h3><p>{item_3_desc}</p><div class="pr">{item_3_price}</div></div></div>
    </div>
  </div></section>

  <section class="cf-sec"><div class="cf-wrap"><div class="cf-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="cf-btn cf-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "craft-bakery", name: "Bakery & Café Template", description: "Cozy artisan bakery / café landing with a menu grid and warm CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{menu_title}", "{menu_subtitle}",
      "{item_1_image}", "{item_1_title}", "{item_1_desc}", "{item_1_price}",
      "{item_2_image}", "{item_2_title}", "{item_2_desc}", "{item_2_price}",
      "{item_3_image}", "{item_3_title}", "{item_3_desc}", "{item_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "local-seo", tags: ["bakery", "cafe", "food", "coffee", "light"],
    author: "Community", downloads: 478, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-bakery",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1509440159596-0249088772ff", 1200, 630),
    schema_type: "Bakery", platform: "generic",
    defaultValues: {
      eyebrow: "Artisan bakery", hero_title: "Baked fresh, every single morning",
      hero_subtitle: "Sourdough, pastries and slow-brewed coffee made by hand with the finest local ingredients.",
      cta_primary: "Order online", cta_secondary: "View menu",
      hero_image: U("1509440159596-0249088772ff", 880, 840),
      menu_title: "Today's favourites", menu_subtitle: "Hot from the oven and ready to enjoy.",
      item_1_image: U("1555507036-ab1f4038808a", 600, 450), item_1_title: "Sourdough loaf", item_1_desc: "48-hour slow-fermented, crisp crust.", item_1_price: "$6.50",
      item_2_image: U("1568254183919-78a4f43a2877", 600, 450), item_2_title: "Butter croissant", item_2_desc: "Flaky, golden and freshly laminated.", item_2_price: "$3.80",
      item_3_image: U("1486427944299-d1955d23e34d", 600, 450), item_3_title: "Cinnamon roll", item_3_desc: "Soft, gooey and generously spiced.", item_3_price: "$4.20",
      final_title: "Skip the queue — order ahead", final_subtitle: "Pick up your favourites fresh, or have them delivered to your door.",
      final_cta: "Start your order",
    },
  };
};

/* ───────────────────────── 39. BUILD — Construction ──────────────────────── */
const buildConstruction = (): MarketplaceTemplate => {
  const content = `<style>
.bd{--bg:#11130f;--fg:#f2f3ee;--muted:#9ca093;--line:rgba(255,255,255,.1);--ac:#f5b301;--card:#1a1d16;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.bd *{box-sizing:border-box;margin:0}
.bd-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.bd h1,.bd h2,.bd h3{letter-spacing:-.02em;line-height:1.05;font-weight:800;text-transform:uppercase}
.bd-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding:clamp(64px,10vw,124px) 0}
.bd-eye{display:inline-block;color:#11130f;background:var(--ac);padding:6px 14px;border-radius:4px;font-size:13px;font-weight:800;letter-spacing:.08em;margin-bottom:18px}
.bd-hero h1{font-size:clamp(40px,6.4vw,76px);margin-bottom:18px}
.bd-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:26px;text-transform:none}
.bd-cta{display:flex;gap:14px;flex-wrap:wrap}
.bd-btn{display:inline-flex;align-items:center;padding:15px 30px;border-radius:6px;font-weight:800;font-size:14px;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;transition:.25s}
.bd-btn-p{background:var(--ac);color:#11130f}
.bd-btn-p:hover{transform:translateY(-2px)}
.bd-btn-g{border:1px solid var(--line);color:#fff}
.bd-hero img{width:100%;border-radius:14px;aspect-ratio:4/4;object-fit:cover;box-shadow:0 30px 70px rgba(0,0,0,.5)}
.bd-sec{padding:clamp(54px,8vw,100px) 0}
.bd-head{max-width:660px;margin:0 0 48px}
.bd-head h2{font-size:clamp(30px,5vw,56px);margin-bottom:14px}
.bd-head p{color:var(--muted);font-size:17px;text-transform:none}
.bd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.bd-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:28px;border-top:3px solid var(--ac);transition:.25s}
.bd-card:hover{transform:translateY(-4px)}
.bd-card .n{color:var(--ac);font-size:28px;font-weight:800;margin-bottom:12px}
.bd-card h3{font-size:19px;margin-bottom:8px}
.bd-card p{color:var(--muted);font-size:15px;text-transform:none}
.bd-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;background:var(--ac);color:#11130f;border-radius:16px;padding:44px 28px}
.bd-stats .st{text-align:center}
.bd-stats .st b{display:block;font-size:clamp(28px,4vw,46px);font-weight:800}
.bd-stats .st span{font-size:14px;text-transform:uppercase;letter-spacing:.04em}
.bd-final{text-align:center;border:1px solid var(--ac);border-radius:18px;padding:clamp(54px,8vw,96px) 24px}
.bd-final h2{font-size:clamp(32px,5.5vw,64px);max-width:16ch;margin:0 auto 16px}
.bd-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px;text-transform:none}
@media(max-width:860px){.bd-hero{grid-template-columns:1fr}.bd-grid{grid-template-columns:1fr}.bd-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="bd">
  <section class="bd-wrap bd-hero">
    <div>
      <span class="bd-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="bd-cta"><a class="bd-btn bd-btn-p" href="#">{cta_primary}</a><a class="bd-btn bd-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="bd-sec"><div class="bd-wrap">
    <div class="bd-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="bd-grid">
      <div class="bd-card"><div class="n">01</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="bd-card"><div class="n">02</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="bd-card"><div class="n">03</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>

  <section class="bd-sec"><div class="bd-wrap">
    <div class="bd-stats">
      <div class="st"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="st"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="st"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="st"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="bd-sec"><div class="bd-wrap"><div class="bd-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="bd-btn bd-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "build-construction", name: "Construction Company Template", description: "Bold construction / contractor landing with services, stats and a quote CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "local-seo", tags: ["construction", "contractor", "building", "trades", "dark"],
    author: "Community", downloads: 503, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-construction",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1503387762-abc9d0c8e2dd", 1200, 630),
    schema_type: "GeneralContractor", platform: "generic",
    defaultValues: {
      eyebrow: "Since 1998", hero_title: "We build it right, the first time",
      hero_subtitle: "Commercial and residential construction delivered on time, on budget and to the highest standard.",
      cta_primary: "Get a quote", cta_secondary: "Our projects",
      hero_image: U("1503387762-abc9d0c8e2dd", 800, 800),
      services_title: "What we do", services_subtitle: "Full-service construction from foundation to finish.",
      svc_1_title: "New builds", svc_1_desc: "Ground-up commercial and residential construction managed end to end.",
      svc_2_title: "Renovations", svc_2_desc: "Transform existing spaces with expert remodelling and extensions.",
      svc_3_title: "Project management", svc_3_desc: "Tight scheduling, clear budgets and dependable delivery.",
      stat_1_num: "25+", stat_1_label: "Years", stat_2_num: "480", stat_2_label: "Projects", stat_3_num: "98%", stat_3_label: "On time", stat_4_num: "100%", stat_4_label: "Licensed",
      final_title: "Let's build something great", final_subtitle: "Tell us about your project and get a free, no-obligation estimate.",
      final_cta: "Request estimate",
    },
  };
};

/* ───────────────────────── 40. QUILL — Blog / magazine ───────────────────── */
const quillBlog = (): MarketplaceTemplate => {
  const content = `<style>
.ql{--bg:#ffffff;--fg:#1a1a1a;--muted:#6b6b6b;--line:rgba(0,0,0,.1);--ac:#e0314b;--card:#fafafa;background:var(--bg);color:var(--fg);font-family:'Georgia',serif;line-height:1.7;overflow:hidden}
.ql *{box-sizing:border-box;margin:0}
.ql-wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.ql h1,.ql h2,.ql h3{letter-spacing:-.01em;line-height:1.15;font-weight:700}
.ql-hero{padding:clamp(56px,9vw,110px) 0 clamp(40px,6vw,70px)}
.ql-eye{display:inline-block;color:var(--ac);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;font-family:'Inter',sans-serif;margin-bottom:18px}
.ql-hero h1{font-size:clamp(40px,6.5vw,76px);max-width:18ch;margin-bottom:18px}
.ql-hero p{color:var(--muted);font-size:clamp(17px,1.8vw,21px);max-width:52ch}
.ql-feat{margin-top:36px;display:grid;grid-template-columns:1.3fr 1fr;gap:32px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.ql-feat img{width:100%;height:100%;min-height:280px;object-fit:cover}
.ql-feat .b{padding:36px}
.ql-feat .cat{color:var(--ac);font-size:13px;font-weight:700;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:.08em}
.ql-feat h2{font-size:clamp(24px,3vw,34px);margin:10px 0 12px}
.ql-feat p{color:var(--muted);font-size:16px}
.ql-sec{padding:clamp(40px,7vw,80px) 0}
.ql-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.ql-post img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;margin-bottom:14px}
.ql-post .cat{color:var(--ac);font-size:12px;font-weight:700;font-family:'Inter',sans-serif;text-transform:uppercase;letter-spacing:.08em}
.ql-post h3{font-size:21px;margin:8px 0 8px}
.ql-post p{color:var(--muted);font-size:15px}
.ql-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:clamp(48px,7vw,84px) 24px;margin-bottom:40px}
.ql-final h2{font-size:clamp(28px,4.4vw,46px);max-width:18ch;margin:0 auto 14px}
.ql-final p{color:var(--muted);max-width:48ch;margin:0 auto 26px;font-size:17px}
.ql-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:8px;font-weight:700;font-size:15px;font-family:'Inter',sans-serif;text-decoration:none;background:var(--ac);color:#fff;transition:.25s}
.ql-btn:hover{transform:translateY(-2px)}
@media(max-width:860px){.ql-feat{grid-template-columns:1fr}.ql-grid{grid-template-columns:1fr}}
</style>
<div class="ql">
  <section class="ql-wrap ql-hero">
    <span class="ql-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="ql-feat">
      <img src="{feature_image}" alt="{feature_title}">
      <div class="b"><span class="cat">{feature_category}</span><h2>{feature_title}</h2><p>{feature_excerpt}</p></div>
    </div>
  </section>

  <section class="ql-sec"><div class="ql-wrap">
    <div class="ql-grid">
      <div class="ql-post"><img src="{post_1_image}" alt="{post_1_title}"><span class="cat">{post_1_category}</span><h3>{post_1_title}</h3><p>{post_1_excerpt}</p></div>
      <div class="ql-post"><img src="{post_2_image}" alt="{post_2_title}"><span class="cat">{post_2_category}</span><h3>{post_2_title}</h3><p>{post_2_excerpt}</p></div>
      <div class="ql-post"><img src="{post_3_image}" alt="{post_3_title}"><span class="cat">{post_3_category}</span><h3>{post_3_title}</h3><p>{post_3_excerpt}</p></div>
    </div>
  </div></section>

  <section class="ql-sec"><div class="ql-wrap"><div class="ql-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="ql-btn" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "quill-blog", name: "Blog & Magazine Template", description: "Editorial blog / magazine landing with a featured story, post grid and newsletter CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}",
      "{feature_image}", "{feature_category}", "{feature_title}", "{feature_excerpt}",
      "{post_1_image}", "{post_1_category}", "{post_1_title}", "{post_1_excerpt}",
      "{post_2_image}", "{post_2_category}", "{post_2_title}", "{post_2_excerpt}",
      "{post_3_image}", "{post_3_category}", "{post_3_title}", "{post_3_excerpt}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "marketing", tags: ["blog", "magazine", "editorial", "news", "light"],
    author: "Community", downloads: 446, rating: 4.7,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-blog",
    og_title_pattern: "{feature_title}", og_description_pattern: "{feature_excerpt}", og_image_pattern: U("1499750310107-5fef28a66643", 1200, 630),
    schema_type: "Blog", platform: "generic",
    defaultValues: {
      eyebrow: "The journal", hero_title: "Stories, ideas and inspiration worth your time",
      hero_subtitle: "Thoughtful writing on culture, design and the things that matter — delivered every week.",
      feature_image: U("1499750310107-5fef28a66643", 800, 600), feature_category: "Featured", feature_title: "Why slowing down is the new productivity",
      feature_excerpt: "We chased speed for a decade. Here's what changed when our team learned to work with intention instead.",
      post_1_image: U("1486312338219-ce68d2c6f44d", 600, 380), post_1_category: "Design", post_1_title: "The quiet power of white space",
      post_1_excerpt: "Less really is more — and the data backs it up.",
      post_2_image: U("1517245386807-bb43f82c33c4", 600, 380), post_2_category: "Culture", post_2_title: "Building teams that actually trust each other",
      post_2_excerpt: "Trust isn't a perk. It's the operating system.",
      post_3_image: U("1432888622747-4eb9a8efeb07", 600, 380), post_3_category: "Tech", post_3_title: "The tools we quietly stopped using",
      post_3_excerpt: "A year of subtraction taught us more than any new app.",
      final_title: "Never miss a story", final_subtitle: "Join 20,000+ readers getting our best writing in their inbox every Sunday.",
      final_cta: "Subscribe free",
    },
  };
};

/* ───────────────────────── 41. TREK — Travel tours ──────────────────────── */
const trekTour = (): MarketplaceTemplate => {
  const content = `<style>
.tk{--bg:#0c1a1c;--fg:#eef6f5;--muted:#9bb3b1;--line:rgba(255,255,255,.1);--ac:#f0a04b;--ac2:#3ec9a7;--card:#102224;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.tk *{box-sizing:border-box;margin:0}
.tk-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.tk h1,.tk h2,.tk h3{letter-spacing:-.02em;line-height:1.08;font-weight:700}
.tk-hero{text-align:center;padding:clamp(64px,10vw,128px) 0}
.tk-eye{display:inline-block;color:var(--ac);background:rgba(240,160,75,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:20px}
.tk-hero h1{font-size:clamp(42px,7vw,84px);margin-bottom:20px;max-width:18ch;margin-inline:auto}
.tk-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:52ch;margin:0 auto 28px}
.tk-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.tk-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.tk-btn-p{background:var(--ac);color:#0c1a1c;box-shadow:0 14px 34px rgba(240,160,75,.3)}
.tk-btn-p:hover{transform:translateY(-2px)}
.tk-btn-g{border:1px solid var(--line);color:#fff}
.tk-sec{padding:clamp(54px,8vw,100px) 0}
.tk-head{text-align:center;max-width:640px;margin:0 auto 48px}
.tk-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.tk-head p{color:var(--muted);font-size:17px}
.tk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.tk-trip{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:3/4;transition:.25s}
.tk-trip:hover{transform:translateY(-4px)}
.tk-trip img{width:100%;height:100%;object-fit:cover}
.tk-trip .ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.78),transparent 60%);display:flex;flex-direction:column;justify-content:flex-end;padding:24px}
.tk-trip .pr{color:var(--ac);font-weight:700;font-size:15px;margin-bottom:4px}
.tk-trip h3{font-size:21px;margin-bottom:4px}
.tk-trip p{color:#cdd9d8;font-size:14px}
.tk-final{text-align:center;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#0c1a1c;border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.tk-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.tk-final p{opacity:.9;max-width:46ch;margin:0 auto 28px;font-size:17px}
.tk-final .tk-btn-p{background:#0c1a1c;color:#fff;box-shadow:none}
@media(max-width:860px){.tk-grid{grid-template-columns:1fr}}
</style>
<div class="tk">
  <section class="tk-wrap tk-hero">
    <span class="tk-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="tk-cta"><a class="tk-btn tk-btn-p" href="#">{cta_primary}</a><a class="tk-btn tk-btn-g" href="#">{cta_secondary}</a></div>
  </section>

  <section class="tk-sec"><div class="tk-wrap">
    <div class="tk-head"><h2>{trips_title}</h2><p>{trips_subtitle}</p></div>
    <div class="tk-grid">
      <div class="tk-trip"><img src="{trip_1_image}" alt="{trip_1_title}"><div class="ov"><div class="pr">{trip_1_price}</div><h3>{trip_1_title}</h3><p>{trip_1_meta}</p></div></div>
      <div class="tk-trip"><img src="{trip_2_image}" alt="{trip_2_title}"><div class="ov"><div class="pr">{trip_2_price}</div><h3>{trip_2_title}</h3><p>{trip_2_meta}</p></div></div>
      <div class="tk-trip"><img src="{trip_3_image}" alt="{trip_3_title}"><div class="ov"><div class="pr">{trip_3_price}</div><h3>{trip_3_title}</h3><p>{trip_3_meta}</p></div></div>
    </div>
  </div></section>

  <section class="tk-sec"><div class="tk-wrap"><div class="tk-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="tk-btn tk-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "trek-tour", name: "Travel Tours Template", description: "Adventurous travel / tour operator landing with destination cards and a booking CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{trips_title}", "{trips_subtitle}",
      "{trip_1_image}", "{trip_1_price}", "{trip_1_title}", "{trip_1_meta}",
      "{trip_2_image}", "{trip_2_price}", "{trip_2_title}", "{trip_2_meta}",
      "{trip_3_image}", "{trip_3_price}", "{trip_3_title}", "{trip_3_meta}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["travel", "tours", "adventure", "destinations", "dark"],
    author: "Community", downloads: 531, rating: 4.9,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-tours",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1469854523086-cc02fe5d8800", 1200, 630),
    schema_type: "TravelAgency", platform: "generic",
    defaultValues: {
      eyebrow: "Guided adventures", hero_title: "Go further than the map",
      hero_subtitle: "Small-group expeditions to the world's wildest places — expertly guided, ethically run, unforgettable.",
      cta_primary: "Browse trips", cta_secondary: "Talk to an expert",
      trips_title: "Featured expeditions", trips_subtitle: "Hand-crafted journeys for the curious and the bold.",
      trip_1_image: U("1469854523086-cc02fe5d8800", 600, 800), trip_1_price: "from $2,400", trip_1_title: "Patagonia trek", trip_1_meta: "9 days · Small group",
      trip_2_image: U("1506905925346-21bda4d32df4", 600, 800), trip_2_price: "from $1,950", trip_2_title: "Alpine crossing", trip_2_meta: "7 days · Moderate",
      trip_3_image: U("1452796651103-7f3a9be2f8b8", 600, 800), trip_3_price: "from $3,100", trip_3_title: "Iceland circle", trip_3_meta: "10 days · All levels",
      final_title: "Your next adventure starts here", final_subtitle: "Limited spots each season — secure yours and let's plan the trip of a lifetime.",
      final_cta: "Book your trip",
    },
  };
};

/* ───────────────────────── 42. MINT — Accounting ─────────────────────────── */
const mintAccounting = (): MarketplaceTemplate => {
  const content = `<style>
.mn{--bg:#f4f8f6;--fg:#16221d;--muted:#5f7068;--line:rgba(0,0,0,.08);--ac:#1f9d72;--ac2:#3a7bd5;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.mn *{box-sizing:border-box;margin:0}
.mn-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.mn h1,.mn h2,.mn h3{letter-spacing:-.02em;line-height:1.08;font-weight:700}
.mn-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,124px) 0}
.mn-eye{display:inline-block;color:var(--ac);background:rgba(31,157,114,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.mn-hero h1{font-size:clamp(40px,6vw,70px);margin-bottom:18px}
.mn-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:26px}
.mn-cta{display:flex;gap:14px;flex-wrap:wrap}
.mn-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.mn-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 34px rgba(31,157,114,.28)}
.mn-btn-p:hover{transform:translateY(-2px)}
.mn-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.mn-hero img{width:100%;border-radius:24px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.12)}
.mn-sec{padding:clamp(54px,8vw,100px) 0}
.mn-head{text-align:center;max-width:640px;margin:0 auto 48px}
.mn-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.mn-head p{color:var(--muted);font-size:17px}
.mn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.mn-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;transition:.25s}
.mn-card:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.1)}
.mn-card .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:rgba(31,157,114,.12);margin-bottom:18px}
.mn-card h3{font-size:19px;margin-bottom:8px}
.mn-card p{color:var(--muted);font-size:15px}
.mn-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border-radius:24px;padding:48px 32px}
.mn-stats .st{text-align:center}
.mn-stats .st b{display:block;font-size:clamp(30px,4vw,46px);font-weight:800}
.mn-stats .st span{opacity:.9;font-size:14px}
.mn-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.mn-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.mn-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.mn-hero{grid-template-columns:1fr}.mn-grid{grid-template-columns:1fr}.mn-stats{grid-template-columns:1fr}}
</style>
<div class="mn">
  <section class="mn-wrap mn-hero">
    <div>
      <span class="mn-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="mn-cta"><a class="mn-btn mn-btn-p" href="#">{cta_primary}</a><a class="mn-btn mn-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="mn-sec"><div class="mn-wrap">
    <div class="mn-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="mn-grid">
      <div class="mn-card"><div class="ic">📊</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="mn-card"><div class="ic">🧾</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="mn-card"><div class="ic">💼</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>

  <section class="mn-sec"><div class="mn-wrap">
    <div class="mn-stats">
      <div class="st"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="st"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="st"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
    </div>
  </div></section>

  <section class="mn-sec"><div class="mn-wrap"><div class="mn-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="mn-btn mn-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "mint-accounting", name: "Accounting & Bookkeeping Template", description: "Trustworthy accounting / bookkeeping landing with services, stats and a consult CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "professional", tags: ["accounting", "bookkeeping", "finance", "tax", "light"],
    author: "Community", downloads: 467, rating: 4.8,
    seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-accounting",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1454165804606-c3d57bc86b40", 1200, 630),
    schema_type: "AccountingService", platform: "generic",
    defaultValues: {
      eyebrow: "Accounting firm", hero_title: "Numbers handled, so you can grow",
      hero_subtitle: "Expert bookkeeping, tax and advisory for small businesses — accurate, on time and stress-free.",
      cta_primary: "Book a consult", cta_secondary: "Our services",
      hero_image: U("1454165804606-c3d57bc86b40", 880, 800),
      services_title: "How we help", services_subtitle: "End-to-end financial support tailored to your business.",
      svc_1_title: "Bookkeeping", svc_1_desc: "Clean, real-time books so you always know where you stand.",
      svc_2_title: "Tax & compliance", svc_2_desc: "Maximise deductions and file confidently, every time.",
      svc_3_title: "Advisory", svc_3_desc: "Strategic guidance to improve cash flow and profitability.",
      stat_1_num: "500+", stat_1_label: "Clients served", stat_2_num: "$12M", stat_2_label: "Tax saved", stat_3_num: "15 yrs", stat_3_label: "Experience",
      final_title: "Let's tidy up your finances", final_subtitle: "Book a free 30-minute consultation and see how much time and money we can save you.",
      final_cta: "Get started",
    },
  };
};

export const FRAMER_BATCH7_TEMPLATES: MarketplaceTemplate[] = [
  zenYoga(),
  craftBakery(),
  buildConstruction(),
  quillBlog(),
  trekTour(),
  mintAccounting(),
];
