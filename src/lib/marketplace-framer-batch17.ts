// Framer-modelled marketplace templates — Batch 17 (1:1 design clones).
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

/* ───────── 97. SCHOLAR — Online course / e-learning ───────── */
const scholarCourse = (): MarketplaceTemplate => ({
  id: "elearning-scholar", name: "Online Course Template",
  description: "Friendly e-learning/course landing with feature cards and bright tones.",
  content: base("sc", "--bg:#f5f4fc;--fg:#1d1a35;--muted:#615d80;--line:rgba(0,0,0,.08);--ac:#6d4aff;--acbg:rgba(109,74,255,.12);--acsh:rgba(109,74,255,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#e7e3fb,#f5f4fc);background:var(--bg);color:var(--fg)") + body("sc", ["🎓", "📚", "🏆"]),
  variables: VARS, category: "business", tags: ["elearning", "course", "education", "light"],
  author: "Community", downloads: 333, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-course",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1513258496099-48168024aec0", 1200, 630),
  schema_type: "EducationalOrganization", platform: "generic",
  defaultValues: {
    eyebrow: "Learn at your pace", hero_title: "Master new skills, anytime, anywhere",
    hero_subtitle: "Expert-led online courses with hands-on projects and certificates that move your career forward.",
    hero_image: U("1513258496099-48168024aec0"), cta_primary: "Start learning", cta_secondary: "Browse courses",
    services_title: "Why learn with us", services_subtitle: "Everything you need to grow, in one place.",
    svc_1_title: "Expert Instructors", svc_1_desc: "Learn from industry pros who've done the work.",
    svc_2_title: "Hands-on Projects", svc_2_desc: "Build a real portfolio as you learn each skill.",
    svc_3_title: "Certificates", svc_3_desc: "Earn shareable certificates to showcase your progress.",
    final_title: "Invest in yourself", final_subtitle: "Start your first course today — risk-free with our guarantee.",
    final_cta: "Enroll now",
  },
});

/* ───────── 98. SWEAT — Gym / fitness ───────── */
const sweatGym = (): MarketplaceTemplate => ({
  id: "gym-sweat", name: "Gym Fitness Template",
  description: "High-energy dark gym/fitness landing with program cards.",
  content: base("sw", "--bg:#0c0d10;--fg:#f2f4f7;--muted:#8d929c;--line:rgba(255,255,255,.1);--ac:#e0fe10;--acbg:rgba(224,254,16,.14);--acsh:rgba(224,254,16,.28);--card:#15171c;--finalbg:linear-gradient(135deg,#1b1e24,#0c0d10);background:var(--bg);color:var(--fg)", `.sw .btn-p{color:#0c0d10}`) + body("sw", ["💪", "🏋️", "🔥"]),
  variables: VARS, category: "business", tags: ["gym", "fitness", "training", "dark"],
  author: "Community", downloads: 351, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-gym",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1534438327276-14e5300c3a48", 1200, 630),
  schema_type: "ExerciseGym", platform: "generic",
  defaultValues: {
    eyebrow: "No excuses", hero_title: "Train hard, get results",
    hero_subtitle: "State-of-the-art equipment, expert coaching, and a community that pushes you to be your strongest.",
    hero_image: U("1534438327276-14e5300c3a48"), cta_primary: "Join now", cta_secondary: "View programs",
    services_title: "Our programs", services_subtitle: "Built to get you stronger, faster, fitter.",
    svc_1_title: "Strength", svc_1_desc: "Build muscle and power with structured lifting plans.",
    svc_2_title: "HIIT Classes", svc_2_desc: "High-intensity sessions that torch calories fast.",
    svc_3_title: "Personal Training", svc_3_desc: "One-on-one coaching tailored to your goals.",
    final_title: "Ready to transform?", final_subtitle: "Claim your free trial week and start strong today.",
    final_cta: "Get free trial",
  },
});

