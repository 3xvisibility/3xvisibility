// Framer-modelled marketplace templates — Batch 1 (1:1 design clones).
// Each is fully self-contained: scoped CSS, real photo defaults and richly
// editable {variables}. NO header / nav menu / logo bar and NO footer — only
// the main page design sections, exactly like the rest of the marketplace.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

// Stable Unsplash photo helper.
const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 1. NEXA — SaaS startup ───────────────────────── */
const nexaSaas = (): MarketplaceTemplate => {
  const content = `<style>
.nx{--bg:#0a0b12;--fg:#f4f5fb;--muted:#9aa0b4;--line:rgba(255,255,255,.09);--card:#12131d;--ac:#6d8bff;--ac2:#a978ff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.nx *{box-sizing:border-box;margin:0}
.nx-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.nx h1,.nx h2,.nx h3{letter-spacing:-.03em;line-height:1.05;font-weight:700}
.nx-hero{position:relative;text-align:center;padding:clamp(80px,12vw,150px) 0 clamp(60px,8vw,110px);background:radial-gradient(120% 80% at 50% -10%,rgba(109,139,255,.22),transparent 60%)}
.nx-badge{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:13px;color:var(--muted);margin-bottom:28px}
.nx-badge b{color:var(--ac);font-weight:600}
.nx-hero h1{font-size:clamp(38px,6.5vw,76px);max-width:14ch;margin:0 auto 22px;background:linear-gradient(180deg,#fff,#b9bedd);-webkit-background-clip:text;background-clip:text;color:transparent}
.nx-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:54ch;margin:0 auto 36px}
.nx-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.nx-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.nx-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 12px 32px rgba(109,139,255,.4)}
.nx-btn-p:hover{transform:translateY(-2px)}
.nx-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.nx-shot{margin:clamp(40px,6vw,70px) auto 0;max-width:1000px;border-radius:18px;border:1px solid var(--line);overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.55)}
.nx-shot img{width:100%;display:block}
.nx-sec{padding:clamp(60px,9vw,110px) 0}
.nx-eye{color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;text-align:center;margin-bottom:14px}
.nx-sec h2{font-size:clamp(28px,4.2vw,46px);text-align:center;max-width:18ch;margin:0 auto 18px}
.nx-sub{color:var(--muted);text-align:center;max-width:52ch;margin:0 auto 54px;font-size:17px}
.nx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.nx-feat{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:32px}
.nx-feat .ic{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:linear-gradient(135deg,rgba(109,139,255,.2),rgba(169,120,255,.16));margin-bottom:20px}
.nx-feat h3{font-size:19px;margin-bottom:10px}
.nx-feat p{color:var(--muted);font-size:15px}
.nx-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:48px 0}
.nx-stat b{display:block;font-size:clamp(30px,4vw,48px);font-weight:700;background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.nx-stat span{color:var(--muted);font-size:14px}
.nx-price{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch}
.nx-plan{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:34px;display:flex;flex-direction:column}
.nx-plan.hot{border-color:var(--ac);box-shadow:0 24px 60px rgba(109,139,255,.22);position:relative}
.nx-plan.hot::before{content:'Popular';position:absolute;top:-12px;left:34px;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px}
.nx-plan .pn{font-size:15px;color:var(--muted);font-weight:600}
.nx-plan .pp{font-size:42px;font-weight:700;margin:10px 0 2px}
.nx-plan .pp span{font-size:15px;color:var(--muted);font-weight:400}
.nx-plan ul{list-style:none;padding:0;margin:22px 0 26px;display:flex;flex-direction:column;gap:12px}
.nx-plan li{color:var(--muted);font-size:14px;display:flex;gap:10px}
.nx-plan li::before{content:'✓';color:var(--ac);font-weight:700}
.nx-final{text-align:center;background:linear-gradient(135deg,rgba(109,139,255,.16),rgba(169,120,255,.12));border:1px solid var(--line);border-radius:28px;padding:clamp(50px,7vw,90px) 24px}
.nx-final h2{font-size:clamp(28px,4.5vw,52px);margin-bottom:18px}
.nx-final p{color:var(--muted);max-width:46ch;margin:0 auto 32px;font-size:17px}
@media(max-width:860px){.nx-grid,.nx-price{grid-template-columns:1fr}.nx-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="nx">
  <section class="nx-hero"><div class="nx-wrap">
    <span class="nx-badge">🚀 <b>{badge_text}</b></span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="nx-cta"><a class="nx-btn nx-btn-p" href="#">{cta_primary}</a><a class="nx-btn nx-btn-g" href="#">{cta_secondary}</a></div>
    <div class="nx-shot"><img src="{hero_image}" alt="{product_name} dashboard"/></div>
  </div></section>

  <section class="nx-sec"><div class="nx-wrap">
    <div class="nx-stats">
      <div class="nx-stat"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="nx-stat"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="nx-stat"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="nx-stat"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="nx-sec"><div class="nx-wrap">
    <div class="nx-eye">{features_eyebrow}</div>
    <h2>{features_title}</h2>
    <p class="nx-sub">{features_subtitle}</p>
    <div class="nx-grid">
      <div class="nx-feat"><div class="ic">⚡</div><h3>{feature_1_title}</h3><p>{feature_1_desc}</p></div>
      <div class="nx-feat"><div class="ic">🔒</div><h3>{feature_2_title}</h3><p>{feature_2_desc}</p></div>
      <div class="nx-feat"><div class="ic">📊</div><h3>{feature_3_title}</h3><p>{feature_3_desc}</p></div>
      <div class="nx-feat"><div class="ic">🤝</div><h3>{feature_4_title}</h3><p>{feature_4_desc}</p></div>
      <div class="nx-feat"><div class="ic">🔄</div><h3>{feature_5_title}</h3><p>{feature_5_desc}</p></div>
      <div class="nx-feat"><div class="ic">✨</div><h3>{feature_6_title}</h3><p>{feature_6_desc}</p></div>
    </div>
  </div></section>

  <section class="nx-sec"><div class="nx-wrap">
    <div class="nx-eye">{pricing_eyebrow}</div>
    <h2>{pricing_title}</h2>
    <p class="nx-sub">{pricing_subtitle}</p>
    <div class="nx-price">
      <div class="nx-plan"><div class="pn">{plan_1_name}</div><div class="pp">{plan_1_price}<span>/mo</span></div><ul><li>{plan_1_f1}</li><li>{plan_1_f2}</li><li>{plan_1_f3}</li></ul><a class="nx-btn nx-btn-g" href="#" style="margin-top:auto">{plan_1_cta}</a></div>
      <div class="nx-plan hot"><div class="pn">{plan_2_name}</div><div class="pp">{plan_2_price}<span>/mo</span></div><ul><li>{plan_2_f1}</li><li>{plan_2_f2}</li><li>{plan_2_f3}</li><li>{plan_2_f4}</li></ul><a class="nx-btn nx-btn-p" href="#" style="margin-top:auto">{plan_2_cta}</a></div>
      <div class="nx-plan"><div class="pn">{plan_3_name}</div><div class="pp">{plan_3_price}<span>/mo</span></div><ul><li>{plan_3_f1}</li><li>{plan_3_f2}</li><li>{plan_3_f3}</li></ul><a class="nx-btn nx-btn-g" href="#" style="margin-top:auto">{plan_3_cta}</a></div>
    </div>
  </div></section>

  <section class="nx-sec"><div class="nx-wrap">
    <div class="nx-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="nx-btn nx-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "saas-startup",
    name: "SaaS Startup Template",
    description: "Dark, gradient SaaS startup landing — badge hero with product screenshot, stat band, six-feature grid, three-tier pricing and a glowing final CTA. Modelled on modern Framer SaaS templates.",
    content,
    variables: [
      "{badge_text}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}", "{product_name}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{features_eyebrow}", "{features_title}", "{features_subtitle}",
      "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}",
      "{feature_4_title}", "{feature_4_desc}", "{feature_5_title}", "{feature_5_desc}", "{feature_6_title}", "{feature_6_desc}",
      "{pricing_eyebrow}", "{pricing_title}", "{pricing_subtitle}",
      "{plan_1_name}", "{plan_1_price}", "{plan_1_f1}", "{plan_1_f2}", "{plan_1_f3}", "{plan_1_cta}",
      "{plan_2_name}", "{plan_2_price}", "{plan_2_f1}", "{plan_2_f2}", "{plan_2_f3}", "{plan_2_f4}", "{plan_2_cta}",
      "{plan_3_name}", "{plan_3_price}", "{plan_3_f1}", "{plan_3_f2}", "{plan_3_f3}", "{plan_3_cta}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["saas", "startup", "dark", "pricing", "landing"],
    author: "Community", downloads: 612, rating: 4.8,
    seo_title_pattern: "{product_name} — {hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{product_name} — {hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "{product_name}-saas",
    schema_type: "SoftwareApplication",
    platform: "generic",
    defaultValues: {
      badge_text: "Now with AI workflows", hero_title: "The all-in-one platform for modern teams",
      hero_subtitle: "Plan, build and ship faster with one connected workspace that keeps your whole team in sync.",
      cta_primary: "Start free trial", cta_secondary: "Book a demo", product_name: "Nexa",
      hero_image: U("1551288049-bebda4e38f71", 1200, 760),
      stat_1_num: "12k+", stat_1_label: "Active teams", stat_2_num: "99.9%", stat_2_label: "Uptime SLA",
      stat_3_num: "4.9/5", stat_3_label: "Avg. rating", stat_4_num: "60%", stat_4_label: "Faster shipping",
      features_eyebrow: "Features", features_title: "Everything you need to move faster",
      features_subtitle: "Powerful tools that replace your patchwork of apps with one streamlined system.",
      feature_1_title: "Lightning fast", feature_1_desc: "Built on a modern stack so every action feels instant, even at scale.",
      feature_2_title: "Secure by default", feature_2_desc: "SOC 2 compliant with end-to-end encryption and granular permissions.",
      feature_3_title: "Real-time analytics", feature_3_desc: "Track the metrics that matter with dashboards your whole team can read.",
      feature_4_title: "Seamless collaboration", feature_4_desc: "Comment, assign and resolve without ever leaving your flow.",
      feature_5_title: "Automations", feature_5_desc: "Replace repetitive busywork with rules that run themselves.",
      feature_6_title: "100+ integrations", feature_6_desc: "Connect the tools you already love in just a couple of clicks.",
      pricing_eyebrow: "Pricing", pricing_title: "Simple, transparent pricing",
      pricing_subtitle: "Start free and scale as you grow. No hidden fees, cancel anytime.",
      plan_1_name: "Starter", plan_1_price: "$0", plan_1_f1: "Up to 3 members", plan_1_f2: "Basic analytics", plan_1_f3: "Community support", plan_1_cta: "Get started",
      plan_2_name: "Pro", plan_2_price: "$24", plan_2_f1: "Unlimited members", plan_2_f2: "Advanced analytics", plan_2_f3: "Automations", plan_2_f4: "Priority support", plan_2_cta: "Start free trial",
      plan_3_name: "Enterprise", plan_3_price: "$79", plan_3_f1: "SSO & SAML", plan_3_f2: "Dedicated manager", plan_3_f3: "Custom SLAs", plan_3_cta: "Contact sales",
      final_title: "Ready to build something great?", final_subtitle: "Join thousands of teams already shipping faster with Nexa.",
      final_cta: "Start for free",
    },
  };
};

/* ─────────────────────── 2. LUMEN — Personal portfolio ──────────────────── */
const lumenPortfolio = (): MarketplaceTemplate => {
  const content = `<style>
.lm{--bg:#f6f4ef;--fg:#15140f;--muted:#6b6760;--line:#e0dcd2;--ac:#c8643c;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6}
.lm *{box-sizing:border-box;margin:0}
.lm-wrap{max-width:1080px;margin:0 auto;padding:0 28px}
.lm-serif{font-family:'Playfair Display',Georgia,serif}
.lm-hero{padding:clamp(70px,11vw,140px) 0 clamp(50px,7vw,90px)}
.lm-hero .av{width:90px;height:90px;border-radius:50%;object-fit:cover;margin-bottom:28px;border:3px solid #fff;box-shadow:0 8px 24px rgba(0,0,0,.1)}
.lm-hero h1{font-size:clamp(36px,6.5vw,72px);line-height:1.05;letter-spacing:-.02em;max-width:16ch;margin-bottom:22px}
.lm-hero h1 em{color:var(--ac);font-style:italic}
.lm-hero p{color:var(--muted);font-size:clamp(17px,1.8vw,21px);max-width:50ch;margin-bottom:30px}
.lm-links{display:flex;gap:14px;flex-wrap:wrap}
.lm-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.lm-btn-d{background:var(--fg);color:var(--bg)}
.lm-btn-d:hover{background:var(--ac)}
.lm-btn-o{border:1px solid var(--line);color:var(--fg)}
.lm-sec{padding:clamp(50px,8vw,90px) 0;border-top:1px solid var(--line)}
.lm-eye{color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:14px}
.lm-sec h2{font-size:clamp(26px,4vw,42px);letter-spacing:-.02em;margin-bottom:36px;max-width:20ch}
.lm-work{display:grid;grid-template-columns:repeat(2,1fr);gap:28px}
.lm-proj{cursor:pointer}
.lm-proj img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;transition:.4s}
.lm-proj:hover img{transform:scale(1.02)}
.lm-proj h3{font-size:21px;margin:18px 0 4px;letter-spacing:-.01em}
.lm-proj span{color:var(--muted);font-size:14px}
.lm-about{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center}
.lm-about img{width:100%;border-radius:16px;aspect-ratio:1;object-fit:cover}
.lm-about p{color:var(--muted);font-size:17px;margin-bottom:18px}
.lm-svc{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.lm-svc div{background:#fff;border:1px solid var(--line);border-radius:16px;padding:28px}
.lm-svc h3{font-size:18px;margin-bottom:8px}
.lm-svc p{color:var(--muted);font-size:14px}
.lm-cta{text-align:center;padding:clamp(60px,9vw,110px) 0}
.lm-cta h2{font-size:clamp(30px,5vw,58px);max-width:18ch;margin:0 auto 22px}
.lm-cta p{color:var(--muted);font-size:18px;max-width:44ch;margin:0 auto 30px}
@media(max-width:760px){.lm-work,.lm-svc{grid-template-columns:1fr}.lm-about{grid-template-columns:1fr}}
</style>
<div class="lm">
  <section class="lm-hero"><div class="lm-wrap">
    <img class="av" src="{avatar}" alt="{full_name}"/>
    <h1 class="lm-serif">Hi, I'm {full_name} — a {role} crafting <em>{specialty}</em></h1>
    <p>{hero_intro}</p>
    <div class="lm-links"><a class="lm-btn lm-btn-d" href="#">{cta_primary}</a><a class="lm-btn lm-btn-o" href="#">{cta_secondary}</a></div>
  </div></section>

  <section class="lm-sec"><div class="lm-wrap">
    <div class="lm-eye">{work_eyebrow}</div>
    <h2 class="lm-serif">{work_title}</h2>
    <div class="lm-work">
      <div class="lm-proj"><img src="{project_1_image}" alt="{project_1_title}"/><h3>{project_1_title}</h3><span>{project_1_meta}</span></div>
      <div class="lm-proj"><img src="{project_2_image}" alt="{project_2_title}"/><h3>{project_2_title}</h3><span>{project_2_meta}</span></div>
      <div class="lm-proj"><img src="{project_3_image}" alt="{project_3_title}"/><h3>{project_3_title}</h3><span>{project_3_meta}</span></div>
      <div class="lm-proj"><img src="{project_4_image}" alt="{project_4_title}"/><h3>{project_4_title}</h3><span>{project_4_meta}</span></div>
    </div>
  </div></section>

  <section class="lm-sec"><div class="lm-wrap">
    <div class="lm-about">
      <div>
        <div class="lm-eye">{about_eyebrow}</div>
        <h2 class="lm-serif">{about_title}</h2>
        <p>{about_text_1}</p>
        <p>{about_text_2}</p>
      </div>
      <img src="{about_image}" alt="{full_name}"/>
    </div>
  </div></section>

  <section class="lm-sec"><div class="lm-wrap">
    <div class="lm-eye">{services_eyebrow}</div>
    <h2 class="lm-serif">{services_title}</h2>
    <div class="lm-svc">
      <div><h3>{service_1_title}</h3><p>{service_1_desc}</p></div>
      <div><h3>{service_2_title}</h3><p>{service_2_desc}</p></div>
      <div><h3>{service_3_title}</h3><p>{service_3_desc}</p></div>
    </div>
  </div></section>

  <section class="lm-cta"><div class="lm-wrap">
    <h2 class="lm-serif">{cta_title}</h2>
    <p>{cta_text}</p>
    <a class="lm-btn lm-btn-d" href="mailto:{email}">{cta_button}</a>
  </div></section>
</div>`;
  return {
    id: "personal-portfolio",
    name: "Personal Portfolio Template",
    description: "Warm, editorial personal portfolio — serif headline hero with avatar, two-column project gallery, about split, services grid and a big contact CTA. Modelled on minimal Framer portfolio templates.",
    content,
    variables: [
      "{full_name}", "{role}", "{specialty}", "{avatar}", "{hero_intro}", "{cta_primary}", "{cta_secondary}", "{email}",
      "{work_eyebrow}", "{work_title}",
      "{project_1_title}", "{project_1_meta}", "{project_1_image}", "{project_2_title}", "{project_2_meta}", "{project_2_image}",
      "{project_3_title}", "{project_3_meta}", "{project_3_image}", "{project_4_title}", "{project_4_meta}", "{project_4_image}",
      "{about_eyebrow}", "{about_title}", "{about_text_1}", "{about_text_2}", "{about_image}",
      "{services_eyebrow}", "{services_title}", "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}", "{service_3_title}", "{service_3_desc}",
      "{cta_title}", "{cta_text}", "{cta_button}",
    ],
    category: "portfolio",
    tags: ["portfolio", "personal", "minimal", "editorial", "freelance"],
    author: "Community", downloads: 489, rating: 4.9,
    seo_title_pattern: "{full_name} — {role}",
    seo_description_pattern: "{hero_intro}",
    og_title_pattern: "{full_name} — {role}", og_description_pattern: "{hero_intro}", og_image_pattern: "{project_1_image}",
    slug_pattern: "{full_name}-portfolio",
    schema_type: "Person",
    platform: "generic",
    defaultValues: {
      full_name: "Maya Larsen", role: "product designer", specialty: "thoughtful digital experiences",
      avatar: U("1494790108377-be9c29b29330", 200, 200),
      hero_intro: "I help startups and studios turn complex ideas into clean, intuitive interfaces people love to use.",
      cta_primary: "View work", cta_secondary: "Download CV", email: "hello@mayalarsen.com",
      work_eyebrow: "Selected work", work_title: "Projects I'm proud of",
      project_1_title: "Finovate Banking App", project_1_meta: "UI/UX · 2025", project_1_image: U("1551288049-bebda4e38f71", 800, 600),
      project_2_title: "Bloom Wellness", project_2_meta: "Branding · 2024", project_2_image: U("1505740420928-5e560c06d30e", 800, 600),
      project_3_title: "Cargo Logistics", project_3_meta: "Web App · 2024", project_3_image: U("1460925895917-afdab827c52f", 800, 600),
      project_4_title: "Atlas Travel", project_4_meta: "Mobile · 2023", project_4_image: U("1551434678-e076c223a692", 800, 600),
      about_eyebrow: "About", about_title: "Design with intention",
      about_text_1: "For the past eight years I've partnered with founders to ship products that feel effortless. My approach blends research, systems thinking and a love of detail.",
      about_text_2: "When I'm not designing you'll find me sketching, hiking or hunting for the perfect cup of coffee.",
      about_image: U("1573496359142-b8d87734a5a2", 700, 700),
      services_eyebrow: "Services", services_title: "How I can help",
      service_1_title: "Product Design", service_1_desc: "End-to-end design from discovery to polished, ready-to-build UI.",
      service_2_title: "Design Systems", service_2_desc: "Scalable component libraries that keep your product consistent.",
      service_3_title: "Brand Identity", service_3_desc: "Logos, palettes and guidelines that make your brand unmistakable.",
      cta_title: "Let's build something together", cta_text: "I'm currently open to select freelance projects and collaborations.",
      cta_button: "Get in touch",
    },
  };
};

/* ─────────────────────── 3. ORBIT — AI product launch ───────────────────── */
const orbitAi = (): MarketplaceTemplate => {
  const content = `<style>
.ob{--bg:#070510;--fg:#f3f0ff;--muted:#a39fc4;--line:rgba(255,255,255,.1);--ac:#b06bff;--ac2:#4f7bff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ob *{box-sizing:border-box;margin:0}
.ob-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.ob h1,.ob h2,.ob h3{letter-spacing:-.03em;line-height:1.06;font-weight:700}
.ob-hero{position:relative;text-align:center;padding:clamp(90px,13vw,170px) 0 clamp(40px,6vw,80px)}
.ob-hero::before{content:'';position:absolute;width:680px;height:680px;left:50%;top:-260px;transform:translateX(-50%);background:radial-gradient(circle,rgba(176,107,255,.32),transparent 62%);filter:blur(20px);pointer-events:none}
.ob-pill{position:relative;display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:13px;color:var(--muted);margin-bottom:26px}
.ob-pill b{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:600}
.ob-hero h1{position:relative;font-size:clamp(40px,7vw,84px);max-width:15ch;margin:0 auto 22px}
.ob-hero h1 .g{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.ob-hero p{position:relative;color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:52ch;margin:0 auto 34px}
.ob-cta{position:relative;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.ob-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:14px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.ob-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 40px rgba(176,107,255,.45)}
.ob-btn-p:hover{transform:translateY(-2px)}
.ob-btn-g{background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--fg)}
.ob-prompt{position:relative;max-width:760px;margin:48px auto 0;background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:18px;padding:18px 20px;display:flex;align-items:center;gap:14px;text-align:left;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.ob-prompt .dot{width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,var(--ac),var(--ac2));flex-shrink:0;box-shadow:0 0 14px var(--ac)}
.ob-prompt span{color:var(--muted);font-size:15px}
.ob-sec{padding:clamp(60px,9vw,110px) 0}
.ob-eye{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
.ob-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.ob-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 54px;font-size:17px}
.ob-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.ob-card{background:linear-gradient(160deg,rgba(176,107,255,.08),rgba(79,123,255,.05));border:1px solid var(--line);border-radius:20px;padding:30px}
.ob-card .ic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(255,255,255,.06);margin-bottom:18px}
.ob-card h3{font-size:18px;margin-bottom:10px}
.ob-card p{color:var(--muted);font-size:15px}
.ob-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;counter-reset:s}
.ob-step{position:relative;padding-top:18px;border-top:2px solid var(--line)}
.ob-step::before{counter-increment:s;content:'0' counter(s);position:absolute;top:-2px;left:0;width:46px;border-top:2px solid var(--ac);padding-top:18px;font-weight:700;color:var(--ac);font-size:14px}
.ob-step h3{font-size:19px;margin:14px 0 8px}
.ob-step p{color:var(--muted);font-size:15px}
.ob-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px;background:radial-gradient(100% 140% at 50% 0%,rgba(176,107,255,.18),transparent 60%)}
.ob-final h2{font-size:clamp(30px,5vw,56px);max-width:16ch;margin:0 auto 18px}
.ob-final p{color:var(--muted);max-width:46ch;margin:0 auto 32px;font-size:17px}
@media(max-width:860px){.ob-grid,.ob-steps{grid-template-columns:1fr}}
</style>
<div class="ob">
  <section class="ob-hero"><div class="ob-wrap">
    <span class="ob-pill">✦ <b>{badge_text}</b></span>
    <h1>{hero_title_a} <span class="g">{hero_title_b}</span></h1>
    <p>{hero_subtitle}</p>
    <div class="ob-cta"><a class="ob-btn ob-btn-p" href="#">{cta_primary}</a><a class="ob-btn ob-btn-g" href="#">{cta_secondary}</a></div>
    <div class="ob-prompt"><span class="dot"></span><span>{prompt_example}</span></div>
  </div></section>

  <section class="ob-sec"><div class="ob-wrap">
    <div class="ob-eye">{features_eyebrow}</div>
    <h2>{features_title}</h2>
    <p class="ob-sub">{features_subtitle}</p>
    <div class="ob-grid">
      <div class="ob-card"><div class="ic">🧠</div><h3>{feature_1_title}</h3><p>{feature_1_desc}</p></div>
      <div class="ob-card"><div class="ic">⚡</div><h3>{feature_2_title}</h3><p>{feature_2_desc}</p></div>
      <div class="ob-card"><div class="ic">🔌</div><h3>{feature_3_title}</h3><p>{feature_3_desc}</p></div>
      <div class="ob-card"><div class="ic">🛡️</div><h3>{feature_4_title}</h3><p>{feature_4_desc}</p></div>
      <div class="ob-card"><div class="ic">📈</div><h3>{feature_5_title}</h3><p>{feature_5_desc}</p></div>
      <div class="ob-card"><div class="ic">🌐</div><h3>{feature_6_title}</h3><p>{feature_6_desc}</p></div>
    </div>
  </div></section>

  <section class="ob-sec"><div class="ob-wrap">
    <div class="ob-eye">{how_eyebrow}</div>
    <h2>{how_title}</h2>
    <p class="ob-sub">{how_subtitle}</p>
    <div class="ob-steps">
      <div class="ob-step"><h3>{step_1_title}</h3><p>{step_1_desc}</p></div>
      <div class="ob-step"><h3>{step_2_title}</h3><p>{step_2_desc}</p></div>
      <div class="ob-step"><h3>{step_3_title}</h3><p>{step_3_desc}</p></div>
    </div>
  </div></section>

  <section class="ob-sec"><div class="ob-wrap">
    <div class="ob-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="ob-btn ob-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "ai-product",
    name: "AI Product Template",
    description: "Deep-space AI product launch — glowing gradient hero with prompt bar, six-capability grid, numbered how-it-works and a radiant final CTA. Modelled on Framer AI templates.",
    content,
    variables: [
      "{badge_text}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{prompt_example}",
      "{features_eyebrow}", "{features_title}", "{features_subtitle}",
      "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}",
      "{feature_4_title}", "{feature_4_desc}", "{feature_5_title}", "{feature_5_desc}", "{feature_6_title}", "{feature_6_desc}",
      "{how_eyebrow}", "{how_title}", "{how_subtitle}",
      "{step_1_title}", "{step_1_desc}", "{step_2_title}", "{step_2_desc}", "{step_3_title}", "{step_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["ai", "saas", "product", "dark", "gradient"],
    author: "Community", downloads: 701, rating: 4.9,
    seo_title_pattern: "{hero_title_a} {hero_title_b}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "",
    slug_pattern: "{hero_title_b}-ai",
    schema_type: "SoftwareApplication",
    platform: "generic",
    defaultValues: {
      badge_text: "Powered by next-gen models", hero_title_a: "Your AI copilot for", hero_title_b: "everything you create",
      hero_subtitle: "Orbit understands your context and helps you write, design and ship in a fraction of the time.",
      cta_primary: "Try it free", cta_secondary: "Watch demo",
      prompt_example: "Draft a launch email for our new pricing plans and make it sound friendly…",
      features_eyebrow: "Capabilities", features_title: "One assistant, endless possibilities",
      features_subtitle: "Orbit plugs into your workflow and handles the heavy lifting so you stay in flow.",
      feature_1_title: "Context-aware", feature_1_desc: "Understands your docs, data and tone for answers that actually fit.",
      feature_2_title: "Instant results", feature_2_desc: "Generate drafts, code and ideas in seconds, not hours.",
      feature_3_title: "Connects everywhere", feature_3_desc: "Works inside the apps and tools your team already uses daily.",
      feature_4_title: "Private & secure", feature_4_desc: "Your data stays yours — encrypted and never used for training.",
      feature_5_title: "Learns with you", feature_5_desc: "Adapts to your preferences and gets sharper over time.",
      feature_6_title: "Multilingual", feature_6_desc: "Create and translate across 50+ languages effortlessly.",
      how_eyebrow: "How it works", how_title: "Get started in minutes",
      how_subtitle: "No setup headaches — connect, prompt and let Orbit do the rest.",
      step_1_title: "Connect your tools", step_1_desc: "Link your workspace and knowledge sources in a couple of clicks.",
      step_2_title: "Ask anything", step_2_desc: "Type a prompt and Orbit pulls the right context automatically.",
      step_3_title: "Ship the result", step_3_desc: "Refine, approve and push your output wherever it needs to go.",
      final_title: "Meet the smartest member of your team", final_subtitle: "Start free today and feel the difference Orbit makes.",
      final_cta: "Get started free",
    },
  };
};

/* ─────────────────────── 4. VERDE — Mobile app ──────────────────────────── */
const verdeApp = (): MarketplaceTemplate => {
  const content = `<style>
.vd{--bg:#0c130e;--fg:#eef6ef;--muted:#9bb3a0;--line:rgba(255,255,255,.1);--ac:#54e08a;--card:#121b14;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.vd *{box-sizing:border-box;margin:0}
.vd-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.vd h1,.vd h2,.vd h3{letter-spacing:-.03em;line-height:1.06;font-weight:700}
.vd-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(70px,10vw,130px) 0}
.vd-badge{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:13px;color:var(--ac);margin-bottom:24px}
.vd-hero h1{font-size:clamp(38px,5.6vw,68px);max-width:14ch;margin-bottom:20px}
.vd-hero p{color:var(--muted);font-size:clamp(16px,1.6vw,19px);max-width:46ch;margin-bottom:30px}
.vd-store{display:flex;gap:14px;flex-wrap:wrap}
.vd-btn{display:inline-flex;align-items:center;gap:10px;padding:13px 24px;border-radius:14px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.vd-btn-p{background:var(--ac);color:#06210f;box-shadow:0 12px 32px rgba(84,224,138,.35)}
.vd-btn-p:hover{transform:translateY(-2px)}
.vd-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.vd-phone{position:relative;justify-self:center}
.vd-phone img{width:min(320px,80vw);border-radius:38px;border:8px solid #1a261d;box-shadow:0 40px 90px rgba(0,0,0,.6)}
.vd-rating{margin-top:24px;display:flex;align-items:center;gap:14px;color:var(--muted);font-size:14px}
.vd-rating b{color:var(--fg)}
.vd-sec{padding:clamp(60px,9vw,110px) 0}
.vd-eye{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
.vd-sec h2{text-align:center;font-size:clamp(28px,4.2vw,46px);max-width:18ch;margin:0 auto 18px}
.vd-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 54px;font-size:17px}
.vd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.vd-feat{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px}
.vd-feat .ic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(84,224,138,.14);margin-bottom:18px}
.vd-feat h3{font-size:18px;margin-bottom:10px}
.vd-feat p{color:var(--muted);font-size:15px}
.vd-split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.vd-split img{width:100%;border-radius:20px;aspect-ratio:4/3;object-fit:cover}
.vd-split h2{text-align:left;font-size:clamp(26px,3.6vw,40px);margin:0 0 16px}
.vd-split p{color:var(--muted);font-size:17px;margin-bottom:14px}
.vd-list{list-style:none;padding:0;display:flex;flex-direction:column;gap:12px}
.vd-list li{color:var(--muted);font-size:15px;display:flex;gap:10px}
.vd-list li::before{content:'✓';color:var(--ac);font-weight:700}
.vd-final{text-align:center;background:linear-gradient(135deg,rgba(84,224,138,.16),rgba(84,224,138,.04));border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px}
.vd-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 18px}
.vd-final p{color:var(--muted);max-width:44ch;margin:0 auto 30px;font-size:17px}
@media(max-width:860px){.vd-hero,.vd-split{grid-template-columns:1fr}.vd-grid{grid-template-columns:1fr}}
</style>
<div class="vd">
  <section class="vd-hero vd-wrap">
    <div>
      <span class="vd-badge">🌱 {badge_text}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="vd-store"><a class="vd-btn vd-btn-p" href="#">{cta_primary}</a><a class="vd-btn vd-btn-g" href="#">{cta_secondary}</a></div>
      <div class="vd-rating">★★★★★ &nbsp;<b>{rating}</b> · {rating_count}</div>
    </div>
    <div class="vd-phone"><img src="{phone_image}" alt="{app_name} app screen"/></div>
  </section>

  <section class="vd-sec"><div class="vd-wrap">
    <div class="vd-eye">{features_eyebrow}</div>
    <h2>{features_title}</h2>
    <p class="vd-sub">{features_subtitle}</p>
    <div class="vd-grid">
      <div class="vd-feat"><div class="ic">📅</div><h3>{feature_1_title}</h3><p>{feature_1_desc}</p></div>
      <div class="vd-feat"><div class="ic">🔔</div><h3>{feature_2_title}</h3><p>{feature_2_desc}</p></div>
      <div class="vd-feat"><div class="ic">📈</div><h3>{feature_3_title}</h3><p>{feature_3_desc}</p></div>
    </div>
  </div></section>

  <section class="vd-sec"><div class="vd-wrap">
    <div class="vd-split">
      <img src="{showcase_image}" alt="{app_name} feature"/>
      <div>
        <h2>{showcase_title}</h2>
        <p>{showcase_text}</p>
        <ul class="vd-list"><li>{showcase_point_1}</li><li>{showcase_point_2}</li><li>{showcase_point_3}</li></ul>
      </div>
    </div>
  </div></section>

  <section class="vd-sec"><div class="vd-wrap">
    <div class="vd-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="vd-btn vd-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "mobile-app",
    name: "Mobile App Template",
    description: "Fresh, green mobile-app landing — split phone hero with store buttons and rating, three-feature grid, image showcase with checklist and a final download CTA. Modelled on Framer app templates.",
    content,
    variables: [
      "{badge_text}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{rating}", "{rating_count}", "{phone_image}", "{app_name}",
      "{features_eyebrow}", "{features_title}", "{features_subtitle}",
      "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}",
      "{showcase_image}", "{showcase_title}", "{showcase_text}", "{showcase_point_1}", "{showcase_point_2}", "{showcase_point_3}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["app", "mobile", "startup", "green", "download"],
    author: "Community", downloads: 544, rating: 4.7,
    seo_title_pattern: "{app_name} — {hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{app_name} — {hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{phone_image}",
    slug_pattern: "{app_name}-app",
    schema_type: "MobileApplication",
    platform: "generic",
    defaultValues: {
      badge_text: "New: smart habit tracking", hero_title: "Build better habits, one day at a time",
      hero_subtitle: "Verde helps you stay consistent with gentle reminders, streaks and insights that actually keep you going.",
      cta_primary: "Download for iOS", cta_secondary: "Get it on Android", rating: "4.8", rating_count: "12,400+ reviews", app_name: "Verde",
      phone_image: U("1512941937669-90a1b58e7e9c", 640, 1280),
      features_eyebrow: "Features", features_title: "Everything you need to stay on track",
      features_subtitle: "Simple, beautiful tools designed to make good habits stick.",
      feature_1_title: "Daily planner", feature_1_desc: "Organise your routines and see your whole day at a glance.",
      feature_2_title: "Smart reminders", feature_2_desc: "Nudges at the right moment so you never break your streak.",
      feature_3_title: "Progress insights", feature_3_desc: "Clear charts that show how far you've come and what's next.",
      showcase_image: U("1551434678-e076c223a692", 800, 600),
      showcase_title: "Stay motivated with streaks that matter",
      showcase_text: "Verde turns progress into momentum with visual streaks, milestones and rewards that keep you coming back.",
      showcase_point_1: "Customisable habit categories", showcase_point_2: "Offline-first, syncs everywhere", showcase_point_3: "Private and ad-free by design",
      final_title: "Start your journey today", final_subtitle: "Join over 12,000 people building better days with Verde.",
      final_cta: "Download free",
    },
  };
};

/* ─────────────────────── 5. STUDIO MONO — Photography ───────────────────── */
const studioMono = (): MarketplaceTemplate => {
  const content = `<style>
.sm{--bg:#0c0c0c;--fg:#f2f2f2;--muted:#9a9a9a;--line:rgba(255,255,255,.12);background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sm *{box-sizing:border-box;margin:0}
.sm-wrap{max-width:1240px;margin:0 auto;padding:0 24px}
.sm h1,.sm h2,.sm h3{letter-spacing:-.02em;line-height:1.05;font-weight:600}
.sm-hero{padding:clamp(80px,12vw,160px) 0 clamp(40px,6vw,70px)}
.sm-hero .eye{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.24em;margin-bottom:22px}
.sm-hero h1{font-size:clamp(44px,9vw,120px);text-transform:uppercase;letter-spacing:-.04em;line-height:.92}
.sm-hero .meta{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-top:32px;color:var(--muted);font-size:15px;border-top:1px solid var(--line);padding-top:24px}
.sm-feature{padding:0 0 clamp(40px,6vw,70px)}
.sm-feature img{width:100%;height:clamp(360px,62vh,640px);object-fit:cover}
.sm-gal{padding:clamp(20px,4vw,40px) 0 clamp(60px,9vw,110px)}
.sm-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.sm-grid figure{margin:0;position:relative;overflow:hidden;cursor:pointer}
.sm-grid img{width:100%;aspect-ratio:3/4;object-fit:cover;transition:.5s}
.sm-grid figure:hover img{transform:scale(1.04)}
.sm-grid figcaption{position:absolute;left:16px;bottom:14px;font-size:13px;color:#fff;opacity:0;transition:.3s;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.sm-grid figure:hover figcaption{opacity:1}
.sm-about{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(50px,8vw,90px) 0;border-top:1px solid var(--line)}
.sm-about img{width:100%;aspect-ratio:4/5;object-fit:cover}
.sm-about .eye{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.2em;margin-bottom:16px}
.sm-about h2{font-size:clamp(26px,4vw,42px);margin-bottom:20px}
.sm-about p{color:var(--muted);font-size:17px;margin-bottom:16px}
.sm-cta{text-align:center;padding:clamp(60px,9vw,120px) 0;border-top:1px solid var(--line)}
.sm-cta h2{font-size:clamp(30px,6vw,72px);text-transform:uppercase;letter-spacing:-.03em;margin-bottom:22px}
.sm-cta p{color:var(--muted);max-width:44ch;margin:0 auto 30px;font-size:17px}
.sm-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;border:1px solid var(--fg);border-radius:999px;color:var(--fg);font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.sm-btn:hover{background:var(--fg);color:var(--bg)}
@media(max-width:760px){.sm-grid{grid-template-columns:1fr 1fr}.sm-about{grid-template-columns:1fr}}
</style>
<div class="sm">
  <section class="sm-hero"><div class="sm-wrap">
    <div class="eye">{eyebrow}</div>
    <h1>{photographer_name}</h1>
    <div class="meta"><span>{tagline}</span><span>{location}</span><span>{availability}</span></div>
  </div></section>

  <section class="sm-feature"><img src="{feature_image}" alt="Featured work by {photographer_name}"/></section>

  <section class="sm-gal"><div class="sm-wrap">
    <div class="sm-grid">
      <figure><img src="{photo_1}" alt="{photo_1_caption}"/><figcaption>{photo_1_caption}</figcaption></figure>
      <figure><img src="{photo_2}" alt="{photo_2_caption}"/><figcaption>{photo_2_caption}</figcaption></figure>
      <figure><img src="{photo_3}" alt="{photo_3_caption}"/><figcaption>{photo_3_caption}</figcaption></figure>
      <figure><img src="{photo_4}" alt="{photo_4_caption}"/><figcaption>{photo_4_caption}</figcaption></figure>
      <figure><img src="{photo_5}" alt="{photo_5_caption}"/><figcaption>{photo_5_caption}</figcaption></figure>
      <figure><img src="{photo_6}" alt="{photo_6_caption}"/><figcaption>{photo_6_caption}</figcaption></figure>
    </div>
  </div></section>

  <section class="sm-wrap"><div class="sm-about">
    <img src="{about_image}" alt="{photographer_name}"/>
    <div>
      <div class="eye">{about_eyebrow}</div>
      <h2>{about_title}</h2>
      <p>{about_text_1}</p>
      <p>{about_text_2}</p>
    </div>
  </div></section>

  <section class="sm-cta"><div class="sm-wrap">
    <h2>{cta_title}</h2>
    <p>{cta_text}</p>
    <a class="sm-btn" href="mailto:{email}">{cta_button}</a>
  </div></section>
</div>`;
  return {
    id: "photography-portfolio",
    name: "Photography Portfolio Template",
    description: "Bold black gallery-first photography portfolio — oversized name hero, full-bleed feature image, hover-caption grid, about split and an editorial contact CTA. Modelled on minimal Framer photography templates.",
    content,
    variables: [
      "{eyebrow}", "{photographer_name}", "{tagline}", "{location}", "{availability}", "{feature_image}",
      "{photo_1}", "{photo_1_caption}", "{photo_2}", "{photo_2_caption}", "{photo_3}", "{photo_3_caption}",
      "{photo_4}", "{photo_4_caption}", "{photo_5}", "{photo_5_caption}", "{photo_6}", "{photo_6_caption}",
      "{about_eyebrow}", "{about_title}", "{about_text_1}", "{about_text_2}", "{about_image}",
      "{cta_title}", "{cta_text}", "{cta_button}", "{email}",
    ],
    category: "portfolio",
    tags: ["photography", "portfolio", "gallery", "dark", "editorial"],
    author: "Community", downloads: 458, rating: 4.8,
    seo_title_pattern: "{photographer_name} — {tagline}",
    seo_description_pattern: "{tagline} based in {location}. {cta_text}",
    og_title_pattern: "{photographer_name} — {tagline}", og_description_pattern: "{tagline} based in {location}. {cta_text}", og_image_pattern: "{photographer_name}",
    slug_pattern: "{photographer_name}-photography",
    schema_type: "Person",
    platform: "generic",
    defaultValues: {
      eyebrow: "Photographer · Visual artist", photographer_name: "Noah Fields",
      tagline: "Light, shadow & quiet moments", location: "Lisbon, PT", availability: "Open for commissions",
      feature_image: U("1469474968028-56623f02e42e", 1600, 900),
      photo_1: U("1493863641943-9b68992a8d07", 600, 800), photo_1_caption: "Portrait series — 2025",
      photo_2: U("1502920917128-1aa500764cbd", 600, 800), photo_2_caption: "Coastline — Algarve",
      photo_3: U("1441974231531-c6227db76b6e", 600, 800), photo_3_caption: "Into the woods",
      photo_4: U("1470071459604-3b5ec3a7fe05", 600, 800), photo_4_caption: "Morning fog",
      photo_5: U("1506794778202-cad84cf45f1d", 600, 800), photo_5_caption: "Studio light",
      photo_6: U("1500648767791-00dcc994a43e", 600, 800), photo_6_caption: "Street, golden hour",
      about_eyebrow: "About", about_title: "Stories told in stills",
      about_text_1: "I'm a photographer drawn to the in-between — the quiet seconds most people walk past. My work spans portraiture, landscape and editorial.",
      about_text_2: "Published in selected magazines and trusted by brands who care about how their story looks.",
      about_image: U("1507003211169-0a1dd7228f2d", 700, 875),
      cta_title: "Let's create together", cta_text: "Available for editorial, brand and personal commissions worldwide.",
      cta_button: "Get in touch", email: "studio@noahfields.com",
    },
  };
};

/* ─────────────────────── 6. PULSE — Fitness / gym ───────────────────────── */
const pulseFitness = (): MarketplaceTemplate => {
  const content = `<style>
.ps{--bg:#0d0d0f;--fg:#f5f5f5;--muted:#a0a0a8;--line:rgba(255,255,255,.1);--ac:#ff5a3c;--card:#16161a;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ps *{box-sizing:border-box;margin:0}
.ps-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.ps h1,.ps h2,.ps h3{letter-spacing:-.02em;line-height:1.04;font-weight:800;text-transform:uppercase}
.ps-hero{position:relative;min-height:88vh;display:flex;align-items:flex-end;padding:0 0 clamp(50px,7vw,90px);background-size:cover;background-position:center}
.ps-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,13,15,.4),rgba(13,13,15,.95))}
.ps-hero .in{position:relative;z-index:2}
.ps-badge{display:inline-flex;align-items:center;gap:8px;background:var(--ac);color:#fff;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:700;letter-spacing:.1em;margin-bottom:22px}
.ps-hero h1{font-size:clamp(44px,9vw,108px);max-width:14ch}
.ps-hero h1 span{color:var(--ac)}
.ps-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:48ch;margin:20px 0 30px;text-transform:none;font-weight:400}
.ps-cta{display:flex;gap:14px;flex-wrap:wrap}
.ps-btn{display:inline-flex;align-items:center;gap:8px;padding:15px 32px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:.06em;text-decoration:none;transition:.25s;text-transform:uppercase}
.ps-btn-p{background:var(--ac);color:#fff;box-shadow:0 12px 32px rgba(255,90,60,.4)}
.ps-btn-p:hover{transform:translateY(-2px)}
.ps-btn-g{background:rgba(255,255,255,.08);border:1px solid var(--line);color:var(--fg)}
.ps-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding:clamp(40px,6vw,60px) 0;border-bottom:1px solid var(--line)}
.ps-stat b{display:block;font-size:clamp(30px,4vw,52px);color:var(--ac)}
.ps-stat span{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.1em}
.ps-sec{padding:clamp(60px,9vw,110px) 0}
.ps-eye{color:var(--ac);font-size:13px;font-weight:700;letter-spacing:.18em;margin-bottom:14px;text-align:center}
.ps-sec h2{text-align:center;font-size:clamp(30px,5vw,56px);max-width:18ch;margin:0 auto 18px}
.ps-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 54px;font-size:17px;text-transform:none}
.ps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.ps-prog{position:relative;border-radius:14px;overflow:hidden;min-height:340px;display:flex;align-items:flex-end;background-size:cover;background-position:center}
.ps-prog::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent,rgba(0,0,0,.85))}
.ps-prog .c{position:relative;z-index:2;padding:24px}
.ps-prog h3{font-size:22px;margin-bottom:6px}
.ps-prog p{color:var(--muted);font-size:14px;text-transform:none}
.ps-price{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:stretch}
.ps-plan{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:34px;display:flex;flex-direction:column;text-transform:none}
.ps-plan.hot{border-color:var(--ac)}
.ps-plan .pn{font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ac)}
.ps-plan .pp{font-size:44px;font-weight:800;margin:10px 0}
.ps-plan .pp span{font-size:15px;color:var(--muted);font-weight:400}
.ps-plan ul{list-style:none;padding:0;margin:18px 0 26px;display:flex;flex-direction:column;gap:12px}
.ps-plan li{color:var(--muted);font-size:14px;display:flex;gap:10px}
.ps-plan li::before{content:'✓';color:var(--ac);font-weight:700}
.ps-final{position:relative;text-align:center;border-radius:20px;overflow:hidden;padding:clamp(60px,9vw,120px) 24px;background-size:cover;background-position:center}
.ps-final::before{content:'';position:absolute;inset:0;background:rgba(13,13,15,.78)}
.ps-final .c{position:relative;z-index:2}
.ps-final h2{font-size:clamp(30px,5vw,60px);max-width:16ch;margin:0 auto 18px}
.ps-final p{color:var(--muted);max-width:44ch;margin:0 auto 30px;font-size:17px;text-transform:none}
@media(max-width:860px){.ps-grid,.ps-price{grid-template-columns:1fr}.ps-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="ps">
  <section class="ps-hero" style="background-image:url('{hero_image}')"><div class="ps-wrap in">
    <span class="ps-badge">{badge_text}</span>
    <h1>{hero_title_a} <span>{hero_title_b}</span></h1>
    <p>{hero_subtitle}</p>
    <div class="ps-cta"><a class="ps-btn ps-btn-p" href="#">{cta_primary}</a><a class="ps-btn ps-btn-g" href="#">{cta_secondary}</a></div>
  </div></section>

  <section class="ps-wrap"><div class="ps-stats">
    <div class="ps-stat"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
    <div class="ps-stat"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
    <div class="ps-stat"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
    <div class="ps-stat"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
  </div></section>

  <section class="ps-sec"><div class="ps-wrap">
    <div class="ps-eye">{programs_eyebrow}</div>
    <h2>{programs_title}</h2>
    <p class="ps-sub">{programs_subtitle}</p>
    <div class="ps-grid">
      <div class="ps-prog" style="background-image:url('{program_1_image}')"><div class="c"><h3>{program_1_title}</h3><p>{program_1_desc}</p></div></div>
      <div class="ps-prog" style="background-image:url('{program_2_image}')"><div class="c"><h3>{program_2_title}</h3><p>{program_2_desc}</p></div></div>
      <div class="ps-prog" style="background-image:url('{program_3_image}')"><div class="c"><h3>{program_3_title}</h3><p>{program_3_desc}</p></div></div>
    </div>
  </div></section>

  <section class="ps-sec"><div class="ps-wrap">
    <div class="ps-eye">{pricing_eyebrow}</div>
    <h2>{pricing_title}</h2>
    <p class="ps-sub">{pricing_subtitle}</p>
    <div class="ps-price">
      <div class="ps-plan"><div class="pn">{plan_1_name}</div><div class="pp">{plan_1_price}<span>/mo</span></div><ul><li>{plan_1_f1}</li><li>{plan_1_f2}</li><li>{plan_1_f3}</li></ul><a class="ps-btn ps-btn-g" href="#" style="margin-top:auto">{plan_1_cta}</a></div>
      <div class="ps-plan hot"><div class="pn">{plan_2_name}</div><div class="pp">{plan_2_price}<span>/mo</span></div><ul><li>{plan_2_f1}</li><li>{plan_2_f2}</li><li>{plan_2_f3}</li><li>{plan_2_f4}</li></ul><a class="ps-btn ps-btn-p" href="#" style="margin-top:auto">{plan_2_cta}</a></div>
      <div class="ps-plan"><div class="pn">{plan_3_name}</div><div class="pp">{plan_3_price}<span>/mo</span></div><ul><li>{plan_3_f1}</li><li>{plan_3_f2}</li><li>{plan_3_f3}</li></ul><a class="ps-btn ps-btn-g" href="#" style="margin-top:auto">{plan_3_cta}</a></div>
    </div>
  </div></section>

  <section class="ps-sec"><div class="ps-wrap">
    <div class="ps-final" style="background-image:url('{final_image}')"><div class="c">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="ps-btn ps-btn-p" href="#">{final_cta}</a>
    </div></div>
  </div></section>
</div>`;
  return {
    id: "fitness-gym",
    name: "Fitness Gym Template",
    description: "High-energy fitness gym landing — full-bleed image hero, bold stat band, image-card program grid, three membership tiers and an immersive final CTA. Modelled on Framer fitness templates.",
    content,
    variables: [
      "{badge_text}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{programs_eyebrow}", "{programs_title}", "{programs_subtitle}",
      "{program_1_title}", "{program_1_desc}", "{program_1_image}", "{program_2_title}", "{program_2_desc}", "{program_2_image}", "{program_3_title}", "{program_3_desc}", "{program_3_image}",
      "{pricing_eyebrow}", "{pricing_title}", "{pricing_subtitle}",
      "{plan_1_name}", "{plan_1_price}", "{plan_1_f1}", "{plan_1_f2}", "{plan_1_f3}", "{plan_1_cta}",
      "{plan_2_name}", "{plan_2_price}", "{plan_2_f1}", "{plan_2_f2}", "{plan_2_f3}", "{plan_2_f4}", "{plan_2_cta}",
      "{plan_3_name}", "{plan_3_price}", "{plan_3_f1}", "{plan_3_f2}", "{plan_3_f3}", "{plan_3_cta}",
      "{final_title}", "{final_subtitle}", "{final_cta}", "{final_image}",
    ],
    category: "business",
    tags: ["fitness", "gym", "sport", "dark", "membership"],
    author: "Community", downloads: 533, rating: 4.8,
    seo_title_pattern: "{hero_title_a} {hero_title_b}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "{hero_title_b}-fitness",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      badge_text: "NEW MEMBER OFFER", hero_title_a: "Train hard,", hero_title_b: "live strong",
      hero_subtitle: "World-class equipment, expert coaches and a community that pushes you to be your best — every single day.",
      cta_primary: "Join now", cta_secondary: "Free trial pass", hero_image: U("1534438327276-14e5300c3a48", 1600, 1000),
      stat_1_num: "5k+", stat_1_label: "Members", stat_2_num: "40+", stat_2_label: "Weekly classes",
      stat_3_num: "25", stat_3_label: "Expert coaches", stat_4_num: "24/7", stat_4_label: "Access",
      programs_eyebrow: "Programs", programs_title: "Find your training style",
      programs_subtitle: "From strength to conditioning, our programs are built to get you results.",
      program_1_title: "Strength", program_1_desc: "Build raw power with structured lifting and progressive overload.", program_1_image: U("1571019613454-1cb2f99b2d8b", 700, 900),
      program_2_title: "HIIT", program_2_desc: "Burn fat fast with high-intensity interval sessions.", program_2_image: U("1517836357463-d25dfeac3438", 700, 900),
      program_3_title: "Conditioning", program_3_desc: "Boost endurance and mobility for everyday strength.", program_3_image: U("1605296867304-46d5465a13f1", 700, 900),
      pricing_eyebrow: "Membership", pricing_title: "Plans for every goal",
      pricing_subtitle: "No contracts, no hidden fees. Cancel anytime.",
      plan_1_name: "Basic", plan_1_price: "$29", plan_1_f1: "Gym floor access", plan_1_f2: "Locker room", plan_1_f3: "Mobile app", plan_1_cta: "Choose plan",
      plan_2_name: "Pro", plan_2_price: "$59", plan_2_f1: "Everything in Basic", plan_2_f2: "All group classes", plan_2_f3: "1 PT session / month", plan_2_f4: "Sauna access", plan_2_cta: "Choose plan",
      plan_3_name: "Elite", plan_3_price: "$99", plan_3_f1: "Everything in Pro", plan_3_f2: "Weekly PT sessions", plan_3_f3: "Nutrition coaching", plan_3_cta: "Choose plan",
      final_title: "Your first session is on us", final_subtitle: "Claim your free trial pass and feel the difference at Pulse.",
      final_cta: "Claim free pass", final_image: U("1517838277536-f5f99be501cd", 1600, 900),
    },
  };
};

export const FRAMER_BATCH1_TEMPLATES: MarketplaceTemplate[] = [
  nexaSaas(),
  lumenPortfolio(),
  orbitAi(),
  verdeApp(),
  studioMono(),
  pulseFitness(),
];
