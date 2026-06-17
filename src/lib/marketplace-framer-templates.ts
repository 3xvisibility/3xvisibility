// Framer-modelled marketplace templates (1:1 design clones).
// Each function returns a fully self-contained MarketplaceTemplate with scoped
// CSS, real Framer image defaults, and richly editable {variables} so users can
// change text, images (upload/crop) and styling like every other template.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const FU = "https://framerusercontent.com/images";

/* ───────────────────────────── 1. ASTRALAB ─────────────────────────────── */
/* Dark "space of creative solutions" agency — modelled on astralab.framer.website */
const astralabAgency = (): MarketplaceTemplate => {
  const content = `<style>
.al-page{--al-bg:#0a0a0c;--al-fg:#f5f5f7;--al-muted:#9b9ba3;--al-line:rgba(255,255,255,.1);--al-card:#141417;background:var(--al-bg);color:var(--al-fg);font-family:'Inter',system-ui,sans-serif;line-height:1.55;overflow:hidden}
.al-page *{box-sizing:border-box;margin:0}
.al-wrap{max-width:1240px;margin:0 auto;padding:0 24px}
.al-page h1,.al-page h2,.al-page h3{letter-spacing:-.03em;line-height:1.02;font-weight:600}
.al-hero{position:relative;min-height:92vh;display:flex;flex-direction:column;justify-content:flex-end;background:radial-gradient(120% 90% at 75% 30%,#1b1b22 0%,#0a0a0c 60%);background-image:url('{hero_bg}');background-size:cover;background-position:center;padding:120px 0 64px}
.al-hero::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#ededed 0%,#ededed 32%,rgba(10,10,12,.2) 46%,rgba(10,10,12,.9) 70%);}
.al-hero-top{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-start;padding:28px 24px;z-index:3}
.al-badge{display:inline-flex;align-items:center;gap:10px;background:#16161a;border:1px solid var(--al-line);border-radius:999px;padding:8px 8px 8px 8px;color:#fff;font-size:13px}
.al-badge img{width:34px;height:34px;border-radius:50%;object-fit:cover}
.al-badge span{padding-right:14px}
.al-dots{width:34px;height:34px;border-radius:50%;background:#16161a;border:1px solid var(--al-line);display:flex;align-items:center;justify-content:center;color:#fff}
.al-hero-inner{position:relative;z-index:3;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap}
.al-hero-logo{font-size:clamp(72px,16vw,220px);font-weight:600;line-height:.8;color:#fff;letter-spacing:-.05em}
.al-hero-logo sup{font-size:.18em;vertical-align:super;opacity:.7}
.al-hero-tag{color:#111;font-size:14px;max-width:120px}
.al-hero-right{color:#fff;text-align:right}
.al-hero-right h2{font-size:clamp(22px,2.4vw,34px);font-weight:500}
.al-services-list{position:absolute;left:24px;bottom:90px;z-index:3;color:#111;font-size:14px}
.al-services-list div{display:flex;justify-content:space-between;gap:48px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.15);width:300px}
.al-sec{padding:clamp(64px,9vw,130px) 0;border-top:1px solid var(--al-line)}
.al-eyebrow{color:var(--al-muted);font-size:13px;text-transform:uppercase;letter-spacing:.18em;margin-bottom:28px}
.al-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:32px}
.al-stat .n{font-size:clamp(40px,6vw,76px);font-weight:600;letter-spacing:-.04em}
.al-stat h4{font-size:12px;text-transform:uppercase;letter-spacing:.15em;color:var(--al-muted);margin-bottom:14px}
.al-stat p{color:var(--al-muted);font-size:14px;margin-top:10px}
.al-sec-title{font-size:clamp(34px,6vw,72px);font-weight:600;letter-spacing:-.04em;margin-bottom:48px}
.al-srv{display:grid;grid-template-columns:1.1fr 1fr;gap:40px;align-items:center;padding:36px 0;border-top:1px solid var(--al-line)}
.al-srv .idx{color:var(--al-muted);font-size:14px}
.al-srv h3{font-size:clamp(24px,3vw,40px);font-weight:500;margin:14px 0}
.al-srv p{color:var(--al-muted);max-width:460px}
.al-srv .pill{display:inline-block;margin-top:18px;font-size:13px;color:var(--al-muted);border:1px solid var(--al-line);border-radius:999px;padding:6px 14px}
.al-srv-img{aspect-ratio:16/10;border-radius:18px;overflow:hidden;background:#1a1a1f}
.al-srv-img img{width:100%;height:100%;object-fit:cover}
.al-proj{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.al-proj-card{background:var(--al-card);border:1px solid var(--al-line);border-radius:20px;overflow:hidden}
.al-proj-card .ph{aspect-ratio:4/3;overflow:hidden}
.al-proj-card .ph img{width:100%;height:100%;object-fit:cover}
.al-proj-card .meta{padding:20px}
.al-proj-card .meta .d{color:var(--al-muted);font-size:13px}
.al-proj-card .meta h3{font-size:22px;font-weight:500;margin-top:8px}
.al-price{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.al-price-card{background:var(--al-card);border:1px solid var(--al-line);border-radius:24px;padding:36px;display:flex;flex-direction:column;gap:18px}
.al-price-card .pimg{aspect-ratio:1;border-radius:18px;overflow:hidden;max-width:220px}
.al-price-card .pimg img{width:100%;height:100%;object-fit:cover}
.al-price-card h4{font-size:13px;text-transform:uppercase;letter-spacing:.15em;color:var(--al-muted)}
.al-price-card .amt{font-size:48px;font-weight:600;letter-spacing:-.03em}
.al-price-card ul{list-style:none;padding:0;color:var(--al-muted);font-size:15px;display:flex;flex-direction:column;gap:10px}
.al-price-card ul li::before{content:"— ";color:#fff}
.al-btn{display:inline-block;background:#fff;color:#0a0a0c;border-radius:999px;padding:14px 28px;font-weight:500;font-size:15px;text-align:center;transition:transform .25s ease}
.al-btn:hover{transform:translateY(-2px)}
.al-btn-ghost{background:transparent;color:#fff;border:1px solid var(--al-line)}
.al-rev{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:40px}
.al-rev-card{background:var(--al-card);border:1px solid var(--al-line);border-radius:20px;padding:28px}
.al-rev-card .who{display:flex;align-items:center;gap:14px;margin-bottom:18px}
.al-rev-card img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.al-rev-card .who b{display:block;font-weight:500}
.al-rev-card .who span{color:var(--al-muted);font-size:13px}
.al-rev-card p{color:#d8d8de;font-size:15px}
.al-cta{text-align:center;padding:clamp(80px,12vw,180px) 0;background:radial-gradient(80% 120% at 50% 0%,#1b1b22,transparent)}
.al-cta h2{font-size:clamp(34px,6vw,72px);font-weight:600;max-width:900px;margin:0 auto 32px}
@media(max-width:900px){.al-stats{grid-template-columns:repeat(2,1fr)}.al-srv,.al-proj,.al-price,.al-rev{grid-template-columns:1fr}.al-services-list{display:none}}
</style>
<div class="al-page">
  <section class="al-hero">
    <div class="al-hero-top">
      <div></div>
      <div class="al-badge"><img src="{founder_avatar}" alt="{founder_name}"/><span>{cta_text}</span></div>
      <div class="al-dots">•••</div>
    </div>
    <div class="al-services-list">
      <div><span>Branding and Identity</span><span>—</span></div>
      <div><span>UI/UX and Product Design</span><span>—</span></div>
      <div><span>Social Media Marketing</span><span>—</span></div>
      <div><span>SEO Optimization</span><span>—</span></div>
    </div>
    <div class="al-wrap al-hero-inner">
      <div>
        <div class="al-hero-logo">{company_name}<sup>®</sup></div>
        <div class="al-hero-tag">{hero_tagline}</div>
      </div>
      <div class="al-hero-right"><h2>{hero_title}</h2></div>
    </div>
  </section>

  <section class="al-sec"><div class="al-wrap">
    <div class="al-stats">
      <div class="al-stat"><h4>Launched Projects</h4><div class="n">{stat_1_num}</div><p>{stat_1_label}</p></div>
      <div class="al-stat"><h4>Client Satisfaction</h4><div class="n">{stat_2_num}%</div><p>{stat_2_label}</p></div>
      <div class="al-stat"><h4>Established</h4><div class="n">{stat_3_num}</div><p>{stat_3_label}</p></div>
      <div class="al-stat"><h4>Team of Pilots</h4><div class="n">{stat_4_num}</div><p>{stat_4_label}</p></div>
    </div>
  </div></section>

  <section class="al-sec"><div class="al-wrap">
    <div class="al-eyebrow">Services</div>
    <div class="al-srv">
      <div><div class="idx">/01</div><h3>{service_1_title}</h3><p>{service_1_desc}</p><span class="pill">{service_1_tags}</span></div>
      <div class="al-srv-img"><img src="{service_1_image}" alt="{service_1_title}"/></div>
    </div>
    <div class="al-srv">
      <div><div class="idx">/02</div><h3>{service_2_title}</h3><p>{service_2_desc}</p><span class="pill">{service_2_meta}</span></div>
      <div class="al-srv-img"><img src="{service_2_image}" alt="{service_2_title}"/></div>
    </div>
    <div class="al-srv">
      <div><div class="idx">/03</div><h3>{service_3_title}</h3><p>{service_3_desc}</p><span class="pill">{service_3_meta}</span></div>
      <div class="al-srv-img"><img src="{service_3_image}" alt="{service_3_title}"/></div>
    </div>
    <div class="al-srv">
      <div><div class="idx">/04</div><h3>{service_4_title}</h3><p>{service_4_desc}</p><span class="pill">{service_4_meta}</span></div>
      <div class="al-srv-img"><img src="{service_4_image}" alt="{service_4_title}"/></div>
    </div>
  </div></section>

  <section class="al-sec"><div class="al-wrap">
    <h2 class="al-sec-title">Projects</h2>
    <div class="al-proj">
      <div class="al-proj-card"><div class="ph"><img src="{project_1_image}" alt="{project_1_title}"/></div><div class="meta"><div class="d">{project_1_date}</div><h3>{project_1_title}</h3></div></div>
      <div class="al-proj-card"><div class="ph"><img src="{project_2_image}" alt="{project_2_title}"/></div><div class="meta"><div class="d">{project_2_date}</div><h3>{project_2_title}</h3></div></div>
      <div class="al-proj-card"><div class="ph"><img src="{project_3_image}" alt="{project_3_title}"/></div><div class="meta"><div class="d">{project_3_date}</div><h3>{project_3_title}</h3></div></div>
    </div>
  </div></section>

  <section class="al-sec"><div class="al-wrap">
    <h2 class="al-sec-title">Pricing</h2>
    <div class="al-price">
      <div class="al-price-card"><div class="pimg"><img src="{price_1_image}" alt=""/></div><h4>{plan_1_name}</h4><div class="amt">$ {plan_1_price}</div><ul><li>{plan_1_f1}</li><li>{plan_1_f2}</li><li>{plan_1_f3}</li><li>{plan_1_f4}</li></ul><div style="color:var(--al-muted);font-size:14px">Delivery: {plan_1_delivery}</div><a class="al-btn" href="#contact">Get in Touch</a></div>
      <div class="al-price-card"><div class="pimg"><img src="{price_2_image}" alt=""/></div><h4>{plan_2_name}</h4><div class="amt">$ {plan_2_price}</div><ul><li>{plan_2_f1}</li><li>{plan_2_f2}</li><li>{plan_2_f3}</li><li>{plan_2_f4}</li></ul><div style="color:var(--al-muted);font-size:14px">Delivery: {plan_2_delivery}</div><a class="al-btn al-btn-ghost" href="#contact">Get in Touch</a></div>
    </div>
  </div></section>

  <section class="al-sec"><div class="al-wrap">
    <div class="al-eyebrow">People say · {rating}</div>
    <h2 class="al-sec-title">Loved by founders</h2>
    <div class="al-rev">
      <div class="al-rev-card"><div class="who"><img src="{review_1_avatar}" alt=""/><div><b>{review_1_name}</b><span>{review_1_role}</span></div></div><p>{review_1_text}</p></div>
      <div class="al-rev-card"><div class="who"><img src="{review_2_avatar}" alt=""/><div><b>{review_2_name}</b><span>{review_2_role}</span></div></div><p>{review_2_text}</p></div>
      <div class="al-rev-card"><div class="who"><img src="{review_3_avatar}" alt=""/><div><b>{review_3_name}</b><span>{review_3_role}</span></div></div><p>{review_3_text}</p></div>
    </div>
  </div></section>

  <section class="al-cta" id="contact"><div class="al-wrap">
    <h2>{cta_title}</h2>
    <a class="al-btn" href="#">{cta_text}</a>
  </div></section>
</div>`;

  return {
    id: "astralab-agency",
    name: "Astralab Creative Agency",
    description: "Dark, cinematic 'space of creative solutions' agency landing — split planet hero with giant logotype, stats, animated services list, project grid, dual pricing, testimonials and CTA. Modelled 1:1 on the Astralab Framer template.",
    content,
    variables: [
      "{company_name}", "{hero_title}", "{hero_tagline}", "{cta_text}", "{cta_title}", "{rating}", "{founder_name}", "{founder_avatar}", "{hero_bg}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{service_1_title}", "{service_1_desc}", "{service_1_tags}", "{service_1_image}",
      "{service_2_title}", "{service_2_desc}", "{service_2_meta}", "{service_2_image}",
      "{service_3_title}", "{service_3_desc}", "{service_3_meta}", "{service_3_image}",
      "{service_4_title}", "{service_4_desc}", "{service_4_meta}", "{service_4_image}",
      "{project_1_title}", "{project_1_date}", "{project_1_image}", "{project_2_title}", "{project_2_date}", "{project_2_image}", "{project_3_title}", "{project_3_date}", "{project_3_image}",
      "{plan_1_name}", "{plan_1_price}", "{plan_1_f1}", "{plan_1_f2}", "{plan_1_f3}", "{plan_1_f4}", "{plan_1_delivery}", "{price_1_image}",
      "{plan_2_name}", "{plan_2_price}", "{plan_2_f1}", "{plan_2_f2}", "{plan_2_f3}", "{plan_2_f4}", "{plan_2_delivery}", "{price_2_image}",
      "{review_1_name}", "{review_1_role}", "{review_1_text}", "{review_1_avatar}", "{review_2_name}", "{review_2_role}", "{review_2_text}", "{review_2_avatar}", "{review_3_name}", "{review_3_role}", "{review_3_text}", "{review_3_avatar}",
    ],
    category: "business",
    tags: ["agency", "creative", "branding", "dark", "portfolio"],
    author: "Community", downloads: 734, rating: 4.9,
    seo_title_pattern: "{company_name} — {hero_title}",
    seo_description_pattern: "{hero_tagline} {company_name} blends strategy, design and technology to help brands stand out.",
    slug_pattern: "{company_name}-creative-agency",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      company_name: "Astra", hero_title: "Space of Creative Solutions", hero_tagline: "Full-service Creative Agency",
      cta_text: "Contact Now", cta_title: "Astra helps brands stand out with bold design and smart digital solutions.",
      rating: "4.9/5", founder_name: "Michael Rosenberg", founder_avatar: FU + "/orT9x7UayE1x097V8iC7AtEEWwc.png?width=120&height=120",
      hero_bg: FU + "/EG6XYZ2MmMQY8S3tmuTtdRWuZM.png?width=2160&height=1350",
      stat_1_num: "30", stat_1_label: "Projects launched successfully since 2008.",
      stat_2_num: "53", stat_2_label: "Percentage of fully satisfied clients.",
      stat_3_num: "1996", stat_3_label: "The year our two founders launched their first project.",
      stat_4_num: "32", stat_4_label: "Designers, strategists and engineers on the team.",
      service_1_title: "Branding and Identity", service_1_desc: "We define your voice, visuals, and vision to help your brand connect and thrive.", service_1_tags: "Visual Identity · Logo · Packaging · Guidelines", service_1_image: FU + "/KWbUrMyQLGN64dEIcCwu3B0AfE.png?width=1200&height=750",
      service_2_title: "UI/UX and Product Design", service_2_desc: "Human-centered design that turns complex ideas into elegant user experiences.", service_2_meta: "12 Projects", service_2_image: FU + "/hlWLAMCblQVt0LY90k7tcGCZh7Q.png?width=1200&height=750",
      service_3_title: "Social Media Marketing", service_3_desc: "We turn followers into fans with standout content and strategy.", service_3_meta: "25 Projects", service_3_image: FU + "/sY9Fl6C80FPCUcPjwP8eSzDfeGw.png?width=1200&height=750",
      service_4_title: "SEO Optimization", service_4_desc: "Tailored SEO solutions that improve rankings and increase clicks.", service_4_meta: "17 Projects", service_4_image: FU + "/WBe9YSOZhKj7SNbwaQMYjDGMbUQ.png?width=1200&height=750",
      project_1_title: "Linx Auto", project_1_date: "Jul 22, 2025", project_1_image: FU + "/9bIVbGzAngh4LrmuL26ovHKRBgI.png?width=900&height=675",
      project_2_title: "Sonora Sport", project_2_date: "Jun 19, 2025", project_2_image: FU + "/AySyo8uyui1PacNjRrOdDk4Ll54.png?width=900&height=675",
      project_3_title: "Zima Beauty", project_3_date: "May 17, 2024", project_3_image: FU + "/C5LABzlhRUwhEsMh1TGhcdTctU.png?width=900&height=675",
      plan_1_name: "Per Project", plan_1_price: "5,490", plan_1_f1: "Homepage + inner pages (4-5)", plan_1_f2: "Design and Development", plan_1_f3: "Mobile-Optimized Design", plan_1_f4: "Weekly support", plan_1_delivery: "3-4 weeks", price_1_image: FU + "/gPFPNiUhUdUCxbtuIiW4EUZbPQ.png?width=478&height=478",
      plan_2_name: "Monthly", plan_2_price: "2,990", plan_2_f1: "Homepage + inner pages (4-5)", plan_2_f2: "Design and Development", plan_2_f3: "Mobile-Optimized Design", plan_2_f4: "Monthly support", plan_2_delivery: "Ongoing", price_2_image: FU + "/QLREDG89Fcsr0vxBeC8l6pEsvo.png?width=478&height=478",
      review_1_name: "Mia Patakis", review_1_role: "Design Director, Summa", review_1_text: "As a startup, we needed fast, smart, and beautiful. Astra delivered all three, and then some. Incredible!", review_1_avatar: FU + "/01iF57Xct56A1osdShFbk0gZrbo.png?width=96&height=96",
      review_2_name: "Damian Bennett", review_2_role: "Founder, LINX", review_2_text: "Our social engagement doubled in less than a month after Astra took over our campaigns. Unmatched eye for design.", review_2_avatar: FU + "/4C91LAf2tFFxMxKUWDLW52FKU.png?width=96&height=96",
      review_3_name: "Theodore Blake", review_3_role: "Brand Manager, Vellox", review_3_text: "From UI/UX to product launch, Astra brought our app to life with precision and soul.", review_3_avatar: FU + "/psTaH4n9X6yZnYweo6OlRL1oag.png?width=96&height=96",
    },
  };
};

