// Framer-modelled marketplace templates — Batch 4 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 19. MEDI — Health clinic ─────────────────────── */
const mediClinic = (): MarketplaceTemplate => {
  const content = `<style>
.md{--bg:#f4f8f9;--fg:#0d2b33;--muted:#5b7a82;--line:#dce8ea;--ac:#0fb5a3;--ac2:#0a8f8f;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.md *{box-sizing:border-box;margin:0}
.md-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.md h1,.md h2,.md h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.md-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,128px) 0}
.md-eye{display:inline-block;color:var(--ac2);background:rgba(15,181,163,.1);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.md-hero h1{font-size:clamp(38px,6vw,68px);margin-bottom:20px}
.md-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:28px}
.md-cta{display:flex;gap:14px;flex-wrap:wrap}
.md-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.md-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 36px rgba(15,181,163,.3)}
.md-btn-p:hover{transform:translateY(-2px)}
.md-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.md-hero img{width:100%;border-radius:24px;aspect-ratio:4/3.4;object-fit:cover;box-shadow:0 30px 70px rgba(13,43,51,.16)}
.md-sec{padding:clamp(54px,8vw,100px) 0}
.md-head{text-align:center;max-width:640px;margin:0 auto 48px}
.md-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.md-head p{color:var(--muted);font-size:17px}
.md-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.md-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px;transition:.25s}
.md-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(13,43,51,.1)}
.md-card .ic{width:52px;height:52px;border-radius:14px;background:rgba(15,181,163,.12);display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:18px}
.md-card h3{font-size:20px;margin-bottom:10px}
.md-card p{color:var(--muted);font-size:15px}
.md-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:24px;padding:48px 32px;color:#fff}
.md-stats .st{text-align:center}
.md-stats .st b{display:block;font-size:clamp(30px,4vw,46px);font-weight:800}
.md-stats .st span{opacity:.85;font-size:14px}
.md-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.md-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.md-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.md-hero{grid-template-columns:1fr}.md-grid{grid-template-columns:1fr}.md-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="md">
  <section class="md-wrap md-hero">
    <div>
      <span class="md-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="md-cta"><a class="md-btn md-btn-p" href="#">{cta_primary}</a><a class="md-btn md-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="md-sec"><div class="md-wrap">
    <div class="md-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="md-grid">
      <div class="md-card"><div class="ic">🩺</div><h3>{service_1_title}</h3><p>{service_1_desc}</p></div>
      <div class="md-card"><div class="ic">💊</div><h3>{service_2_title}</h3><p>{service_2_desc}</p></div>
      <div class="md-card"><div class="ic">🦷</div><h3>{service_3_title}</h3><p>{service_3_desc}</p></div>
      <div class="md-card"><div class="ic">❤️</div><h3>{service_4_title}</h3><p>{service_4_desc}</p></div>
      <div class="md-card"><div class="ic">🧬</div><h3>{service_5_title}</h3><p>{service_5_desc}</p></div>
      <div class="md-card"><div class="ic">🩹</div><h3>{service_6_title}</h3><p>{service_6_desc}</p></div>
    </div>
  </div></section>

  <section class="md-sec"><div class="md-wrap">
    <div class="md-stats">
      <div class="st"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="st"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="st"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="st"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="md-sec"><div class="md-wrap"><div class="md-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="md-btn md-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "medi-clinic", name: "Medi — Health Clinic", description: "Calm, trustworthy medical & dental clinic landing with services and stats.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}", "{service_3_title}", "{service_3_desc}",
      "{service_4_title}", "{service_4_desc}", "{service_5_title}", "{service_5_desc}", "{service_6_title}", "{service_6_desc}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["health", "clinic", "medical", "dental", "wellness"],
    author: "Community", downloads: 512, rating: 4.8,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-clinic",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    schema_type: "MedicalOrganization", platform: "generic",
    defaultValues: {
      eyebrow: "Trusted care", hero_title: "Healthcare that puts you first",
      hero_subtitle: "Friendly doctors, modern facilities and same-day appointments — quality care for your whole family.",
      cta_primary: "Book appointment", cta_secondary: "Our services",
      hero_image: U("1576091160550-2173dba999ef", 900, 760),
      services_title: "Comprehensive care under one roof", services_subtitle: "From routine checkups to specialist treatments, we've got you covered.",
      service_1_title: "General medicine", service_1_desc: "Checkups, diagnosis and ongoing care from experienced GPs.",
      service_2_title: "Pharmacy", service_2_desc: "On-site pharmacy for fast, convenient prescriptions.",
      service_3_title: "Dental care", service_3_desc: "Gentle dentistry, from cleanings to cosmetic work.",
      service_4_title: "Cardiology", service_4_desc: "Heart screenings and specialist consultations.",
      service_5_title: "Lab & diagnostics", service_5_desc: "Fast, accurate results with modern equipment.",
      service_6_title: "Urgent care", service_6_desc: "Walk-in treatment for minor injuries and illness.",
      stat_1_num: "25K+", stat_1_label: "Patients cared for", stat_2_num: "40+", stat_2_label: "Specialists", stat_3_num: "15", stat_3_label: "Years of service", stat_4_num: "4.9★", stat_4_label: "Patient rating",
      final_title: "Your health can't wait", final_subtitle: "Book an appointment online in under a minute, or call us today.",
      final_cta: "Book now",
    },
  };
};

/* ───────────────────────── 20. LEX — Law firm ───────────────────────────── */
const lexLaw = (): MarketplaceTemplate => {
  const content = `<style>
.lx{--bg:#0f1117;--fg:#f5f3ee;--muted:#a09c93;--line:rgba(255,255,255,.1);--ac:#c8a96a;--card:#161922;background:var(--bg);color:var(--fg);font-family:Georgia,'Times New Roman',serif;line-height:1.6;overflow:hidden}
.lx *{box-sizing:border-box;margin:0}
.lx-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.lx h1,.lx h2,.lx h3{line-height:1.12;font-weight:700}
.lx-hero{position:relative;text-align:center;padding:clamp(80px,12vw,150px) 0}
.lx-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(120% 100% at 50% 0%,rgba(200,169,106,.12),transparent 60%)}
.lx-eye{position:relative;color:var(--ac);font-size:13px;letter-spacing:.28em;text-transform:uppercase;font-family:'Inter',sans-serif;font-weight:600;margin-bottom:22px;display:inline-block}
.lx-hero h1{position:relative;font-size:clamp(42px,7vw,82px);margin-bottom:24px}
.lx-hero p{position:relative;color:var(--muted);font-size:clamp(17px,1.8vw,21px);max-width:54ch;margin:0 auto 32px}
.lx-cta{position:relative;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.lx-btn{display:inline-flex;align-items:center;padding:15px 34px;border-radius:4px;font-weight:600;font-size:14px;font-family:'Inter',sans-serif;letter-spacing:.04em;text-decoration:none;transition:.25s}
.lx-btn-p{background:var(--ac);color:#171717}
.lx-btn-p:hover{background:#d9bd82}
.lx-btn-g{border:1px solid var(--line);color:var(--fg)}
.lx-sec{padding:clamp(56px,8vw,100px) 0}
.lx-head{text-align:center;max-width:640px;margin:0 auto 50px}
.lx-head h2{font-size:clamp(30px,4.6vw,50px);margin-bottom:14px}
.lx-head p{color:var(--muted);font-family:'Inter',sans-serif;font-size:16px}
.lx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}
.lx-card{background:var(--bg);padding:38px 30px;transition:.25s}
.lx-card:hover{background:var(--card)}
.lx-card .n{color:var(--ac);font-size:13px;font-family:'Inter',sans-serif;letter-spacing:.1em;margin-bottom:16px}
.lx-card h3{font-size:22px;margin-bottom:12px}
.lx-card p{color:var(--muted);font-family:'Inter',sans-serif;font-size:15px}
.lx-quote{text-align:center;max-width:820px;margin:0 auto;padding:clamp(40px,7vw,80px) 0}
.lx-quote p{font-size:clamp(22px,3.2vw,34px);line-height:1.4;margin-bottom:24px}
.lx-quote span{color:var(--ac);font-family:'Inter',sans-serif;font-size:14px;letter-spacing:.1em}
.lx-final{position:relative;text-align:center;border:1px solid var(--ac);border-radius:6px;padding:clamp(54px,8vw,96px) 24px;background:radial-gradient(100% 140% at 50% 0%,rgba(200,169,106,.1),transparent 60%)}
.lx-final h2{font-size:clamp(30px,5vw,54px);max-width:18ch;margin:0 auto 16px}
.lx-final p{color:var(--muted);font-family:'Inter',sans-serif;max-width:48ch;margin:0 auto 30px;font-size:16px}
@media(max-width:860px){.lx-grid{grid-template-columns:1fr}}
</style>
<div class="lx">
  <section class="lx-wrap lx-hero">
    <span class="lx-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="lx-cta"><a class="lx-btn lx-btn-p" href="#">{cta_primary}</a><a class="lx-btn lx-btn-g" href="#">{cta_secondary}</a></div>
  </section>

  <section class="lx-sec"><div class="lx-wrap">
    <div class="lx-head"><h2>{practice_title}</h2><p>{practice_subtitle}</p></div>
    <div class="lx-grid">
      <div class="lx-card"><div class="n">01</div><h3>{area_1_title}</h3><p>{area_1_desc}</p></div>
      <div class="lx-card"><div class="n">02</div><h3>{area_2_title}</h3><p>{area_2_desc}</p></div>
      <div class="lx-card"><div class="n">03</div><h3>{area_3_title}</h3><p>{area_3_desc}</p></div>
      <div class="lx-card"><div class="n">04</div><h3>{area_4_title}</h3><p>{area_4_desc}</p></div>
      <div class="lx-card"><div class="n">05</div><h3>{area_5_title}</h3><p>{area_5_desc}</p></div>
      <div class="lx-card"><div class="n">06</div><h3>{area_6_title}</h3><p>{area_6_desc}</p></div>
    </div>
  </div></section>

  <section class="lx-wrap"><div class="lx-quote">
    <p>"{quote_text}"</p>
    <span>{quote_author}</span>
  </div></section>

  <section class="lx-sec"><div class="lx-wrap"><div class="lx-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="lx-btn lx-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "lex-law", name: "Lex — Law Firm", description: "Authoritative, editorial law firm landing with practice areas and testimonial.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{practice_title}", "{practice_subtitle}",
      "{area_1_title}", "{area_1_desc}", "{area_2_title}", "{area_2_desc}", "{area_3_title}", "{area_3_desc}",
      "{area_4_title}", "{area_4_desc}", "{area_5_title}", "{area_5_desc}", "{area_6_title}", "{area_6_desc}",
      "{quote_text}", "{quote_author}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["law", "legal", "firm", "attorney", "dark"],
    author: "Community", downloads: 467, rating: 4.9,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-law-firm",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "",
    schema_type: "LegalService", platform: "generic",
    defaultValues: {
      eyebrow: "Established 1998", hero_title: "Justice, pursued with precision",
      hero_subtitle: "A boutique firm of trial-tested attorneys protecting what matters most to you, your family and your business.",
      cta_primary: "Request consultation", cta_secondary: "Our practice areas",
      practice_title: "Practice areas", practice_subtitle: "Decades of combined experience across the areas that matter most.",
      area_1_title: "Corporate law", area_1_desc: "Formation, contracts, M&A and ongoing counsel for businesses.",
      area_2_title: "Litigation", area_2_desc: "Strategic, aggressive representation in and out of the courtroom.",
      area_3_title: "Family law", area_3_desc: "Compassionate guidance through divorce, custody and estates.",
      area_4_title: "Real estate", area_4_desc: "Transactions, disputes and development from start to close.",
      area_5_title: "Intellectual property", area_5_desc: "Protect your trademarks, patents and creative work.",
      area_6_title: "Employment", area_6_desc: "Advising both employers and employees on workplace matters.",
      quote_text: "They turned an impossible situation into a clear victory. I never felt like just another case number.",
      quote_author: "— A. Whitman, Client since 2016",
      final_title: "Let's talk about your case", final_subtitle: "Your first consultation is confidential and free. We'll tell you exactly where you stand.",
      final_cta: "Schedule a consultation",
    },
  };
};

/* ───────────────────────── 21. NEST — Interior design ───────────────────── */
const nestInterior = (): MarketplaceTemplate => {
  const content = `<style>
.ns{--bg:#faf7f2;--fg:#2a241d;--muted:#7a7165;--line:#e6ded2;--ac:#b07d52;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ns *{box-sizing:border-box;margin:0}
.ns-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.ns h1,.ns h2,.ns h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.ns-hero{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch;min-height:clamp(440px,70vh,640px)}
.ns-hero .txt{padding:clamp(48px,7vw,96px) clamp(24px,5vw,72px);display:flex;flex-direction:column;justify-content:center}
.ns-eye{color:var(--ac);font-size:13px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;margin-bottom:18px}
.ns-hero h1{font-size:clamp(40px,6vw,72px);margin-bottom:20px}
.ns-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:42ch;margin-bottom:28px}
.ns-btn{align-self:flex-start;display:inline-flex;align-items:center;padding:15px 32px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;background:var(--fg);color:var(--bg);transition:.25s}
.ns-btn:hover{background:var(--ac)}
.ns-hero .img{background:center/cover no-repeat;min-height:340px}
.ns-sec{padding:clamp(56px,8vw,104px) 0}
.ns-head{max-width:620px;margin-bottom:46px}
.ns-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.ns-head p{color:var(--muted);font-size:17px}
.ns-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.ns-gal .it{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:3/4}
.ns-gal .it img{width:100%;height:100%;object-fit:cover;transition:.4s}
.ns-gal .it:hover img{transform:scale(1.06)}
.ns-gal .it span{position:absolute;left:18px;bottom:16px;color:#fff;font-weight:600;font-size:18px;text-shadow:0 2px 12px rgba(0,0,0,.5)}
.ns-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:30px}
.ns-step .n{font-size:48px;font-weight:800;color:var(--ac);opacity:.4;line-height:1}
.ns-step h3{font-size:21px;margin:12px 0 10px}
.ns-step p{color:var(--muted);font-size:15px}
.ns-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.ns-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.ns-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.ns-hero{grid-template-columns:1fr}.ns-gal,.ns-steps{grid-template-columns:1fr}}
</style>
<div class="ns">
  <section class="ns-hero">
    <div class="txt">
      <span class="ns-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <a class="ns-btn" href="#">{cta_primary}</a>
    </div>
    <div class="img" style="background-image:url('{hero_image}')"></div>
  </section>

  <section class="ns-sec"><div class="ns-wrap">
    <div class="ns-head"><h2>{projects_title}</h2><p>{projects_subtitle}</p></div>
    <div class="ns-gal">
      <div class="it"><img src="{project_1_image}" alt="{project_1_title}"><span>{project_1_title}</span></div>
      <div class="it"><img src="{project_2_image}" alt="{project_2_title}"><span>{project_2_title}</span></div>
      <div class="it"><img src="{project_3_image}" alt="{project_3_title}"><span>{project_3_title}</span></div>
    </div>
  </div></section>

  <section class="ns-sec"><div class="ns-wrap">
    <div class="ns-head"><h2>{process_title}</h2><p>{process_subtitle}</p></div>
    <div class="ns-steps">
      <div class="ns-step"><div class="n">01</div><h3>{step_1_title}</h3><p>{step_1_desc}</p></div>
      <div class="ns-step"><div class="n">02</div><h3>{step_2_title}</h3><p>{step_2_desc}</p></div>
      <div class="ns-step"><div class="n">03</div><h3>{step_3_title}</h3><p>{step_3_desc}</p></div>
    </div>
  </div></section>

  <section class="ns-sec"><div class="ns-wrap"><div class="ns-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="ns-btn" style="align-self:center" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "nest-interior", name: "Nest — Interior Design", description: "Warm, editorial interior design studio with project gallery and process.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{hero_image}",
      "{projects_title}", "{projects_subtitle}",
      "{project_1_image}", "{project_1_title}", "{project_2_image}", "{project_2_title}", "{project_3_image}", "{project_3_title}",
      "{process_title}", "{process_subtitle}",
      "{step_1_title}", "{step_1_desc}", "{step_2_title}", "{step_2_desc}", "{step_3_title}", "{step_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["interior", "design", "studio", "architecture", "portfolio"],
    author: "Community", downloads: 534, rating: 4.9,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-interior-design",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "Interior studio", hero_title: "Spaces that feel like home",
      hero_subtitle: "We design warm, timeless interiors that balance beauty and everyday life — tailored entirely to you.",
      cta_primary: "Start your project",
      hero_image: U("1616486338812-3dadae4b4ace", 900, 900),
      projects_title: "Selected projects", projects_subtitle: "A glimpse of recent homes and spaces we've brought to life.",
      project_1_image: U("1586023492125-27b2c045efd7", 600, 800), project_1_title: "Coastal villa",
      project_2_image: U("1618221195710-dd6b41faaea6", 600, 800), project_2_title: "Urban loft",
      project_3_image: U("1583847268964-b28dc8f51f92", 600, 800), project_3_title: "Garden townhouse",
      process_title: "How we work", process_subtitle: "A simple, collaborative process from first idea to final reveal.",
      step_1_title: "Discover", step_1_desc: "We learn how you live, your taste and your goals for the space.",
      step_2_title: "Design", step_2_desc: "Moodboards, layouts and 3D visuals until it's exactly right.",
      step_3_title: "Deliver", step_3_desc: "We manage everything through to the final styled reveal.",
      final_title: "Let's design your space", final_subtitle: "Book a free discovery call and tell us about your project.",
      final_cta: "Book a call",
    },
  };
};

/* ───────────────────────── 22. GLOW — Beauty / cosmetics ────────────────── */
const glowBeauty = (): MarketplaceTemplate => {
  const content = `<style>
.gl{--bg:#fff6f3;--fg:#3a1f29;--muted:#8a6b73;--line:#f3dcd9;--ac:#e8607d;--ac2:#ff9d7a;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.gl *{box-sizing:border-box;margin:0}
.gl-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.gl h1,.gl h2,.gl h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.gl-hero{position:relative;text-align:center;padding:clamp(64px,10vw,128px) 0}
.gl-hero::before{content:'';position:absolute;width:520px;height:520px;border-radius:50%;left:50%;top:-120px;transform:translateX(-50%);background:radial-gradient(circle,rgba(255,157,122,.25),transparent 65%);pointer-events:none}
.gl-eye{position:relative;color:var(--ac);font-size:13px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;margin-bottom:18px;display:inline-block}
.gl-hero h1{position:relative;font-size:clamp(40px,6.6vw,78px);margin-bottom:20px}
.gl-hero h1 .g{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.gl-hero p{position:relative;color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:48ch;margin:0 auto 28px}
.gl-btn{display:inline-flex;align-items:center;padding:15px 34px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 38px rgba(232,96,125,.32);transition:.25s}
.gl-btn:hover{transform:translateY(-2px)}
.gl-hero img{position:relative;width:100%;max-width:760px;margin:42px auto 0;display:block;border-radius:24px;aspect-ratio:16/8;object-fit:cover;box-shadow:0 30px 70px rgba(58,31,41,.18)}
.gl-sec{padding:clamp(54px,8vw,100px) 0}
.gl-head{text-align:center;max-width:620px;margin:0 auto 46px}
.gl-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.gl-head p{color:var(--muted);font-size:17px}
.gl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.gl-prod{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden;transition:.25s}
.gl-prod:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(58,31,41,.1)}
.gl-prod img{width:100%;aspect-ratio:1;object-fit:cover}
.gl-prod .b{padding:20px}
.gl-prod h3{font-size:18px;margin-bottom:6px}
.gl-prod p{color:var(--muted);font-size:14px;margin-bottom:10px}
.gl-prod .pr{color:var(--ac);font-weight:700;font-size:17px}
.gl-final{position:relative;text-align:center;border-radius:28px;padding:clamp(54px,8vw,96px) 24px;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;overflow:hidden}
.gl-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 16px}
.gl-final p{opacity:.9;max-width:46ch;margin:0 auto 28px;font-size:17px}
.gl-final .gl-btn{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.gl-grid{grid-template-columns:1fr}}
</style>
<div class="gl">
  <section class="gl-wrap gl-hero">
    <span class="gl-eye">{eyebrow}</span>
    <h1>{hero_title_a} <span class="g">{hero_title_b}</span></h1>
    <p>{hero_subtitle}</p>
    <a class="gl-btn" href="#">{cta_primary}</a>
    <img src="{hero_image}" alt="{hero_title_a}">
  </section>

  <section class="gl-sec"><div class="gl-wrap">
    <div class="gl-head"><h2>{products_title}</h2><p>{products_subtitle}</p></div>
    <div class="gl-grid">
      <div class="gl-prod"><img src="{product_1_image}" alt="{product_1_title}"><div class="b"><h3>{product_1_title}</h3><p>{product_1_desc}</p><div class="pr">{product_1_price}</div></div></div>
      <div class="gl-prod"><img src="{product_2_image}" alt="{product_2_title}"><div class="b"><h3>{product_2_title}</h3><p>{product_2_desc}</p><div class="pr">{product_2_price}</div></div></div>
      <div class="gl-prod"><img src="{product_3_image}" alt="{product_3_title}"><div class="b"><h3>{product_3_title}</h3><p>{product_3_desc}</p><div class="pr">{product_3_price}</div></div></div>
    </div>
  </div></section>

  <section class="gl-sec"><div class="gl-wrap"><div class="gl-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="gl-btn" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "glow-beauty", name: "Glow — Beauty & Cosmetics", description: "Soft, glowing cosmetics brand landing with product showcase and CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{hero_image}",
      "{products_title}", "{products_subtitle}",
      "{product_1_image}", "{product_1_title}", "{product_1_desc}", "{product_1_price}",
      "{product_2_image}", "{product_2_title}", "{product_2_desc}", "{product_2_price}",
      "{product_3_image}", "{product_3_title}", "{product_3_desc}", "{product_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "shopify", tags: ["beauty", "cosmetics", "skincare", "ecommerce", "brand"],
    author: "Community", downloads: 689, rating: 4.9,
    seo_title_pattern: "{hero_title_a} {hero_title_b}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{hero_title_b}-beauty",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    schema_type: "Product", platform: "shopify",
    defaultValues: {
      eyebrow: "Clean beauty", hero_title_a: "Skin that", hero_title_b: "glows from within",
      hero_subtitle: "Gentle, science-backed skincare made with clean ingredients your skin will love.",
      cta_primary: "Shop the collection",
      hero_image: U("1556228720-195a672e8a03", 760, 380),
      products_title: "Bestsellers", products_subtitle: "Cult favourites loved by thousands.",
      product_1_image: U("1620916566398-39f1143ab7be", 500, 500), product_1_title: "Radiance serum", product_1_desc: "Vitamin C glow boost for brighter skin.", product_1_price: "$38",
      product_2_image: U("1571781926291-c477ebfd024b", 500, 500), product_2_title: "Hydra cream", product_2_desc: "48-hour deep moisture, lightweight feel.", product_2_price: "$32",
      product_3_image: U("1612817288484-6f916006741a", 500, 500), product_3_title: "Gentle cleanser", product_3_desc: "Removes makeup without stripping skin.", product_3_price: "$24",
      final_title: "Your best skin starts here", final_subtitle: "Free shipping over $50 and a 30-day glow guarantee.",
      final_cta: "Shop now",
    },
  };
};

