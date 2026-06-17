// Framer-modelled marketplace templates — Batch 5 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 25. ESTATE — Real estate ─────────────────────── */
const estateRealty = (): MarketplaceTemplate => {
  const content = `<style>
.es{--bg:#0e1320;--fg:#f3f5fa;--muted:#9aa3b8;--line:rgba(255,255,255,.1);--ac:#4f8cff;--ac2:#7c5cff;--card:#161c2c;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.es *{box-sizing:border-box;margin:0}
.es-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.es h1,.es h2,.es h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.es-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,128px) 0}
.es-eye{display:inline-block;color:var(--ac);background:rgba(79,140,255,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.es-hero h1{font-size:clamp(40px,6.2vw,72px);margin-bottom:20px}
.es-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:28px}
.es-cta{display:flex;gap:14px;flex-wrap:wrap}
.es-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.es-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 36px rgba(79,140,255,.32)}
.es-btn-p:hover{transform:translateY(-2px)}
.es-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.es-hero img{width:100%;border-radius:24px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 30px 70px rgba(0,0,0,.4)}
.es-sec{padding:clamp(54px,8vw,100px) 0}
.es-head{text-align:center;max-width:640px;margin:0 auto 48px}
.es-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.es-head p{color:var(--muted);font-size:17px}
.es-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.es-prop{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.25s}
.es-prop:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,.35)}
.es-prop img{width:100%;aspect-ratio:4/3;object-fit:cover}
.es-prop .b{padding:22px}
.es-prop .pr{color:var(--ac);font-weight:700;font-size:20px;margin-bottom:6px}
.es-prop h3{font-size:18px;margin-bottom:6px}
.es-prop p{color:var(--muted);font-size:14px}
.es-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:24px;padding:48px 32px}
.es-stats .st{text-align:center}
.es-stats .st b{display:block;font-size:clamp(30px,4vw,46px);font-weight:800}
.es-stats .st span{opacity:.9;font-size:14px}
.es-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.es-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.es-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.es-hero{grid-template-columns:1fr}.es-grid{grid-template-columns:1fr}.es-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="es">
  <section class="es-wrap es-hero">
    <div>
      <span class="es-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="es-cta"><a class="es-btn es-btn-p" href="#">{cta_primary}</a><a class="es-btn es-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="es-sec"><div class="es-wrap">
    <div class="es-head"><h2>{listings_title}</h2><p>{listings_subtitle}</p></div>
    <div class="es-grid">
      <div class="es-prop"><img src="{prop_1_image}" alt="{prop_1_title}"><div class="b"><div class="pr">{prop_1_price}</div><h3>{prop_1_title}</h3><p>{prop_1_meta}</p></div></div>
      <div class="es-prop"><img src="{prop_2_image}" alt="{prop_2_title}"><div class="b"><div class="pr">{prop_2_price}</div><h3>{prop_2_title}</h3><p>{prop_2_meta}</p></div></div>
      <div class="es-prop"><img src="{prop_3_image}" alt="{prop_3_title}"><div class="b"><div class="pr">{prop_3_price}</div><h3>{prop_3_title}</h3><p>{prop_3_meta}</p></div></div>
    </div>
  </div></section>

  <section class="es-sec"><div class="es-wrap">
    <div class="es-stats">
      <div class="st"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="st"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="st"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="st"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="es-sec"><div class="es-wrap"><div class="es-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="es-btn es-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "estate-realty", name: "Estate — Real Estate", description: "Premium real estate landing with property listings, pricing and stats.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{listings_title}", "{listings_subtitle}",
      "{prop_1_image}", "{prop_1_price}", "{prop_1_title}", "{prop_1_meta}",
      "{prop_2_image}", "{prop_2_price}", "{prop_2_title}", "{prop_2_meta}",
      "{prop_3_image}", "{prop_3_price}", "{prop_3_title}", "{prop_3_meta}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["real-estate", "property", "homes", "realty", "dark"],
    author: "Community", downloads: 538, rating: 4.8,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-real-estate",
    schema_type: "RealEstateAgent", platform: "generic",
    defaultValues: {
      eyebrow: "Find your home", hero_title: "Homes that match the way you live",
      hero_subtitle: "Browse curated listings, schedule private tours and close with confidence — backed by local experts.",
      cta_primary: "Browse listings", cta_secondary: "Book a tour",
      hero_image: U("1568605114967-8130f3a36994", 920, 780),
      listings_title: "Featured properties", listings_subtitle: "Hand-picked homes in the neighborhoods you love.",
      prop_1_image: U("1564013799919-ab600027ffc6", 800, 600), prop_1_price: "$845,000", prop_1_title: "Modern hillside villa", prop_1_meta: "4 bed · 3 bath · 2,800 sqft",
      prop_2_image: U("1512917774080-9991f1c4c750", 800, 600), prop_2_price: "$520,000", prop_2_title: "Downtown loft", prop_2_meta: "2 bed · 2 bath · 1,400 sqft",
      prop_3_image: U("1583608205776-bfd35f0d9f83", 800, 600), prop_3_price: "$1,250,000", prop_3_title: "Lakeside estate", prop_3_meta: "5 bed · 4 bath · 4,100 sqft",
      stat_1_num: "1.2K+", stat_1_label: "Homes sold", stat_2_num: "98%", stat_2_label: "Client satisfaction", stat_3_num: "30", stat_3_label: "Avg days on market", stat_4_num: "4.9★", stat_4_label: "Agent rating",
      final_title: "Ready to find your next home?", final_subtitle: "Tell us what you're looking for and we'll match you with the perfect property.",
      final_cta: "Get started",
    },
  };
};

/* ───────────────────────── 26. PULSE — Fitness gym ──────────────────────── */
const pulseFitness = (): MarketplaceTemplate => {
  const content = `<style>
.pl{--bg:#0a0a0a;--fg:#ffffff;--muted:#9a9a9a;--line:rgba(255,255,255,.1);--ac:#d4ff3f;--card:#141414;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.pl *{box-sizing:border-box;margin:0}
.pl-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.pl h1,.pl h2,.pl h3{letter-spacing:-.03em;line-height:1.02;font-weight:800;text-transform:uppercase}
.pl-hero{position:relative;text-align:center;padding:clamp(80px,12vw,150px) 0}
.pl-eye{display:inline-block;color:#0a0a0a;background:var(--ac);padding:6px 16px;border-radius:4px;font-size:13px;font-weight:800;letter-spacing:.1em;margin-bottom:22px}
.pl-hero h1{font-size:clamp(48px,9vw,110px);margin-bottom:22px}
.pl-hero h1 em{font-style:normal;color:var(--ac)}
.pl-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:52ch;margin:0 auto 30px}
.pl-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.pl-btn{display:inline-flex;align-items:center;padding:15px 32px;border-radius:6px;font-weight:800;font-size:14px;letter-spacing:.05em;text-transform:uppercase;text-decoration:none;transition:.25s}
.pl-btn-p{background:var(--ac);color:#0a0a0a}
.pl-btn-p:hover{transform:translateY(-2px)}
.pl-btn-g{border:1px solid var(--line);color:#fff}
.pl-sec{padding:clamp(54px,8vw,100px) 0}
.pl-head{max-width:680px;margin:0 0 48px}
.pl-head h2{font-size:clamp(32px,5.5vw,64px);margin-bottom:14px}
.pl-head p{color:var(--muted);font-size:17px;text-transform:none}
.pl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pl-card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;transition:.25s}
.pl-card:hover{border-color:var(--ac)}
.pl-card img{width:100%;aspect-ratio:4/3;object-fit:cover}
.pl-card .b{padding:24px}
.pl-card h3{font-size:22px;margin-bottom:10px}
.pl-card p{color:var(--muted);font-size:15px;text-transform:none}
.pl-price{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pl-plan{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:34px 28px;text-align:center;transition:.25s}
.pl-plan.feat{background:var(--ac);color:#0a0a0a}
.pl-plan h3{font-size:20px;margin-bottom:10px}
.pl-plan .amt{font-size:clamp(34px,5vw,52px);font-weight:800;margin-bottom:6px}
.pl-plan small{display:block;opacity:.7;margin-bottom:20px;text-transform:none}
.pl-final{text-align:center;border:1px solid var(--ac);border-radius:20px;padding:clamp(54px,8vw,96px) 24px}
.pl-final h2{font-size:clamp(34px,6vw,72px);max-width:16ch;margin:0 auto 16px}
.pl-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px;text-transform:none}
@media(max-width:860px){.pl-grid,.pl-price{grid-template-columns:1fr}}
</style>
<div class="pl">
  <section class="pl-wrap pl-hero">
    <span class="pl-eye">{eyebrow}</span>
    <h1>{hero_title} <em>{hero_accent}</em></h1>
    <p>{hero_subtitle}</p>
    <div class="pl-cta"><a class="pl-btn pl-btn-p" href="#">{cta_primary}</a><a class="pl-btn pl-btn-g" href="#">{cta_secondary}</a></div>
  </section>

  <section class="pl-sec"><div class="pl-wrap">
    <div class="pl-head"><h2>{classes_title}</h2><p>{classes_subtitle}</p></div>
    <div class="pl-grid">
      <div class="pl-card"><img src="{class_1_image}" alt="{class_1_title}"><div class="b"><h3>{class_1_title}</h3><p>{class_1_desc}</p></div></div>
      <div class="pl-card"><img src="{class_2_image}" alt="{class_2_title}"><div class="b"><h3>{class_2_title}</h3><p>{class_2_desc}</p></div></div>
      <div class="pl-card"><img src="{class_3_image}" alt="{class_3_title}"><div class="b"><h3>{class_3_title}</h3><p>{class_3_desc}</p></div></div>
    </div>
  </div></section>

  <section class="pl-sec"><div class="pl-wrap">
    <div class="pl-head"><h2>{plans_title}</h2><p>{plans_subtitle}</p></div>
    <div class="pl-price">
      <div class="pl-plan"><h3>{plan_1_name}</h3><div class="amt">{plan_1_price}</div><small>{plan_1_desc}</small><a class="pl-btn pl-btn-g" href="#">{plan_1_cta}</a></div>
      <div class="pl-plan feat"><h3>{plan_2_name}</h3><div class="amt">{plan_2_price}</div><small>{plan_2_desc}</small><a class="pl-btn pl-btn-p" href="#" style="background:#0a0a0a;color:#d4ff3f">{plan_2_cta}</a></div>
      <div class="pl-plan"><h3>{plan_3_name}</h3><div class="amt">{plan_3_price}</div><small>{plan_3_desc}</small><a class="pl-btn pl-btn-g" href="#">{plan_3_cta}</a></div>
    </div>
  </div></section>

  <section class="pl-sec"><div class="pl-wrap"><div class="pl-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="pl-btn pl-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "forge-fitness", name: "Forge — Fitness Gym", description: "High-energy gym & fitness landing with classes, pricing plans and bold type.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_accent}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{classes_title}", "{classes_subtitle}",
      "{class_1_image}", "{class_1_title}", "{class_1_desc}", "{class_2_image}", "{class_2_title}", "{class_2_desc}", "{class_3_image}", "{class_3_title}", "{class_3_desc}",
      "{plans_title}", "{plans_subtitle}",
      "{plan_1_name}", "{plan_1_price}", "{plan_1_desc}", "{plan_1_cta}",
      "{plan_2_name}", "{plan_2_price}", "{plan_2_desc}", "{plan_2_cta}",
      "{plan_3_name}", "{plan_3_price}", "{plan_3_desc}", "{plan_3_cta}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["fitness", "gym", "workout", "sport", "dark"],
    author: "Community", downloads: 604, rating: 4.9,
    seo_title_pattern: "{hero_title} {hero_accent}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-gym",
    schema_type: "ExerciseGym", platform: "generic",
    defaultValues: {
      eyebrow: "Train hard", hero_title: "Push your", hero_accent: "limits",
      hero_subtitle: "World-class coaches, premium equipment and a community that pushes you to be better every single day.",
      cta_primary: "Join now", cta_secondary: "View classes",
      classes_title: "Our classes", classes_subtitle: "Find the workout that fits your goals and energy.",
      class_1_image: U("1534438327276-14e5300c3a48", 800, 600), class_1_title: "Strength", class_1_desc: "Build raw power with guided lifting programs.",
      class_2_image: U("1571019613454-1cb2f99b2d8b", 800, 600), class_2_title: "HIIT", class_2_desc: "High-intensity intervals that torch calories fast.",
      class_3_image: U("1518611012118-696072aa579a", 800, 600), class_3_title: "Conditioning", class_3_desc: "Boost endurance, mobility and athletic capacity.",
      plans_title: "Membership plans", plans_subtitle: "Flexible options, no hidden fees, cancel anytime.",
      plan_1_name: "Starter", plan_1_price: "$29", plan_1_desc: "Per month · gym access", plan_1_cta: "Choose",
      plan_2_name: "Pro", plan_2_price: "$59", plan_2_desc: "Per month · all classes + coaching", plan_2_cta: "Choose",
      plan_3_name: "Elite", plan_3_price: "$99", plan_3_desc: "Per month · personal trainer", plan_3_cta: "Choose",
      final_title: "Your transformation starts today", final_subtitle: "Claim a free 7-day trial and feel the difference for yourself.",
      final_cta: "Start free trial",
    },
  };
};

/* ───────────────────────── 27. STACK — SaaS app ─────────────────────────── */
const stackSaas = (): MarketplaceTemplate => {
  const content = `<style>
.sk{--bg:#ffffff;--fg:#0b1020;--muted:#5a6477;--line:#e7ebf2;--ac:#5b5bf6;--ac2:#9b6bff;--card:#f7f9fc;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sk *{box-sizing:border-box;margin:0}
.sk-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.sk h1,.sk h2,.sk h3{letter-spacing:-.025em;line-height:1.08;font-weight:700}
.sk-hero{text-align:center;padding:clamp(72px,11vw,140px) 0 clamp(40px,6vw,72px)}
.sk-eye{display:inline-block;color:var(--ac);background:rgba(91,91,246,.1);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:20px}
.sk-hero h1{font-size:clamp(42px,7vw,78px);max-width:18ch;margin:0 auto 20px}
.sk-hero p{color:var(--muted);font-size:clamp(17px,1.8vw,20px);max-width:52ch;margin:0 auto 30px}
.sk-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sk-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.sk-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 36px rgba(91,91,246,.3)}
.sk-btn-p:hover{transform:translateY(-2px)}
.sk-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.sk-shot{max-width:980px;margin:0 auto;padding:0 24px}
.sk-shot img{width:100%;border-radius:18px;border:1px solid var(--line);box-shadow:0 40px 90px rgba(11,16,32,.16)}
.sk-sec{padding:clamp(54px,8vw,100px) 0}
.sk-head{text-align:center;max-width:640px;margin:0 auto 48px}
.sk-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.sk-head p{color:var(--muted);font-size:17px}
.sk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.sk-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;transition:.25s}
.sk-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(11,16,32,.08)}
.sk-card .ic{width:50px;height:50px;border-radius:13px;background:linear-gradient(135deg,var(--ac),var(--ac2));display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:18px}
.sk-card h3{font-size:19px;margin-bottom:10px}
.sk-card p{color:var(--muted);font-size:15px}
.sk-final{text-align:center;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:28px;padding:clamp(54px,8vw,96px) 24px;color:#fff}
.sk-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.sk-final p{opacity:.9;max-width:46ch;margin:0 auto 28px;font-size:17px}
.sk-final .sk-btn-w{background:#fff;color:var(--ac)}
@media(max-width:860px){.sk-grid{grid-template-columns:1fr}}
</style>
<div class="sk">
  <section class="sk-wrap sk-hero">
    <span class="sk-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="sk-cta"><a class="sk-btn sk-btn-p" href="#">{cta_primary}</a><a class="sk-btn sk-btn-g" href="#">{cta_secondary}</a></div>
  </section>

  <div class="sk-shot"><img src="{hero_image}" alt="{hero_title}"></div>

  <section class="sk-sec"><div class="sk-wrap">
    <div class="sk-head"><h2>{features_title}</h2><p>{features_subtitle}</p></div>
    <div class="sk-grid">
      <div class="sk-card"><div class="ic">⚡</div><h3>{feature_1_title}</h3><p>{feature_1_desc}</p></div>
      <div class="sk-card"><div class="ic">🔒</div><h3>{feature_2_title}</h3><p>{feature_2_desc}</p></div>
      <div class="sk-card"><div class="ic">📊</div><h3>{feature_3_title}</h3><p>{feature_3_desc}</p></div>
      <div class="sk-card"><div class="ic">🔗</div><h3>{feature_4_title}</h3><p>{feature_4_desc}</p></div>
      <div class="sk-card"><div class="ic">🤖</div><h3>{feature_5_title}</h3><p>{feature_5_desc}</p></div>
      <div class="sk-card"><div class="ic">🌐</div><h3>{feature_6_title}</h3><p>{feature_6_desc}</p></div>
    </div>
  </div></section>

  <section class="sk-sec"><div class="sk-wrap"><div class="sk-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="sk-btn sk-btn-w" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "stack-saas", name: "Stack — SaaS App", description: "Clean SaaS product landing with app screenshot and feature grid.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{features_title}", "{features_subtitle}",
      "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}",
      "{feature_4_title}", "{feature_4_desc}", "{feature_5_title}", "{feature_5_desc}", "{feature_6_title}", "{feature_6_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "saas", tags: ["saas", "software", "app", "product", "startup"],
    author: "Community", downloads: 721, rating: 4.9,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-saas",
    schema_type: "SoftwareApplication", platform: "generic",
    defaultValues: {
      eyebrow: "New release", hero_title: "Run your whole workflow in one place",
      hero_subtitle: "Plan, track and ship faster with a workspace your whole team will actually love using.",
      cta_primary: "Start free", cta_secondary: "Watch demo",
      hero_image: U("1551434678-e076c223a692", 980, 620),
      features_title: "Everything you need to move fast", features_subtitle: "Powerful features that scale with your team.",
      feature_1_title: "Lightning fast", feature_1_desc: "Built for speed so you never wait on your tools.",
      feature_2_title: "Secure by default", feature_2_desc: "Enterprise-grade encryption and access controls.",
      feature_3_title: "Real-time analytics", feature_3_desc: "Live dashboards that keep everyone aligned.",
      feature_4_title: "Integrations", feature_4_desc: "Connect the apps your team already relies on.",
      feature_5_title: "AI assist", feature_5_desc: "Automate busywork and surface what matters.",
      feature_6_title: "Works everywhere", feature_6_desc: "Web, desktop and mobile — fully in sync.",
      final_title: "Get started in minutes", final_subtitle: "No credit card required. Invite your team and ship today.",
      final_cta: "Create free account",
    },
  };
};

/* ───────────────────────── 28. SAVOR — Restaurant ───────────────────────── */
const savorRestaurant = (): MarketplaceTemplate => {
  const content = `<style>
.sv{--bg:#1a120b;--fg:#f6efe6;--muted:#bda98f;--line:rgba(255,255,255,.12);--ac:#e0a85e;--card:#241a11;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sv *{box-sizing:border-box;margin:0}
.sv-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.sv h1,.sv h2,.sv h3{font-family:Georgia,serif;line-height:1.1;font-weight:700}
.sv-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,128px) 0}
.sv-eye{display:inline-block;color:var(--ac);font-size:13px;letter-spacing:.25em;text-transform:uppercase;font-weight:600;margin-bottom:18px}
.sv-hero h1{font-size:clamp(42px,6.4vw,76px);margin-bottom:20px}
.sv-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:28px}
.sv-cta{display:flex;gap:14px;flex-wrap:wrap}
.sv-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:6px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.sv-btn-p{background:var(--ac);color:#1a120b}
.sv-btn-p:hover{transform:translateY(-2px)}
.sv-btn-g{border:1px solid var(--line);color:var(--fg)}
.sv-hero img{width:100%;border-radius:18px;aspect-ratio:4/4.2;object-fit:cover;box-shadow:0 30px 70px rgba(0,0,0,.45)}
.sv-sec{padding:clamp(54px,8vw,100px) 0}
.sv-head{text-align:center;max-width:640px;margin:0 auto 48px}
.sv-head h2{font-size:clamp(30px,4.6vw,50px);margin-bottom:14px}
.sv-head p{color:var(--muted);font-size:17px}
.sv-menu{display:grid;grid-template-columns:1fr 1fr;gap:14px 48px;max-width:880px;margin:0 auto}
.sv-item{display:flex;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px dashed var(--line)}
.sv-item h3{font-size:19px;margin-bottom:4px}
.sv-item p{color:var(--muted);font-size:14px}
.sv-item .pr{color:var(--ac);font-weight:700;white-space:nowrap}
.sv-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.sv-gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px}
.sv-final{text-align:center;border:1px solid var(--ac);border-radius:18px;padding:clamp(54px,8vw,96px) 24px}
.sv-final h2{font-size:clamp(30px,5vw,52px);max-width:18ch;margin:0 auto 16px}
.sv-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.sv-hero,.sv-menu{grid-template-columns:1fr}.sv-gal{grid-template-columns:1fr 1fr}}
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
    <div class="sv-head"><h2>{menu_title}</h2><p>{menu_subtitle}</p></div>
    <div class="sv-menu">
      <div class="sv-item"><div><h3>{dish_1_name}</h3><p>{dish_1_desc}</p></div><div class="pr">{dish_1_price}</div></div>
      <div class="sv-item"><div><h3>{dish_2_name}</h3><p>{dish_2_desc}</p></div><div class="pr">{dish_2_price}</div></div>
      <div class="sv-item"><div><h3>{dish_3_name}</h3><p>{dish_3_desc}</p></div><div class="pr">{dish_3_price}</div></div>
      <div class="sv-item"><div><h3>{dish_4_name}</h3><p>{dish_4_desc}</p></div><div class="pr">{dish_4_price}</div></div>
      <div class="sv-item"><div><h3>{dish_5_name}</h3><p>{dish_5_desc}</p></div><div class="pr">{dish_5_price}</div></div>
      <div class="sv-item"><div><h3>{dish_6_name}</h3><p>{dish_6_desc}</p></div><div class="pr">{dish_6_price}</div></div>
    </div>
  </div></section>

  <section class="sv-sec"><div class="sv-wrap">
    <div class="sv-gal">
      <img src="{gallery_1}" alt="dish"><img src="{gallery_2}" alt="dish"><img src="{gallery_3}" alt="dish">
    </div>
  </div></section>

  <section class="sv-sec"><div class="sv-wrap"><div class="sv-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="sv-btn sv-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "savor-restaurant", name: "Savor — Restaurant", description: "Warm fine-dining restaurant landing with full menu, gallery and reservations.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{menu_title}", "{menu_subtitle}",
      "{dish_1_name}", "{dish_1_desc}", "{dish_1_price}", "{dish_2_name}", "{dish_2_desc}", "{dish_2_price}",
      "{dish_3_name}", "{dish_3_desc}", "{dish_3_price}", "{dish_4_name}", "{dish_4_desc}", "{dish_4_price}",
      "{dish_5_name}", "{dish_5_desc}", "{dish_5_price}", "{dish_6_name}", "{dish_6_desc}", "{dish_6_price}",
      "{gallery_1}", "{gallery_2}", "{gallery_3}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["restaurant", "food", "dining", "menu", "cafe"],
    author: "Community", downloads: 489, rating: 4.8,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-restaurant",
    schema_type: "Restaurant", platform: "generic",
    defaultValues: {
      eyebrow: "Est. 2009", hero_title: "Flavors worth savoring",
      hero_subtitle: "Seasonal dishes crafted from locally sourced ingredients, served in a warm and welcoming space.",
      cta_primary: "Reserve a table", cta_secondary: "View menu",
      hero_image: U("1414235077428-338989a2e8c0", 880, 920),
      menu_title: "Our menu", menu_subtitle: "A taste of what our kitchen has to offer.",
      dish_1_name: "Truffle risotto", dish_1_desc: "Creamy arborio rice, wild mushrooms, parmesan", dish_1_price: "$24",
      dish_2_name: "Seared sea bass", dish_2_desc: "Citrus butter, charred greens, herb oil", dish_2_price: "$32",
      dish_3_name: "Wagyu burger", dish_3_desc: "Aged cheddar, caramelized onion, brioche", dish_3_price: "$22",
      dish_4_name: "Garden bowl", dish_4_desc: "Roasted vegetables, quinoa, tahini dressing", dish_4_price: "$18",
      dish_5_name: "Lamb shank", dish_5_desc: "Slow-braised, rosemary jus, creamy polenta", dish_5_price: "$34",
      dish_6_name: "Chocolate tart", dish_6_desc: "Dark ganache, sea salt, vanilla cream", dish_6_price: "$12",
      gallery_1: U("1504674900247-0877df9cc836", 600, 600), gallery_2: U("1565299624946-b28f40a0ae38", 600, 600), gallery_3: U("1540189549336-e6e99c3679fe", 600, 600),
      final_title: "Join us for an unforgettable evening", final_subtitle: "Book your table online and let us take care of the rest.",
      final_cta: "Reserve now",
    },
  };
};