/* ───────────────────────────── 2. POWDER ───────────────────────────────── */
/* AI agent SaaS, dark sunset hills — modelled on powder.framer.website */
const powderAiAgent = (): MarketplaceTemplate => {
  const content = `<style>
.pw-page{--pw-bg:#0d0f12;--pw-fg:#f3f4f6;--pw-muted:#9aa0a8;--pw-line:rgba(255,255,255,.09);--pw-card:#16191e;background:var(--pw-bg);color:var(--pw-fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.pw-page *{box-sizing:border-box;margin:0}
.pw-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.pw-page h1,.pw-page h2,.pw-page h3{letter-spacing:-.025em;line-height:1.05;font-weight:600}
.pw-nav{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.pw-nav .logo{font-weight:600;font-size:20px;display:flex;align-items:center;gap:8px}
.pw-nav .logo .mk{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#e9c6a7,#8a93a3)}
.pw-nav nav{display:flex;gap:28px;color:var(--pw-muted);font-size:15px}
.pw-btn{display:inline-flex;align-items:center;gap:8px;background:#f3f4f6;color:#0d0f12;border-radius:999px;padding:11px 22px;font-weight:500;font-size:15px;transition:transform .25s ease}
.pw-btn:hover{transform:translateY(-2px)}
.pw-hero{position:relative;text-align:center;padding:70px 0 0;background:linear-gradient(180deg,#0d0f12 0%,#3a2f33 55%,#5b4a44 100%)}
.pw-chip{display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,.08);border:1px solid var(--pw-line);border-radius:999px;padding:7px 16px;font-size:13px;color:#d8d8de;margin-bottom:30px}
.pw-hero h1{font-size:clamp(40px,7vw,82px);font-weight:600;max-width:900px;margin:0 auto 24px}
.pw-hero p{color:#cfd2d8;font-size:18px;max-width:480px;margin:0 auto 32px}
.pw-mock{max-width:920px;margin:60px auto -120px;background:var(--pw-card);border:1px solid var(--pw-line);border-radius:24px 24px 0 0;padding:28px;box-shadow:0 -30px 80px rgba(0,0,0,.4)}
.pw-mock h3{font-size:26px;margin-bottom:6px}
.pw-mock .sub{color:var(--pw-muted);margin-bottom:22px}
.pw-input{background:#0d0f12;border:1px solid var(--pw-line);border-radius:14px;padding:18px;color:var(--pw-muted);text-align:left;font-size:15px}
.pw-tabs{display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap}
.pw-tabs span{padding:8px 16px;border-radius:999px;border:1px solid var(--pw-line);font-size:14px;color:var(--pw-muted)}
.pw-tabs span:first-child{background:#f3f4f6;color:#0d0f12;border-color:#f3f4f6}
.pw-sec{padding:clamp(80px,11vw,150px) 0}
.pw-eyebrow{text-align:center;color:var(--pw-muted);font-size:14px;margin-bottom:18px}
.pw-h2{text-align:center;font-size:clamp(30px,5vw,56px);font-weight:600;max-width:820px;margin:0 auto 18px}
.pw-lede{text-align:center;color:var(--pw-muted);max-width:560px;margin:0 auto 56px;font-size:17px}
.pw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.pw-card{background:var(--pw-card);border:1px solid var(--pw-line);border-radius:20px;padding:30px}
.pw-card h3{font-size:19px;margin-bottom:10px}
.pw-card p{color:var(--pw-muted);font-size:15px}
.pw-shots{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-top:24px}
.pw-shots img{width:100%;border-radius:18px;border:1px solid var(--pw-line)}
.pw-split{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;margin-bottom:24px}
.pw-split .txt h3{font-size:clamp(22px,3vw,32px);margin-bottom:14px}
.pw-split .txt p{color:var(--pw-muted);font-size:16px}
.pw-split img{width:100%;border-radius:20px;border:1px solid var(--pw-line)}
.pw-price{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.pw-price-card{background:var(--pw-card);border:1px solid var(--pw-line);border-radius:22px;padding:32px;display:flex;flex-direction:column;gap:16px}
.pw-price-card.feat{border-color:rgba(233,198,167,.5);background:linear-gradient(180deg,#221c1a,#16191e)}
.pw-price-card .tier{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--pw-muted)}
.pw-price-card .amt{font-size:44px;font-weight:600}
.pw-price-card .amt small{font-size:15px;color:var(--pw-muted);font-weight:400}
.pw-price-card p{color:var(--pw-muted);font-size:14px}
.pw-price-card ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:9px;color:#d8d8de;font-size:14px}
.pw-price-card ul li::before{content:"✓ ";color:#e9c6a7}
@media(max-width:900px){.pw-grid,.pw-price,.pw-shots{grid-template-columns:1fr}.pw-split{grid-template-columns:1fr}.pw-nav nav{display:none}}
</style>
<div class="pw-page">
  <section class="pw-hero">
    <div class="pw-wrap">
      <div class="pw-chip">✦ {hero_chip}</div>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <a class="pw-btn" href="#">{cta_text}</a>
      <div class="pw-mock">
        <h3>{mock_heading}</h3>
        <div class="sub">{mock_sub}</div>
        <div class="pw-input">{mock_placeholder}</div>
        <div class="pw-tabs"><span>Research</span><span>Support Ops</span><span>Writing</span><span>Actions</span></div>
      </div>
    </div>
  </section>

  <section class="pw-sec" style="padding-top:180px"><div class="pw-wrap">
    <div class="pw-eyebrow">Core Features</div>
    <h2 class="pw-h2">{features_title}</h2>
    <p class="pw-lede">{features_lede}</p>
    <div class="pw-shots">
      <img src="{feature_shot_1}" alt="Ask"/>
      <img src="{feature_shot_2}" alt="Verify"/>
      <img src="{feature_shot_3}" alt="Execute"/>
      <img src="{feature_shot_4}" alt="Measure"/>
    </div>
  </div></section>

  <section class="pw-sec" style="padding-top:0"><div class="pw-wrap">
    <div class="pw-eyebrow">Why {company_name}</div>
    <h2 class="pw-h2">{why_title}</h2>
    <p class="pw-lede">{why_lede}</p>
    <div class="pw-grid">
      <div class="pw-card"><h3>{why_1_title}</h3><p>{why_1_desc}</p></div>
      <div class="pw-card"><h3>{why_2_title}</h3><p>{why_2_desc}</p></div>
      <div class="pw-card"><h3>{why_3_title}</h3><p>{why_3_desc}</p></div>
      <div class="pw-card"><h3>{why_4_title}</h3><p>{why_4_desc}</p></div>
      <div class="pw-card"><h3>{why_5_title}</h3><p>{why_5_desc}</p></div>
      <div class="pw-card"><h3>{why_6_title}</h3><p>{why_6_desc}</p></div>
    </div>
  </div></section>

  <section class="pw-sec" style="padding-top:0"><div class="pw-wrap">
    <div class="pw-eyebrow">What you get</div>
    <h2 class="pw-h2">{get_title}</h2>
    <p class="pw-lede">{get_lede}</p>
    <div class="pw-split">
      <div class="txt"><h3>{split_1_title}</h3><p>{split_1_desc}</p></div>
      <img src="{split_1_image}" alt=""/>
    </div>
    <div class="pw-split">
      <img src="{split_2_image}" alt=""/>
      <div class="txt"><h3>{split_2_title}</h3><p>{split_2_desc}</p></div>
    </div>
  </div></section>

  <section class="pw-sec" style="padding-top:0"><div class="pw-wrap">
    <div class="pw-eyebrow">Pricing</div>
    <h2 class="pw-h2">{pricing_title}</h2>
    <p class="pw-lede">{pricing_lede}</p>
    <div class="pw-price">
      <div class="pw-price-card"><div class="tier">{plan_1_tier}</div><div class="amt">{plan_1_price}</div><p>{plan_1_desc}</p><ul><li>{plan_1_f1}</li><li>{plan_1_f2}</li><li>{plan_1_f3}</li></ul><a class="pw-btn" href="#">Get Started</a></div>
      <div class="pw-price-card feat"><div class="tier">{plan_2_tier}</div><div class="amt">{plan_2_price}<small>/mo</small></div><p>{plan_2_desc}</p><ul><li>{plan_2_f1}</li><li>{plan_2_f2}</li><li>{plan_2_f3}</li></ul><a class="pw-btn" href="#">Get Started</a></div>
      <div class="pw-price-card"><div class="tier">{plan_3_tier}</div><div class="amt">{plan_3_price}</div><p>{plan_3_desc}</p><ul><li>{plan_3_f1}</li><li>{plan_3_f2}</li><li>{plan_3_f3}</li></ul><a class="pw-btn" href="#">Contact Sales</a></div>
    </div>
  </div></section>
</div>`;

  return {
    id: "powder-ai-agent",
    name: "Powder AI Agent SaaS",
    description: "Sleek dark AI-agent SaaS landing with sunset-gradient hero, chat mockup, feature screenshot grid, 'why' cards, alternating feature splits and 3-tier pricing. Modelled 1:1 on the Powder Framer template.",
    content,
    variables: [
      "{company_name}", "{cta_text}", "{hero_chip}", "{hero_title}", "{hero_subtitle}", "{mock_heading}", "{mock_sub}", "{mock_placeholder}",
      "{features_title}", "{features_lede}", "{feature_shot_1}", "{feature_shot_2}", "{feature_shot_3}", "{feature_shot_4}",
      "{why_title}", "{why_lede}", "{why_1_title}", "{why_1_desc}", "{why_2_title}", "{why_2_desc}", "{why_3_title}", "{why_3_desc}", "{why_4_title}", "{why_4_desc}", "{why_5_title}", "{why_5_desc}", "{why_6_title}", "{why_6_desc}",
      "{get_title}", "{get_lede}", "{split_1_title}", "{split_1_desc}", "{split_1_image}", "{split_2_title}", "{split_2_desc}", "{split_2_image}",
      "{pricing_title}", "{pricing_lede}",
      "{plan_1_tier}", "{plan_1_price}", "{plan_1_desc}", "{plan_1_f1}", "{plan_1_f2}", "{plan_1_f3}",
      "{plan_2_tier}", "{plan_2_price}", "{plan_2_desc}", "{plan_2_f1}", "{plan_2_f2}", "{plan_2_f3}",
      "{plan_3_tier}", "{plan_3_price}", "{plan_3_desc}", "{plan_3_f1}", "{plan_3_f2}", "{plan_3_f3}",
    ],
    category: "saas",
    tags: ["ai", "saas", "agent", "dark", "startup"],
    author: "Community", downloads: 1021, rating: 4.9,
    seo_title_pattern: "{company_name} — {hero_title}",
    seo_description_pattern: "{hero_subtitle} {company_name} turns conversation into execution with trusted answers and instant actions.",
    slug_pattern: "{company_name}-ai-agent",
    schema_type: "SoftwareApplication",
    platform: "generic",
    defaultValues: {
      company_name: "Powder", cta_text: "Get started",
      hero_chip: "New: Saved answers and collections",
      hero_title: "Solid AI agent that turns chats into outcomes",
      hero_subtitle: "Ask anything, get verified answers, and trigger actions in seconds.",
      mock_heading: "Welcome back", mock_sub: "How can I help you today, Alex?", mock_placeholder: "Ask anything. Type @ for mentions and / for shortcuts.",
      features_title: "One unified platform to run your entire organization",
      features_lede: "Powder is an AI agent that turns conversation into execution, delivering clear answers in seconds.",
      feature_shot_1: FU + "/ZCUolRzdTgZF2qcr3flePPx2dk.jpg?width=1600&height=900",
      feature_shot_2: FU + "/v9Yr4trFZsygSFKIZye6oMUY4.jpg?width=1600&height=900",
      feature_shot_3: FU + "/hg3Tg24LlqTuZEp7hHXSGwPQ9U.jpg?width=1600&height=900",
      feature_shot_4: FU + "/eFufq0tptTi9Qq7gFHic5a5E.jpg?width=1600&height=900",
      why_title: "One AI agent for answers, actions, and momentum",
      why_lede: "Powder brings knowledge, context, and execution into a single handy interface.",
      why_1_title: "Shared context", why_1_desc: "Bring docs, tools, and team knowledge into one place.",
      why_2_title: "Trusted answers", why_2_desc: "Get clear responses with sources and useful context.",
      why_3_title: "Instant action", why_3_desc: "Turn prompts into tickets, replies, drafts, and next steps.",
      why_4_title: "Built-in control", why_4_desc: "Keep work aligned with policies, access, and approvals.",
      why_5_title: "Continuous insight", why_5_desc: "Spot patterns, gaps, and ways to improve faster.",
      why_6_title: "Audit & insights", why_6_desc: "Track every change and surface clear signals from real conversations.",
      get_title: "Ask a question and get real progress",
      get_lede: "Powder helps teams find the right context, take the next step, and improve how work gets done.",
      split_1_title: "Bring docs, tools, and team knowledge into one place", split_1_desc: "Connect the information your team relies on, so every answer starts with the right context. One source of truth for every reply.", split_1_image: FU + "/D7e4TugadmJTFjHpPSKhXEtOnk.jpg?width=1200&height=1270",
      split_2_title: "Turn prompts into tickets, drafts, and next steps", split_2_desc: "Move work forward directly from the chat, without jumping between tools or losing momentum. From question to action in one flow.", split_2_image: FU + "/egCROtkGjJt43Q9SunwaHjvGUL4.jpg?width=1200&height=1270",
      pricing_title: "Clear pricing plans that scale with you",
      pricing_lede: "Start free and upgrade as your team grows. No hidden fees.",
      plan_1_tier: "Starter", plan_1_price: "Free", plan_1_desc: "For small teams getting started with AI support.", plan_1_f1: "Up to 3 team members", plan_1_f2: "200 AI queries / mo", plan_1_f3: "2 integrations",
      plan_2_tier: "Basic", plan_2_price: "$19", plan_2_desc: "For growing teams that need more scale.", plan_2_f1: "Unlimited team members", plan_2_f2: "Unlimited AI queries", plan_2_f3: "Source attribution & history",
      plan_3_tier: "Enterprise", plan_3_price: "Custom", plan_3_desc: "For orgs with advanced security and scale needs.", plan_3_f1: "Unlimited integrations", plan_3_f2: "Approval gates & audit", plan_3_f3: "Dedicated support & SSO",
    },
  };
};