/* ───────── 99. STITCH — Fashion / apparel ───────── */
const stitchFashion = (): MarketplaceTemplate => ({
  id: "fashion-stitch", name: "Fashion Brand Template",
  description: "Chic fashion/apparel landing with collection cards and minimal tones.",
  content: base("st", "--bg:#faf8f6;--fg:#1c1814;--muted:#6c6258;--line:rgba(0,0,0,.08);--ac:#b8434f;--acbg:rgba(184,67,79,.12);--acsh:rgba(184,67,79,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#f0e7e2,#faf8f6);background:var(--bg);color:var(--fg)") + body("st", ["👗", "🧥", "👜"]),
  variables: VARS, category: "ecommerce", tags: ["fashion", "apparel", "clothing", "light"],
  author: "Community", downloads: 322, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-fashion",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1490481651871-ab68de25d43d", 1200, 630),
  schema_type: "OnlineStore", platform: "generic",
  defaultValues: {
    eyebrow: "New season, new you", hero_title: "Style that speaks for itself",
    hero_subtitle: "Timeless, ethically made apparel designed to elevate your wardrobe and last beyond the trends.",
    hero_image: U("1490481651871-ab68de25d43d"), cta_primary: "Shop the collection", cta_secondary: "Explore lookbook",
    services_title: "Why our brand", services_subtitle: "Thoughtful fashion that feels as good as it looks.",
    svc_1_title: "Ethically Made", svc_1_desc: "Responsibly sourced materials and fair production.",
    svc_2_title: "Timeless Design", svc_2_desc: "Versatile pieces that never go out of style.",
    svc_3_title: "Perfect Fit", svc_3_desc: "Inclusive sizing and easy, free returns.",
    final_title: "Refresh your wardrobe", final_subtitle: "Discover the new collection and find your signature look.",
    final_cta: "Shop now",
  },
});

/* ───────── 100. ORBIT — SaaS / software ───────── */
const orbitSaas = (): MarketplaceTemplate => ({
  id: "saas-orbit", name: "SaaS Product Template",
  description: "Modern dark SaaS landing with feature cards and vibrant gradient.",
  content: base("ob", "--bg:#080b16;--fg:#eef1fb;--muted:#838ea6;--line:rgba(255,255,255,.1);--ac:#3b82f6;--acbg:rgba(59,130,246,.16);--acsh:rgba(59,130,246,.34);--card:#101526;--finalbg:linear-gradient(135deg,#13friendly,#080b16);background:var(--bg);color:var(--fg)".replace('13friendly', '152138')) + body("ob", ["🚀", "⚙️", "📊"]),
  variables: VARS, category: "business", tags: ["saas", "software", "product", "dark"],
  author: "Community", downloads: 367, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-saas",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1551288049-bebda4e38f71", 1200, 630),
  schema_type: "SoftwareApplication", platform: "generic",
  defaultValues: {
    eyebrow: "Work, automated", hero_title: "The platform that powers your team",
    hero_subtitle: "Streamline workflows, collaborate in real time, and ship faster with one intuitive all-in-one tool.",
    hero_image: U("1551288049-bebda4e38f71"), cta_primary: "Start free trial", cta_secondary: "See how it works",
    services_title: "Why teams love us", services_subtitle: "Powerful features that just work, together.",
    svc_1_title: "Automation", svc_1_desc: "Automate repetitive tasks and reclaim hours every week.",
    svc_2_title: "Collaboration", svc_2_desc: "Keep everyone aligned with real-time shared workspaces.",
    svc_3_title: "Insights", svc_3_desc: "Dashboards and reports that turn data into decisions.",
    final_title: "Ship faster today", final_subtitle: "Join thousands of teams — start your free 14-day trial.",
    final_cta: "Try it free",
  },
});