/* ───────────────────────── 29. FRAME — Photography ──────────────────────── */
const framePhoto = (): MarketplaceTemplate => {
  const content = `<style>
.fr{--bg:#0c0c0c;--fg:#fafafa;--muted:#8c8c8c;--line:rgba(255,255,255,.12);--ac:#fafafa;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.fr *{box-sizing:border-box;margin:0}
.fr-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.fr h1,.fr h2,.fr h3{letter-spacing:-.02em;line-height:1.05;font-weight:600}
.fr-hero{text-align:center;padding:clamp(80px,12vw,150px) 0 clamp(40px,6vw,70px)}
.fr-eye{display:inline-block;color:var(--muted);font-size:13px;letter-spacing:.3em;text-transform:uppercase;margin-bottom:22px}
.fr-hero h1{font-size:clamp(46px,8vw,96px);margin-bottom:22px}
.fr-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:50ch;margin:0 auto 30px}
.fr-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.fr-btn{display:inline-flex;align-items:center;padding:14px 30px;border-radius:99px;font-weight:600;font-size:14px;letter-spacing:.04em;text-decoration:none;transition:.25s}
.fr-btn-p{background:var(--fg);color:#0c0c0c}
.fr-btn-p:hover{opacity:.85}
.fr-btn-g{border:1px solid var(--line);color:var(--fg)}
.fr-gal{columns:3;column-gap:14px;padding:clamp(20px,4vw,40px) 0}
.fr-gal img{width:100%;margin-bottom:14px;border-radius:10px;display:block;transition:.3s}
.fr-gal img:hover{opacity:.82}
.fr-sec{padding:clamp(54px,8vw,100px) 0}
.fr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;text-align:center}
.fr-stats .st b{display:block;font-size:clamp(32px,5vw,56px);font-weight:700}
.fr-stats .st span{color:var(--muted);font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.fr-final{text-align:center;border-top:1px solid var(--line);padding:clamp(54px,8vw,96px) 24px}
.fr-final h2{font-size:clamp(32px,5.5vw,60px);max-width:18ch;margin:0 auto 16px}
.fr-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.fr-gal{columns:2}.fr-stats{grid-template-columns:1fr}}
@media(max-width:520px){.fr-gal{columns:1}}
</style>
<div class="fr">
  <section class="fr-wrap fr-hero">
    <span class="fr-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="fr-cta"><a class="fr-btn fr-btn-p" href="#">{cta_primary}</a><a class="fr-btn fr-btn-g" href="#">{cta_secondary}</a></div>
  </section>

  <section class="fr-wrap"><div class="fr-gal">
    <img src="{photo_1}" alt="photo"><img src="{photo_2}" alt="photo"><img src="{photo_3}" alt="photo">
    <img src="{photo_4}" alt="photo"><img src="{photo_5}" alt="photo"><img src="{photo_6}" alt="photo">
  </div></section>

  <section class="fr-sec"><div class="fr-wrap">
    <div class="fr-stats">
      <div class="st"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="st"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="st"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
    </div>
  </div></section>

  <section class="fr-wrap"><div class="fr-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="fr-btn fr-btn-p" href="#">{final_cta}</a>
  </div></section>
</div>`;
  return {
    id: "frame-photography", name: "Frame — Photography", description: "Minimal masonry portfolio for photographers with gallery and stats.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{photo_1}", "{photo_2}", "{photo_3}", "{photo_4}", "{photo_5}", "{photo_6}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "portfolio", tags: ["photography", "portfolio", "gallery", "creative", "dark"],
    author: "Community", downloads: 553, rating: 4.9,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-photography",
    schema_type: "WebSite", platform: "generic",
    defaultValues: {
      eyebrow: "Visual storyteller", hero_title: "Moments, beautifully captured",
      hero_subtitle: "Portraits, weddings and editorial photography with a timeless, cinematic feel.",
      cta_primary: "View portfolio", cta_secondary: "Book a session",
      photo_1: U("1492691527719-9d1e07e534b4", 700, 900), photo_2: U("1500648767791-00dcc994a43e", 700, 600),
      photo_3: U("1517841905240-472988babdf9", 700, 800), photo_4: U("1506794778202-cad84cf45f1d", 700, 700),
      photo_5: U("1524504388940-b1c1722653e1", 700, 950), photo_6: U("1502685104226-ee32379fefbe", 700, 620),
      stat_1_num: "12+", stat_1_label: "Years experience", stat_2_num: "500+", stat_2_label: "Sessions shot", stat_3_num: "40", stat_3_label: "Awards won",
      final_title: "Let's create something timeless", final_subtitle: "Available for shoots worldwide. Tell me about your vision.",
      final_cta: "Get in touch",
    },
  };
};