/* ───────────────────────────── 3. FABRICA ──────────────────────────────── */
/* Black & white brutalist creative studio — modelled on fabrica.framer.media */
const fabricaStudio = (): MarketplaceTemplate => {
  const content = `<style>
.fb-page{--fb-bg:#0a0a0a;--fb-fg:#f4f4f2;--fb-muted:#8d8d8a;--fb-line:rgba(255,255,255,.12);background:var(--fb-bg);color:var(--fb-fg);font-family:'Inter',system-ui,sans-serif;line-height:1.45;overflow:hidden}
.fb-page *{box-sizing:border-box;margin:0}
.fb-wrap{max-width:1280px;margin:0 auto;padding:0 24px}
.fb-page h1,.fb-page h2,.fb-page h3{letter-spacing:-.03em;line-height:1;font-weight:700}
.fb-nav{display:flex;justify-content:space-between;align-items:center;padding:24px 0;font-size:15px}
.fb-nav .brand{font-weight:700}
.fb-nav nav{display:flex;gap:34px;color:var(--fb-muted)}
.fb-hero{position:relative;min-height:86vh;display:flex;align-items:center;justify-content:center;text-align:center;background:url('{hero_bg}') center/cover;border-radius:0}
.fb-hero::before{content:"";position:absolute;inset:0;background:rgba(0,0,0,.35)}
.fb-hero .big{position:relative;font-size:clamp(80px,22vw,320px);font-weight:700;color:#fff;letter-spacing:-.05em;line-height:.85}
.fb-hero .big sup{font-size:.16em;vertical-align:super}
.fb-hero .lbl{position:absolute;bottom:36px;left:24px;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:.12em;z-index:2}
.fb-statement{padding:clamp(70px,10vw,140px) 0}
.fb-statement h2{font-size:clamp(28px,4.5vw,58px);font-weight:600;max-width:1100px}
.fb-sec{padding:clamp(60px,8vw,120px) 0;border-top:1px solid var(--fb-line)}
.fb-eyebrow{color:var(--fb-muted);font-size:13px;text-transform:uppercase;letter-spacing:.16em;margin-bottom:30px;display:flex;justify-content:space-between}
.fb-clients{display:flex;flex-wrap:wrap;gap:48px;align-items:center;opacity:.7;font-size:22px;font-weight:600}
.fb-proj{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.fb-proj-card{position:relative;border:1px solid var(--fb-line);border-radius:14px;overflow:hidden}
.fb-proj-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.fb-proj-card .cap{display:flex;justify-content:space-between;padding:18px 20px;font-weight:600}
.fb-proj-card .cap span{color:var(--fb-muted);font-weight:400}
.fb-why{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.fb-why img{width:100%;border-radius:14px}
.fb-why h2{font-size:clamp(28px,4vw,52px);font-weight:600;margin-bottom:20px}
.fb-why p{color:var(--fb-muted);font-size:17px;max-width:460px}
.fb-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-top:48px}
.fb-stat{border:1px solid var(--fb-line);border-radius:14px;padding:30px}
.fb-stat .n{font-size:clamp(40px,6vw,72px);font-weight:700}
.fb-stat p{color:var(--fb-muted);font-size:14px;margin-top:8px}
.fb-srv{border-top:1px solid var(--fb-line);padding:36px 0;display:grid;grid-template-columns:60px 1fr 1.2fr;gap:32px;align-items:start}
.fb-srv .num{color:var(--fb-muted);font-size:14px}
.fb-srv h3{font-size:clamp(24px,3vw,40px);font-weight:600}
.fb-srv .imgs{display:flex;gap:10px;margin-top:16px}
.fb-srv .imgs img{width:70px;height:70px;border-radius:10px;object-fit:cover}
.fb-srv p{color:var(--fb-muted);font-size:16px}
.fb-srv .cats{margin-top:16px;color:var(--fb-muted);font-size:14px}
.fb-cta{text-align:center;padding:clamp(80px,12vw,180px) 0;border-top:1px solid var(--fb-line)}
.fb-cta h2{font-size:clamp(36px,7vw,90px);font-weight:700;margin-bottom:28px}
.fb-btn{display:inline-block;background:#f4f4f2;color:#0a0a0a;border-radius:999px;padding:15px 34px;font-weight:600;transition:transform .25s ease}
.fb-btn:hover{transform:translateY(-2px)}
@media(max-width:900px){.fb-proj,.fb-why,.fb-stats{grid-template-columns:1fr}.fb-srv{grid-template-columns:1fr}.fb-nav nav{display:none}}
</style>
<div class="fb-page">
  <section class="fb-hero">
    <div class="big">{company_name}<sup>®</sup></div>
    <div class="lbl">{hero_label}</div>
  </section>

  <section class="fb-statement"><div class="fb-wrap">
    <h2>{statement}</h2>
  </div></section>

  <section class="fb-sec"><div class="fb-wrap">
    <div class="fb-eyebrow"><span>Our clients</span><span>{clients_years}</span></div>
    <div class="fb-clients"><span>Lummi</span><span>Sonoma</span><span>LINX</span><span>Vellox</span><span>Boltshift</span><span>Ephemeral</span></div>
  </div></section>

  <section class="fb-sec"><div class="fb-wrap">
    <div class="fb-eyebrow"><span>Projects</span><span>{projects_count}</span></div>
    <p style="color:var(--fb-muted);max-width:560px;margin-bottom:40px">{projects_lede}</p>
    <div class="fb-proj">
      <div class="fb-proj-card"><img src="{project_1_image}" alt="{project_1_title}"/><div class="cap"><span>{project_1_title}</span><span>{project_1_year}</span></div></div>
      <div class="fb-proj-card"><img src="{project_2_image}" alt="{project_2_title}"/><div class="cap"><span>{project_2_title}</span><span>{project_2_year}</span></div></div>
      <div class="fb-proj-card"><img src="{project_3_image}" alt="{project_3_title}"/><div class="cap"><span>{project_3_title}</span><span>{project_3_year}</span></div></div>
      <div class="fb-proj-card"><img src="{project_4_image}" alt="{project_4_title}"/><div class="cap"><span>{project_4_title}</span><span>{project_4_year}</span></div></div>
    </div>
  </div></section>

  <section class="fb-sec"><div class="fb-wrap">
    <div class="fb-eyebrow"><span>Why choose us</span></div>
    <div class="fb-why">
      <div>
        <h2>{why_title}</h2>
        <p>{why_desc}</p>
        <a class="fb-btn" href="#contact" style="margin-top:28px">{cta_text}</a>
      </div>
      <img src="{why_image}" alt=""/>
    </div>
    <div class="fb-stats">
      <div class="fb-stat"><div class="n">{stat_1_num}</div><p>{stat_1_label}</p></div>
      <div class="fb-stat"><div class="n">{stat_2_num}</div><p>{stat_2_label}</p></div>
    </div>
  </div></section>

  <section class="fb-sec"><div class="fb-wrap">
    <div class="fb-eyebrow"><span>What we do</span><span>(4)</span></div>
    <div class="fb-srv"><div class="num">(001)</div><div><h3>{service_1_title}</h3><div class="imgs"><img src="{service_1_image}" alt=""/></div></div><div><p>{service_1_desc}</p><div class="cats">{service_1_cats}</div></div></div>
    <div class="fb-srv"><div class="num">(002)</div><div><h3>{service_2_title}</h3><div class="imgs"><img src="{service_2_image}" alt=""/></div></div><div><p>{service_2_desc}</p><div class="cats">{service_2_cats}</div></div></div>
    <div class="fb-srv"><div class="num">(003)</div><div><h3>{service_3_title}</h3><div class="imgs"><img src="{service_3_image}" alt=""/></div></div><div><p>{service_3_desc}</p><div class="cats">{service_3_cats}</div></div></div>
    <div class="fb-srv"><div class="num">(004)</div><div><h3>{service_4_title}</h3><div class="imgs"><img src="{service_4_image}" alt=""/></div></div><div><p>{service_4_desc}</p><div class="cats">{service_4_cats}</div></div></div>
  </div></section>

  <section class="fb-cta" id="contact"><div class="fb-wrap">
    <h2>{cta_title}</h2>
    <a class="fb-btn" href="#">{cta_text}</a>
  </div></section>
</div>`;

  return {
    id: "fabrica-studio",
    name: "Fabrica Creative Studio",
    description: "Bold black-and-white brutalist creative-studio site — oversized logotype hero, statement, client strip, project grid, why-choose split with stats and a numbered services list. Modelled 1:1 on the Fabrica Framer template.",
    content,
    variables: [
      "{company_name}", "{hero_label}", "{hero_bg}", "{statement}", "{projects_count}", "{clients_years}", "{projects_lede}", "{cta_text}", "{cta_title}",
      "{project_1_title}", "{project_1_year}", "{project_1_image}", "{project_2_title}", "{project_2_year}", "{project_2_image}", "{project_3_title}", "{project_3_year}", "{project_3_image}", "{project_4_title}", "{project_4_year}", "{project_4_image}",
      "{why_title}", "{why_desc}", "{why_image}", "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}",
      "{service_1_title}", "{service_1_desc}", "{service_1_cats}", "{service_1_image}",
      "{service_2_title}", "{service_2_desc}", "{service_2_cats}", "{service_2_image}",
      "{service_3_title}", "{service_3_desc}", "{service_3_cats}", "{service_3_image}",
      "{service_4_title}", "{service_4_desc}", "{service_4_cats}", "{service_4_image}",
    ],
    category: "business",
    tags: ["studio", "creative", "agency", "portfolio", "minimal"],
    author: "Community", downloads: 658, rating: 4.8,
    seo_title_pattern: "{company_name}® — Creative Studio",
    seo_description_pattern: "{statement}",
    slug_pattern: "{company_name}-studio",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      company_name: "fabrica", hero_label: "Studio · Branding · Web · SEO", hero_bg: FU + "/TQUaM9GTresksymLH16ncQaPo.jpg?width=1500&height=1080",
      statement: "No generic websites. No empty marketing promises. Just tools and strategies that help your business grow and your brand shine.",
      projects_count: "27", clients_years: "(2016-25©)",
      projects_lede: "We've helped businesses across industries achieve their goals. Here are some of our recent projects.",
      cta_text: "Let's talk", cta_title: "Your digital journey begins with a conversation.",
      project_1_title: "Boltshift", project_1_year: "2025", project_1_image: FU + "/TQUaM9GTresksymLH16ncQaPo.jpg?width=900&height=648",
      project_2_title: "Ephemeral", project_2_year: "2025", project_2_image: FU + "/r3DvXiPExOamPrqqTNfWM1K9o4.jpg?width=900&height=648",
      project_3_title: "Powersurge", project_3_year: "2024", project_3_image: FU + "/UPqJOHQLdYtNuK2jee5437Lno.jpg?width=900&height=648",
      project_4_title: "Mastermail", project_4_year: "2024", project_4_image: FU + "/HlvuJF9yIQ3Q8fP86EjFIq5ExE.jpg?width=900&height=648",
      why_title: "Proven results for every project, with a focus on design and functionality.",
      why_desc: "No fluff, just results. Thoughtful design and tools that make your work easier. We focus on smart design and useful features, project after project.",
      why_image: FU + "/KL17tuoYHz5TzXCqskqaMY5Iw0.jpg?width=850&height=1100",
      stat_1_num: "50+", stat_1_label: "Successful projects completed that help companies generate real results.",
      stat_2_num: "98%", stat_2_label: "Customer satisfaction rate across every engagement.",
      service_1_title: "Web design and development", service_1_desc: "Modern, responsive, and user-friendly websites designed to engage visitors and drive conversions.", service_1_cats: "Logo · Rebranding · Typography · Guidelines · Visual identity", service_1_image: FU + "/vGSJoy0fkCYvuK5CETUzS64NNo.jpg?width=200&height=200",
      service_2_title: "Social media marketing", service_2_desc: "Strategic, data-driven social media campaigns designed to build brand awareness and connect with your audience.", service_2_cats: "Content strategy · Community · Paid ads · Analytics", service_2_image: FU + "/DsMKi7qE5JNWO5UQxmeqZGDSOI.jpg?width=200&height=200",
      service_3_title: "SEO and content marketing", service_3_desc: "Comprehensive search optimization and engaging content that increases visibility and drives organic traffic.", service_3_cats: "Keyword research · On-page · Content · Link building", service_3_image: FU + "/qQlR5lTiRYzT2lPzSWLLVkcgH6Y.jpg?width=200&height=200",
      service_4_title: "Branding and identity", service_4_desc: "Distinctive, memorable brand experiences that communicate your values and create emotional connections.", service_4_cats: "Brand strategy · Identity · Packaging · Guidelines", service_4_image: FU + "/9hTP0obDSaEcVCyC5kaHbx7FfI.jpg?width=200&height=200",
    },
  };
};