/* ───────── 101. ROOT — Nonprofit / charity ───────── */
const rootNonprofit = (): MarketplaceTemplate => ({
  id: "nonprofit-root", name: "Nonprofit Charity Template",
  description: "Warm, hopeful nonprofit/charity landing with cause cards.",
  content: base("rt", "--bg:#f4f9f4;--fg:#142318;--muted:#566b5a;--line:rgba(0,0,0,.08);--ac:#2f9e57;--acbg:rgba(47,158,87,.12);--acsh:rgba(47,158,87,.28);--card:#ffffff;--finalbg:linear-gradient(135deg,#dcf0e2,#f4f9f4);background:var(--bg);color:var(--fg)") + body("rt", ["💚", "🤲", "🌍"]),
  variables: VARS, category: "business", tags: ["nonprofit", "charity", "community", "light"],
  author: "Community", downloads: 271, rating: 4.9,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-nonprofit",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1488521787991-ed7bbaae773c", 1200, 630),
  schema_type: "NGO", platform: "generic",
  defaultValues: {
    eyebrow: "Together we can", hero_title: "Make a difference that lasts",
    hero_subtitle: "Join a community of changemakers turning compassion into real, measurable impact for those who need it most.",
    hero_image: U("1488521787991-ed7bbaae773c"), cta_primary: "Donate now", cta_secondary: "Get involved",
    services_title: "Our mission", services_subtitle: "Where your support makes the biggest impact.",
    svc_1_title: "Clean Water", svc_1_desc: "Bringing safe drinking water to communities in need.",
    svc_2_title: "Education", svc_2_desc: "Giving children the tools to build brighter futures.",
    svc_3_title: "Relief", svc_3_desc: "Rapid aid for families facing crisis and hardship.",
    final_title: "Be part of the change", final_subtitle: "Every donation, big or small, transforms a life.",
    final_cta: "Give today",
  },
});

/* ───────── 102. BREW — Brewery / craft beer ───────── */
const brewBrewery = (): MarketplaceTemplate => ({
  id: "brewery-brew", name: "Brewery Template",
  description: "Rich dark craft brewery landing with beer cards and warm amber tones.",
  content: base("bw", "--bg:#15100a;--fg:#f3e9d8;--muted:#a8967c;--line:rgba(255,255,255,.1);--ac:#d99a2b;--acbg:rgba(217,154,43,.16);--acsh:rgba(217,154,43,.3);--card:#201810;--finalbg:linear-gradient(135deg,#271d12,#15100a);background:var(--bg);color:var(--fg)") + body("bw", ["🍺", "🌾", "🍻"]),
  variables: VARS, category: "ecommerce", tags: ["brewery", "beer", "craft", "dark"],
  author: "Community", downloads: 284, rating: 4.8,
  seo_title_pattern: "{hero_title} | {eyebrow}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-brewery",
  og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: U("1535958636474-b021ee887b13", 1200, 630),
  schema_type: "Brewery", platform: "generic",
  defaultValues: {
    eyebrow: "Crafted with passion", hero_title: "Bold beer, brewed with character",
    hero_subtitle: "Small-batch craft brews made from the finest hops and grains, poured fresh in our welcoming taproom.",
    hero_image: U("1535958636474-b021ee887b13"), cta_primary: "Visit the taproom", cta_secondary: "See our beers",
    services_title: "On tap", services_subtitle: "A rotating lineup of handcrafted favorites.",
    svc_1_title: "Hazy IPAs", svc_1_desc: "Juicy, hop-forward ales bursting with flavor.",
    svc_2_title: "Classic Lagers", svc_2_desc: "Crisp, clean, and endlessly drinkable.",
    svc_3_title: "Seasonal Brews", svc_3_desc: "Limited releases crafted for every season.",
    final_title: "Come raise a glass", final_subtitle: "Stop by the taproom or grab a four-pack to go.",
    final_cta: "Find us",
  },
});

export const FRAMER_BATCH17_TEMPLATES: MarketplaceTemplate[] = [
  scholarCourse(),
  sweatGym(),
  stitchFashion(),
  orbitSaas(),
  rootNonprofit(),
  brewBrewery(),
];