/* ───────────────────────── 30. LEARN — Online course ────────────────────── */
const learnCourse = (): MarketplaceTemplate => {
  const content = `<style>
.ln{--bg:#fdfcf9;--fg:#191a2e;--muted:#62657a;--line:#eae7df;--ac:#ff6a3d;--ac2:#ff9472;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ln *{box-sizing:border-box;margin:0}
.ln-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.ln h1,.ln h2,.ln h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.ln-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,128px) 0}
.ln-eye{display:inline-block;color:var(--ac);background:rgba(255,106,61,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.ln-hero h1{font-size:clamp(40px,6vw,70px);margin-bottom:20px}
.ln-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:28px}
.ln-cta{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.ln-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.ln-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 36px rgba(255,106,61,.3)}
.ln-btn-p:hover{transform:translateY(-2px)}
.ln-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.ln-hero img{width:100%;border-radius:24px;aspect-ratio:4/3.4;object-fit:cover;box-shadow:0 30px 70px rgba(25,26,46,.14)}
.ln-sec{padding:clamp(54px,8vw,100px) 0}
.ln-head{text-align:center;max-width:640px;margin:0 auto 48px}
.ln-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.ln-head p{color:var(--muted);font-size:17px}
.ln-curr{display:grid;gap:14px;max-width:820px;margin:0 auto}
.ln-mod{display:flex;gap:20px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px 26px;transition:.25s}
.ln-mod:hover{transform:translateX(4px);box-shadow:0 12px 30px rgba(25,26,46,.08)}
.ln-mod .num{width:46px;height:46px;flex:none;border-radius:12px;background:rgba(255,106,61,.12);color:var(--ac);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px}
.ln-mod h3{font-size:18px;margin-bottom:4px}
.ln-mod p{color:var(--muted);font-size:14px}
.ln-mod .len{margin-left:auto;color:var(--muted);font-size:14px;white-space:nowrap}
.ln-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:24px;padding:48px 32px;color:#fff}
.ln-stats .st{text-align:center}
.ln-stats .st b{display:block;font-size:clamp(30px,4vw,46px);font-weight:800}
.ln-stats .st span{opacity:.9;font-size:14px}
.ln-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.ln-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.ln-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.ln-hero{grid-template-columns:1fr}.ln-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="ln">
  <section class="ln-wrap ln-hero">
    <div>
      <span class="ln-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="ln-cta"><a class="ln-btn ln-btn-p" href="#">{cta_primary}</a><a class="ln-btn ln-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="ln-sec"><div class="ln-wrap">
    <div class="ln-head"><h2>{curriculum_title}</h2><p>{curriculum_subtitle}</p></div>
    <div class="ln-curr">
      <div class="ln-mod"><div class="num">1</div><div><h3>{module_1_title}</h3><p>{module_1_desc}</p></div><div class="len">{module_1_len}</div></div>
      <div class="ln-mod"><div class="num">2</div><div><h3>{module_2_title}</h3><p>{module_2_desc}</p></div><div class="len">{module_2_len}</div></div>
      <div class="ln-mod"><div class="num">3</div><div><h3>{module_3_title}</h3><p>{module_3_desc}</p></div><div class="len">{module_3_len}</div></div>
      <div class="ln-mod"><div class="num">4</div><div><h3>{module_4_title}</h3><p>{module_4_desc}</p></div><div class="len">{module_4_len}</div></div>
    </div>
  </div></section>

  <section class="ln-sec"><div class="ln-wrap">
    <div class="ln-stats">
      <div class="st"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="st"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="st"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="st"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="ln-sec"><div class="ln-wrap"><div class="ln-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="ln-btn ln-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "learn-course", name: "Learn — Online Course", description: "Friendly online course landing with curriculum modules, stats and enrollment.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{curriculum_title}", "{curriculum_subtitle}",
      "{module_1_title}", "{module_1_desc}", "{module_1_len}", "{module_2_title}", "{module_2_desc}", "{module_2_len}",
      "{module_3_title}", "{module_3_desc}", "{module_3_len}", "{module_4_title}", "{module_4_desc}", "{module_4_len}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "education", tags: ["course", "education", "learning", "online", "training"],
    author: "Community", downloads: 612, rating: 4.9,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-course",
    schema_type: "Course", platform: "generic",
    defaultValues: {
      eyebrow: "Self-paced course", hero_title: "Master new skills, on your schedule",
      hero_subtitle: "Practical, project-based lessons taught by industry experts — learn by building real things.",
      cta_primary: "Enroll now", cta_secondary: "Preview lessons",
      hero_image: U("1522202176988-66273c2fd55f", 900, 760),
      curriculum_title: "What you'll learn", curriculum_subtitle: "A clear path from beginner to confident practitioner.",
      module_1_title: "Foundations", module_1_desc: "Core concepts and the right mental model.", module_1_len: "1.5 hrs",
      module_2_title: "Hands-on practice", module_2_desc: "Build your first real project step by step.", module_2_len: "3 hrs",
      module_3_title: "Going deeper", module_3_desc: "Advanced techniques and best practices.", module_3_len: "2.5 hrs",
      module_4_title: "Ship it", module_4_desc: "Launch, polish and share your work.", module_4_len: "2 hrs",
      stat_1_num: "9 hrs", stat_1_label: "Of video", stat_2_num: "24K+", stat_2_label: "Students", stat_3_num: "32", stat_3_label: "Lessons", stat_4_num: "4.9★", stat_4_label: "Course rating",
      final_title: "Start learning today", final_subtitle: "Lifetime access, certificate of completion and a 30-day money-back guarantee.",
      final_cta: "Enroll now",
    },
  };
};

export const FRAMER_BATCH5_TEMPLATES: MarketplaceTemplate[] = [
  estateRealty(),
  pulseFitness(),
  stackSaas(),
  savorRestaurant(),
  framePhoto(),
  learnCourse(),
];