/* ───────────────────────────── 4. HANZO ────────────────────────────────── */
/* Light, minimal "unlimited design" studio subscription — hanzo.framer.website */
const hanzoDesignStudio = (): MarketplaceTemplate => {
  const content = `<style>
.hz-page{--hz-bg:#f4f4f3;--hz-fg:#121212;--hz-muted:#7a7a78;--hz-line:rgba(0,0,0,.1);--hz-card:#fff;background:var(--hz-bg);color:var(--hz-fg);font-family:'Inter',system-ui,sans-serif;line-height:1.5;overflow:hidden}
.hz-page *{box-sizing:border-box;margin:0}
.hz-wrap{max-width:1200px;margin:0 auto;padding:0 24px}
.hz-page h1,.hz-page h2,.hz-page h3{letter-spacing:-.03em;line-height:1.02;font-weight:600}
.hz-nav{display:flex;justify-content:space-between;align-items:center;padding:24px 0}
.hz-nav .brand{font-weight:700;font-size:20px;background:#fff;padding:8px 18px;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.06)}
.hz-burger{width:42px;height:42px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.06)}
.hz-hero{text-align:center;padding:60px 0 80px}
.hz-chip{display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:9px 18px;font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.06);margin-bottom:34px}
.hz-chip .dot{width:8px;height:8px;border-radius:50%;background:#3fb950}
.hz-hero h1{font-size:clamp(44px,8vw,104px);font-weight:600;letter-spacing:-.04em;line-height:.95}
.hz-hero h1 .g{color:#b6b6b3}
.hz-hero p{color:var(--hz-muted);font-size:19px;max-width:430px;margin:26px auto 34px}
.hz-cta-row{display:flex;align-items:center;justify-content:center;gap:18px;flex-wrap:wrap}
.hz-btn{display:inline-flex;align-items:center;gap:10px;background:#121212;color:#fff;border-radius:999px;padding:15px 30px;font-weight:500;box-shadow:0 10px 30px rgba(0,0,0,.18);transition:transform .25s ease}
.hz-btn:hover{transform:translateY(-2px)}
.hz-avatars{display:flex;align-items:center}
.hz-avatars img{width:38px;height:38px;border-radius:50%;border:2px solid var(--hz-bg);margin-left:-10px;object-fit:cover}
.hz-avatars span{margin-left:12px;color:var(--hz-muted);font-size:13px}
.hz-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:60px}
.hz-gallery img{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:18px}
.hz-sec{padding:clamp(70px,9vw,130px) 0}
.hz-eyebrow{color:var(--hz-muted);font-style:italic;font-size:16px;margin-bottom:16px;text-align:center}
.hz-h2{text-align:center;font-size:clamp(30px,5vw,56px);font-weight:600;margin-bottom:56px}
.hz-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.hz-step{background:var(--hz-card);border-radius:20px;padding:32px;box-shadow:0 8px 30px rgba(0,0,0,.05)}
.hz-step .num{font-size:14px;color:var(--hz-muted)}
.hz-step h3{font-size:24px;margin:14px 0 10px}
.hz-step p{color:var(--hz-muted)}
.hz-rev{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.hz-rev-card{background:var(--hz-card);border-radius:20px;padding:32px;box-shadow:0 8px 30px rgba(0,0,0,.05)}
.hz-rev-card .who{display:flex;align-items:center;gap:14px;margin-bottom:20px}
.hz-rev-card img{width:50px;height:50px;border-radius:50%;object-fit:cover}
.hz-rev-card .who b{display:block}
.hz-rev-card .who span{color:var(--hz-muted);font-size:13px}
.hz-rev-card p{font-size:18px;font-weight:500}
.hz-work{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.hz-work-card{border-radius:20px;overflow:hidden;background:var(--hz-card);box-shadow:0 8px 30px rgba(0,0,0,.05)}
.hz-work-card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.hz-work-card .cap{padding:20px;display:flex;justify-content:space-between;align-items:center}
.hz-work-card .cap b{font-size:20px}
.hz-work-card .cap span{color:var(--hz-muted);font-size:13px}
.hz-founder{display:grid;grid-template-columns:1fr 1.3fr;gap:48px;align-items:center}
.hz-founder img{width:100%;border-radius:20px}
.hz-founder h3{font-size:clamp(22px,2.6vw,30px);font-weight:500;line-height:1.3}
.hz-founder .name{font-weight:600;margin-top:24px}
.hz-founder .role{color:var(--hz-muted);font-size:14px}
.hz-price{max-width:620px;margin:0 auto;background:#121212;color:#fff;border-radius:28px;padding:44px;text-align:center}
.hz-price .tier{font-size:14px;color:#9a9a98;text-transform:uppercase;letter-spacing:.12em}
.hz-price .amt{font-size:64px;font-weight:600;margin:14px 0}
.hz-price .amt small{font-size:18px;color:#9a9a98;font-weight:400}
.hz-price ul{list-style:none;padding:0;margin:24px 0;display:flex;flex-direction:column;gap:11px;color:#d6d6d4;text-align:left;max-width:340px;margin-left:auto;margin-right:auto}
.hz-price ul li::before{content:"✓ ";color:#3fb950}
.hz-price .hz-btn{background:#fff;color:#121212}
@media(max-width:900px){.hz-gallery,.hz-steps{grid-template-columns:1fr}.hz-rev,.hz-work{grid-template-columns:1fr}.hz-founder{grid-template-columns:1fr}}
</style>
<div class="hz-page">
  <section class="hz-hero"><div class="hz-wrap">
    <div class="hz-chip"><span class="dot"></span>{hero_chip}</div>
    <h1>{hero_line_1} <span class="g">{hero_line_2}</span></h1>
    <p>{hero_subtitle}</p>
    <div class="hz-cta-row">
      <a class="hz-btn" href="#pricing">{cta_text} →</a>
      <div class="hz-avatars"><img src="{avatar_1}" alt=""/><img src="{avatar_2}" alt=""/><img src="{avatar_3}" alt=""/><img src="{avatar_4}" alt=""/><span>{trust_label}</span></div>
    </div>
    <div class="hz-gallery">
      <img src="{gallery_1}" alt=""/><img src="{gallery_2}" alt=""/><img src="{gallery_3}" alt=""/>
    </div>
  </div></section>

  <section class="hz-sec"><div class="hz-wrap">
    <div class="hz-eyebrow">{process_eyebrow}</div>
    <h2 class="hz-h2">{process_title}</h2>
    <div class="hz-steps">
      <div class="hz-step"><div class="num">1</div><h3>{step_1_title}</h3><p>{step_1_desc}</p></div>
      <div class="hz-step"><div class="num">2</div><h3>{step_2_title}</h3><p>{step_2_desc}</p></div>
      <div class="hz-step"><div class="num">3</div><h3>{step_3_title}</h3><p>{step_3_desc}</p></div>
    </div>
  </div></section>

  <section class="hz-sec" style="padding-top:0"><div class="hz-wrap">
    <div class="hz-rev">
      <div class="hz-rev-card"><div class="who"><img src="{review_1_avatar}" alt=""/><div><b>{review_1_name}</b><span>{review_1_role}</span></div></div><p>{review_1_text}</p></div>
      <div class="hz-rev-card"><div class="who"><img src="{review_2_avatar}" alt=""/><div><b>{review_2_name}</b><span>{review_2_role}</span></div></div><p>{review_2_text}</p></div>
    </div>
  </div></section>

  <section class="hz-sec" style="padding-top:0" id="work"><div class="hz-wrap">
    <div class="hz-eyebrow">{work_eyebrow}</div>
    <h2 class="hz-h2">{work_title}</h2>
    <div class="hz-work">
      <div class="hz-work-card"><img src="{work_1_image}" alt="{work_1_title}"/><div class="cap"><b>{work_1_title}</b><span>{work_1_tags}</span></div></div>
      <div class="hz-work-card"><img src="{work_2_image}" alt="{work_2_title}"/><div class="cap"><b>{work_2_title}</b><span>{work_2_tags}</span></div></div>
      <div class="hz-work-card"><img src="{work_3_image}" alt="{work_3_title}"/><div class="cap"><b>{work_3_title}</b><span>{work_3_tags}</span></div></div>
      <div class="hz-work-card"><img src="{work_4_image}" alt="{work_4_title}"/><div class="cap"><b>{work_4_title}</b><span>{work_4_tags}</span></div></div>
    </div>
  </div></section>

  <section class="hz-sec" style="padding-top:0"><div class="hz-wrap">
    <div class="hz-eyebrow">{founder_eyebrow}</div>
    <h2 class="hz-h2">{founder_title}</h2>
    <div class="hz-founder">
      <img src="{founder_image}" alt="{founder_name}"/>
      <div>
        <h3>{founder_bio}</h3>
        <div class="name">{founder_name}</div>
        <div class="role">{founder_role}</div>
      </div>
    </div>
  </div></section>

  <section class="hz-sec" style="padding-top:0" id="pricing"><div class="hz-wrap">
    <div class="hz-eyebrow">{pricing_eyebrow}</div>
    <h2 class="hz-h2">{pricing_title}</h2>
    <div class="hz-price">
      <div class="tier">{plan_name}</div>
      <div class="amt">{plan_price}<small>/mo</small></div>
      <ul><li>{plan_f1}</li><li>{plan_f2}</li><li>{plan_f3}</li><li>{plan_f4}</li><li>{plan_f5}</li></ul>
      <a class="hz-btn" href="#">{cta_text}</a>
    </div>
  </div></section>
</div>`;

  return {
    id: "hanzo-design-studio",
    name: "Hanzo Design Subscription",
    description: "Light, premium 'unlimited design' studio subscription landing — soft hero with trust avatars, image gallery, 3-step process, testimonials, case-study grid, founder bio and a single bold pricing card. Modelled 1:1 on the Hanzo Framer template.",
    content,
    variables: [
      "{company_name}", "{hero_chip}", "{hero_line_1}", "{hero_line_2}", "{hero_subtitle}", "{cta_text}", "{trust_label}",
      "{avatar_1}", "{avatar_2}", "{avatar_3}", "{avatar_4}", "{gallery_1}", "{gallery_2}", "{gallery_3}",
      "{process_eyebrow}", "{process_title}", "{step_1_title}", "{step_1_desc}", "{step_2_title}", "{step_2_desc}", "{step_3_title}", "{step_3_desc}",
      "{review_1_name}", "{review_1_role}", "{review_1_text}", "{review_1_avatar}", "{review_2_name}", "{review_2_role}", "{review_2_text}", "{review_2_avatar}",
      "{work_eyebrow}", "{work_title}", "{work_1_title}", "{work_1_tags}", "{work_1_image}", "{work_2_title}", "{work_2_tags}", "{work_2_image}", "{work_3_title}", "{work_3_tags}", "{work_3_image}", "{work_4_title}", "{work_4_tags}", "{work_4_image}",
      "{founder_eyebrow}", "{founder_title}", "{founder_image}", "{founder_name}", "{founder_role}", "{founder_bio}",
      "{pricing_eyebrow}", "{pricing_title}", "{plan_name}", "{plan_price}", "{plan_f1}", "{plan_f2}", "{plan_f3}", "{plan_f4}", "{plan_f5}",
    ],
    category: "business",
    tags: ["design", "studio", "subscription", "agency", "minimal"],
    author: "Community", downloads: 889, rating: 4.9,
    seo_title_pattern: "{company_name} — {hero_line_1} {hero_line_2}",
    seo_description_pattern: "{hero_subtitle} {company_name} delivers unlimited design for startups and brands.",
    slug_pattern: "{company_name}-design-studio",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      company_name: "Hanzo", hero_chip: "Booking Open — 2 Spots Left", hero_line_1: "Unlimited Design for", hero_line_2: "Solid Startups",
      hero_subtitle: "We help startups and brands create beautiful, functional products — fast and hassle-free.",
      cta_text: "Choose your plan", trust_label: "Trusted by Leaders",
      avatar_1: FU + "/670uUrkwoRnzhCl9b3kEMwUmgE4.jpg?width=80&height=80", avatar_2: FU + "/J4Ox47KYv4g8Lb2C0PXNkjDaA.jpg?width=80&height=80", avatar_3: FU + "/9nNEv94U4EwW3ZkcswuOBMt2jk.jpg?width=80&height=80", avatar_4: FU + "/cpbJvQoTTkomFOd8RSNsHF3b8.jpg?width=80&height=80",
      gallery_1: FU + "/75ILrhKQhUkwU1dH15BUDezAQ.png?width=900&height=600", gallery_2: FU + "/EgbF2rgcHm4Q19cR6VXfj7f5awk.png?width=900&height=600", gallery_3: FU + "/etglVFVv5e7VnmUVyHsNK3oyIbI.png?width=900&height=600",
      process_eyebrow: "Our Process, Explained", process_title: "Here's how it works",
      step_1_title: "Subscribe", step_1_desc: "Choose a plan and request as many designs as you need.",
      step_2_title: "Request", step_2_desc: "Send your briefs through our board — one at a time, no limits.",
      step_3_title: "Get Your Designs", step_3_desc: "Receive your designs within a few days, on average.",
      review_1_name: "Sophie Lemaire", review_1_role: "Product Lead at Loomi", review_1_text: "Working with Hanzo was a game-changer. They instantly understood our vision and translated it into a sleek, intuitive product.", review_1_avatar: FU + "/GQYbkjoIOqJZo9gC9bpE4YLn18.png?width=100&height=100",
      review_2_name: "Milan Bakker", review_2_role: "Founder of Drifted Studio", review_2_text: "Hanzo brings clarity to chaos. The design work is not only beautiful but deeply strategic — our audience response has been incredible.", review_2_avatar: FU + "/TjQr3Mj8oNK6Ndfogb5IMNxXGg.png?width=100&height=100",
      work_eyebrow: "Our Projects", work_title: "Recent Case Studies",
      work_1_title: "Strida", work_1_tags: "Portfolio · Sidebar", work_1_image: FU + "/aLickQcDkn7JlTftxkq33tHE.jpg?width=1200&height=900",
      work_2_title: "Bravo", work_2_tags: "UI/UX · App", work_2_image: FU + "/ISAjHKBwJV6BJzD55lhE8XAFBM.jpg?width=1200&height=900",
      work_3_title: "Nitro", work_3_tags: "Design System · Web", work_3_image: FU + "/nT9mTBoP2h9YdschdGP72ovRHk.jpg?width=1200&height=900",
      work_4_title: "Fargo", work_4_tags: "SaaS · Web", work_4_image: FU + "/vzQsCEYy7zN2RmDQcgrizz0O0MI.jpg?width=1200&height=900",
      founder_eyebrow: "About", founder_title: "Pushing boundaries since 2011",
      founder_image: FU + "/zRVCa2eOgJIf1mJK5PYcBLrYI.png?width=900&height=600", founder_name: "Joris van Dijk", founder_role: "Hanzo Studio, Founder",
      founder_bio: "A Dutch designer known for minimalist, expressive digital work. He helps startups and studios create clean interfaces and strong branding — blending function with emotion.",
      pricing_eyebrow: "Pricing", pricing_title: "Fixed Price, Zero Limits",
      plan_name: "Monthly", plan_price: "$7,500", plan_f1: "Unlimited design requests", plan_f2: "One request at a time", plan_f3: "Avg. 48-hour delivery", plan_f4: "Unlimited revisions", plan_f5: "Pause or cancel anytime",
    },
  };
};

export const FRAMER_TEMPLATES: MarketplaceTemplate[] = [
  astralabAgency(),
  powderAiAgent(),
  fabricaStudio(),
  hanzoDesignStudio(),
];