/* ───────────────────────── 23. DRIVE — Auto dealer ──────────────────────── */
const driveAuto = (): MarketplaceTemplate => {
  const content = `<style>
.dr{--bg:#0a0c10;--fg:#f1f4f8;--muted:#8b94a3;--line:rgba(255,255,255,.1);--ac:#ff4d2e;--card:#11151c;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.dr *{box-sizing:border-box;margin:0}
.dr-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.dr h1,.dr h2,.dr h3{letter-spacing:-.03em;line-height:1.06;font-weight:800}
.dr-hero{position:relative;min-height:clamp(480px,80vh,720px);display:flex;align-items:flex-end;border-radius:0 0 32px 32px;overflow:hidden}
.dr-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.dr-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(10,12,16,.95) 5%,rgba(10,12,16,.2) 60%)}
.dr-hero .c{position:relative;padding:clamp(40px,6vw,72px);max-width:680px}
.dr-eye{display:inline-block;color:var(--ac);font-size:13px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;margin-bottom:16px}
.dr-hero h1{font-size:clamp(42px,7vw,86px);margin-bottom:18px}
.dr-hero p{color:#cfd6e0;font-size:clamp(16px,1.7vw,20px);max-width:46ch;margin-bottom:26px}
.dr-cta{display:flex;gap:14px;flex-wrap:wrap}
.dr-btn{display:inline-flex;align-items:center;padding:15px 32px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.dr-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 38px rgba(255,77,46,.35)}
.dr-btn-p:hover{transform:translateY(-2px)}
.dr-btn-g{background:rgba(255,255,255,.08);border:1px solid var(--line);color:#fff}
.dr-sec{padding:clamp(56px,8vw,100px) 0}
.dr-head{text-align:center;max-width:640px;margin:0 auto 46px}
.dr-head h2{font-size:clamp(28px,4.6vw,48px);margin-bottom:14px}
.dr-head p{color:var(--muted);font-size:17px}
.dr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.dr-car{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.25s}
.dr-car:hover{transform:translateY(-4px);border-color:rgba(255,77,46,.4)}
.dr-car img{width:100%;aspect-ratio:16/10;object-fit:cover}
.dr-car .b{padding:22px}
.dr-car h3{font-size:20px;margin-bottom:6px}
.dr-car .sp{color:var(--muted);font-size:13px;margin-bottom:12px;display:flex;gap:14px}
.dr-car .pr{color:var(--ac);font-weight:800;font-size:22px}
.dr-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px;background:radial-gradient(120% 140% at 50% 0%,rgba(255,77,46,.16),transparent 60%)}
.dr-final h2{font-size:clamp(30px,5vw,54px);max-width:18ch;margin:0 auto 16px}
.dr-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.dr-grid{grid-template-columns:1fr}}
</style>
<div class="dr">
  <section class="dr-hero">
    <img src="{hero_image}" alt="{hero_title}">
    <div class="c">
      <span class="dr-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="dr-cta"><a class="dr-btn dr-btn-p" href="#">{cta_primary}</a><a class="dr-btn dr-btn-g" href="#">{cta_secondary}</a></div>
    </div>
  </section>

  <section class="dr-sec"><div class="dr-wrap">
    <div class="dr-head"><h2>{inventory_title}</h2><p>{inventory_subtitle}</p></div>
    <div class="dr-grid">
      <div class="dr-car"><img src="{car_1_image}" alt="{car_1_title}"><div class="b"><h3>{car_1_title}</h3><div class="sp"><span>{car_1_spec_a}</span><span>{car_1_spec_b}</span></div><div class="pr">{car_1_price}</div></div></div>
      <div class="dr-car"><img src="{car_2_image}" alt="{car_2_title}"><div class="b"><h3>{car_2_title}</h3><div class="sp"><span>{car_2_spec_a}</span><span>{car_2_spec_b}</span></div><div class="pr">{car_2_price}</div></div></div>
      <div class="dr-car"><img src="{car_3_image}" alt="{car_3_title}"><div class="b"><h3>{car_3_title}</h3><div class="sp"><span>{car_3_spec_a}</span><span>{car_3_spec_b}</span></div><div class="pr">{car_3_price}</div></div></div>
    </div>
  </div></section>

  <section class="dr-sec"><div class="dr-wrap"><div class="dr-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="dr-btn dr-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "drive-auto", name: "Drive — Auto Dealer", description: "Bold, cinematic car dealership landing with inventory grid and specs.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{inventory_title}", "{inventory_subtitle}",
      "{car_1_image}", "{car_1_title}", "{car_1_spec_a}", "{car_1_spec_b}", "{car_1_price}",
      "{car_2_image}", "{car_2_title}", "{car_2_spec_a}", "{car_2_spec_b}", "{car_2_price}",
      "{car_3_image}", "{car_3_title}", "{car_3_spec_a}", "{car_3_spec_b}", "{car_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["auto", "car", "dealership", "vehicles", "dark"],
    author: "Community", downloads: 445, rating: 4.8,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-auto",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    schema_type: "AutoDealer", platform: "generic",
    defaultValues: {
      eyebrow: "Premium dealership", hero_title: "Find your perfect drive",
      hero_subtitle: "Hand-picked premium and certified vehicles, transparent pricing and finance options that fit your life.",
      cta_primary: "Browse inventory", cta_secondary: "Book a test drive",
      hero_image: U("1503376780353-7e6692767b70", 1200, 760),
      inventory_title: "Featured vehicles", inventory_subtitle: "Fresh arrivals from our certified collection.",
      car_1_image: U("1494976388531-d1058494cdd8", 600, 380), car_1_title: "2023 Sport Coupe", car_1_spec_a: "12,400 mi", car_1_spec_b: "Automatic", car_1_price: "$42,900",
      car_2_image: U("1552519507-da3b142c6e3d", 600, 380), car_2_title: "2022 Luxury Sedan", car_2_spec_a: "18,900 mi", car_2_spec_b: "Hybrid", car_2_price: "$38,500",
      car_3_image: U("1606664515524-ed2f786a0bd6", 600, 380), car_3_title: "2023 Electric SUV", car_3_spec_a: "8,200 mi", car_3_spec_b: "Electric", car_3_price: "$55,200",
      final_title: "Drive home something special", final_subtitle: "Book a no-pressure test drive today, online in minutes.",
      final_cta: "Schedule test drive",
    },
  };
};

/* ───────────────────────── 24. RAVE — Music artist ──────────────────────── */
const raveMusic = (): MarketplaceTemplate => {
  const content = `<style>
.rv{--bg:#06040d;--fg:#f4f0ff;--muted:#9c93b8;--line:rgba(255,255,255,.1);--ac:#b14bff;--ac2:#36e0ff;--card:#100b1c;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.rv *{box-sizing:border-box;margin:0}
.rv-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.rv h1,.rv h2,.rv h3{letter-spacing:-.03em;line-height:1.05;font-weight:800}
.rv-hero{position:relative;text-align:center;padding:clamp(80px,12vw,150px) 0}
.rv-hero::before{content:'';position:absolute;width:680px;height:680px;border-radius:50%;left:50%;top:-160px;transform:translateX(-50%);background:radial-gradient(circle,rgba(177,75,255,.28),transparent 60%);pointer-events:none}
.rv-eye{position:relative;color:var(--ac2);font-size:13px;letter-spacing:.24em;text-transform:uppercase;font-weight:600;margin-bottom:20px;display:inline-block}
.rv-hero h1{position:relative;font-size:clamp(48px,9vw,120px);text-transform:uppercase;margin-bottom:20px}
.rv-hero h1 .g{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.rv-hero p{position:relative;color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:48ch;margin:0 auto 30px}
.rv-cta{position:relative;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.rv-btn{display:inline-flex;align-items:center;padding:15px 34px;border-radius:99px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.rv-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#06040d;box-shadow:0 14px 40px rgba(177,75,255,.4)}
.rv-btn-p:hover{transform:translateY(-2px)}
.rv-btn-g{background:rgba(255,255,255,.06);border:1px solid var(--line);color:var(--fg)}
.rv-sec{padding:clamp(54px,8vw,100px) 0}
.rv-head{text-align:center;max-width:620px;margin:0 auto 46px}
.rv-head h2{font-size:clamp(30px,5vw,54px);text-transform:uppercase;margin-bottom:14px}
.rv-head p{color:var(--muted);font-size:17px}
.rv-tour{max-width:760px;margin:0 auto}
.rv-row{display:flex;align-items:center;gap:20px;border-bottom:1px solid var(--line);padding:22px 4px;transition:.25s}
.rv-row:hover{padding-left:14px}
.rv-row .date{font-weight:800;font-size:18px;min-width:96px;color:var(--ac2)}
.rv-row .info{flex:1}
.rv-row .info b{display:block;font-size:18px}
.rv-row .info span{color:var(--muted);font-size:14px}
.rv-row a{flex-shrink:0;padding:10px 22px;border-radius:99px;border:1px solid var(--ac);color:var(--ac);font-weight:600;font-size:13px;text-decoration:none;transition:.25s}
.rv-row a:hover{background:var(--ac);color:#06040d}
.rv-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px;background:radial-gradient(120% 140% at 50% 0%,rgba(54,224,255,.14),transparent 60%)}
.rv-final h2{font-size:clamp(32px,6vw,64px);text-transform:uppercase;max-width:14ch;margin:0 auto 18px}
.rv-final p{color:var(--muted);max-width:46ch;margin:0 auto 30px;font-size:17px}
@media(max-width:680px){.rv-row{flex-wrap:wrap}}
</style>
<div class="rv">
  <section class="rv-wrap rv-hero">
    <span class="rv-eye">{eyebrow}</span>
    <h1>{hero_title_a} <span class="g">{hero_title_b}</span></h1>
    <p>{hero_subtitle}</p>
    <div class="rv-cta"><a class="rv-btn rv-btn-p" href="#">{cta_primary}</a><a class="rv-btn rv-btn-g" href="#">{cta_secondary}</a></div>
  </section>

  <section class="rv-sec"><div class="rv-wrap">
    <div class="rv-head"><h2>{tour_title}</h2><p>{tour_subtitle}</p></div>
    <div class="rv-tour">
      <div class="rv-row"><div class="date">{show_1_date}</div><div class="info"><b>{show_1_city}</b><span>{show_1_venue}</span></div><a href="#">{tickets_label}</a></div>
      <div class="rv-row"><div class="date">{show_2_date}</div><div class="info"><b>{show_2_city}</b><span>{show_2_venue}</span></div><a href="#">{tickets_label}</a></div>
      <div class="rv-row"><div class="date">{show_3_date}</div><div class="info"><b>{show_3_city}</b><span>{show_3_venue}</span></div><a href="#">{tickets_label}</a></div>
      <div class="rv-row"><div class="date">{show_4_date}</div><div class="info"><b>{show_4_city}</b><span>{show_4_venue}</span></div><a href="#">{tickets_label}</a></div>
    </div>
  </div></section>

  <section class="rv-sec"><div class="rv-wrap"><div class="rv-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="rv-btn rv-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "rave-music", name: "Rave — Music Artist", description: "Electric, neon music artist / DJ landing with tour dates and CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{tour_title}", "{tour_subtitle}", "{tickets_label}",
      "{show_1_date}", "{show_1_city}", "{show_1_venue}", "{show_2_date}", "{show_2_city}", "{show_2_venue}",
      "{show_3_date}", "{show_3_city}", "{show_3_venue}", "{show_4_date}", "{show_4_city}", "{show_4_venue}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["music", "artist", "dj", "tour", "dark", "neon"],
    author: "Community", downloads: 578, rating: 4.9,
    seo_title_pattern: "{hero_title_a} {hero_title_b}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{hero_title_b}-tour",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "",
    schema_type: "MusicGroup", platform: "generic",
    defaultValues: {
      eyebrow: "World tour 2026", hero_title_a: "Feel the", hero_title_b: "frequency",
      hero_subtitle: "New album out now. Catch the live experience in a city near you — bigger, louder, brighter.",
      cta_primary: "Listen now", cta_secondary: "Tour dates",
      tour_title: "Live on tour", tour_subtitle: "Don't miss the show — tickets are selling fast.",
      tickets_label: "Tickets",
      show_1_date: "JUN 12", show_1_city: "Los Angeles, CA", show_1_venue: "The Novo",
      show_2_date: "JUN 18", show_2_city: "Chicago, IL", show_2_venue: "Aragon Ballroom",
      show_3_date: "JUN 24", show_3_city: "New York, NY", show_3_venue: "Brooklyn Steel",
      show_4_date: "JUL 02", show_4_city: "London, UK", show_4_venue: "O2 Academy",
      final_title: "Stream the new album", final_subtitle: "Available everywhere now. Turn it up.",
      final_cta: "Play album",
    },
  };
};

export const FRAMER_BATCH4_TEMPLATES: MarketplaceTemplate[] = [
  mediClinic(),
  lexLaw(),
  nestInterior(),
  glowBeauty(),
  driveAuto(),
  raveMusic(),
];
