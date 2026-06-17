// Framer-modelled marketplace templates — Batch 6 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 31. PAWS — Veterinary / pet care ───────────────── */
const pawsVet = (): MarketplaceTemplate => {
  const content = `<style>
.pw{--bg:#fbf7f0;--fg:#22201d;--muted:#6f6a62;--line:rgba(0,0,0,.08);--ac:#ff7a59;--ac2:#ffb15c;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.pw *{box-sizing:border-box;margin:0}
.pw-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.pw h1,.pw h2,.pw h3{letter-spacing:-.02em;line-height:1.08;font-weight:800}
.pw-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,124px) 0}
.pw-eye{display:inline-block;color:var(--ac);background:rgba(255,122,89,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;margin-bottom:18px}
.pw-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.pw-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:26px}
.pw-cta{display:flex;gap:14px;flex-wrap:wrap}
.pw-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.pw-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 34px rgba(255,122,89,.32)}
.pw-btn-p:hover{transform:translateY(-2px)}
.pw-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.pw-hero img{width:100%;border-radius:28px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 30px 60px rgba(0,0,0,.14)}
.pw-sec{padding:clamp(54px,8vw,100px) 0}
.pw-head{text-align:center;max-width:640px;margin:0 auto 48px}
.pw-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.pw-head p{color:var(--muted);font-size:17px}
.pw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pw-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px;transition:.25s}
.pw-card:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.1)}
.pw-card .ic{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;font-size:26px;background:rgba(255,122,89,.12);margin-bottom:18px}
.pw-card h3{font-size:20px;margin-bottom:8px}
.pw-card p{color:var(--muted);font-size:15px}
.pw-final{text-align:center;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.pw-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.pw-final p{opacity:.92;max-width:46ch;margin:0 auto 28px;font-size:17px}
.pw-final .pw-btn-p{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.pw-hero{grid-template-columns:1fr}.pw-grid{grid-template-columns:1fr}}
</style>
<div class="pw">
  <section class="pw-wrap pw-hero">
    <div>
      <span class="pw-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="pw-cta"><a class="pw-btn pw-btn-p" href="#">{cta_primary}</a><a class="pw-btn pw-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="pw-sec"><div class="pw-wrap">
    <div class="pw-head"><h2>{services_title}</h2><p>{services_subtitle}</p></div>
    <div class="pw-grid">
      <div class="pw-card"><div class="ic">🐾</div><h3>{svc_1_title}</h3><p>{svc_1_desc}</p></div>
      <div class="pw-card"><div class="ic">💉</div><h3>{svc_2_title}</h3><p>{svc_2_desc}</p></div>
      <div class="pw-card"><div class="ic">🦴</div><h3>{svc_3_title}</h3><p>{svc_3_desc}</p></div>
    </div>
  </div></section>

  <section class="pw-sec"><div class="pw-wrap"><div class="pw-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="pw-btn pw-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "paws-vet", name: "Paws — Veterinary Clinic", description: "Warm pet care / veterinary landing with services and a friendly CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{services_title}", "{services_subtitle}",
      "{svc_1_title}", "{svc_1_desc}", "{svc_2_title}", "{svc_2_desc}", "{svc_3_title}", "{svc_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["veterinary", "pets", "clinic", "animals", "light"],
    author: "Community", downloads: 411, rating: 4.8,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-vet",
    schema_type: "VeterinaryCare", platform: "generic",
    defaultValues: {
      eyebrow: "Caring vets", hero_title: "Gentle care for the pets you love",
      hero_subtitle: "From routine checkups to emergencies, our compassionate team keeps your companion happy and healthy.",
      cta_primary: "Book a visit", cta_secondary: "Our services",
      hero_image: U("1583337130417-3346a1be7dee", 900, 780),
      services_title: "How we help", services_subtitle: "Full-service care tailored to every breed and age.",
      svc_1_title: "Wellness exams", svc_1_desc: "Comprehensive checkups to catch issues early and keep tails wagging.",
      svc_2_title: "Vaccinations", svc_2_desc: "Protect your pet with up-to-date, stress-free immunizations.",
      svc_3_title: "Dental & surgery", svc_3_desc: "Modern facilities for cleanings, procedures and recovery.",
      final_title: "Your pet deserves the best", final_subtitle: "Schedule an appointment today and meet the team that treats pets like family.",
      final_cta: "Book now",
    },
  };
};

/* ───────────────────────── 32. VOW — Wedding planner ─────────────────────── */
const vowWedding = (): MarketplaceTemplate => {
  const content = `<style>
.vw{--bg:#fffaf6;--fg:#2b2420;--muted:#7a6f66;--line:rgba(0,0,0,.08);--ac:#c79a6b;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Georgia','Times New Roman',serif;line-height:1.65;overflow:hidden}
.vw *{box-sizing:border-box;margin:0}
.vw-wrap{max-width:1080px;margin:0 auto;padding:0 24px}
.vw h1,.vw h2,.vw h3{letter-spacing:.01em;line-height:1.12;font-weight:400}
.vw-hero{text-align:center;padding:clamp(72px,11vw,140px) 0}
.vw-eye{display:inline-block;color:var(--ac);font-style:italic;letter-spacing:.18em;text-transform:uppercase;font-size:13px;margin-bottom:20px}
.vw-hero h1{font-size:clamp(44px,7vw,84px);margin-bottom:20px}
.vw-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:50ch;margin:0 auto 30px}
.vw-btn{display:inline-flex;align-items:center;padding:14px 34px;border-radius:2px;font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;font-family:'Inter',sans-serif;transition:.25s}
.vw-btn-p{background:var(--ac);color:#fff}
.vw-btn-p:hover{opacity:.9}
.vw-img{width:100%;border-radius:4px;aspect-ratio:16/8;object-fit:cover;margin-top:18px;box-shadow:0 26px 60px rgba(0,0,0,.12)}
.vw-sec{padding:clamp(54px,8vw,100px) 0}
.vw-head{text-align:center;max-width:620px;margin:0 auto 50px}
.vw-head h2{font-size:clamp(30px,4.6vw,50px);margin-bottom:14px}
.vw-head p{color:var(--muted);font-size:17px}
.vw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.vw-step{text-align:center}
.vw-step .n{font-style:italic;color:var(--ac);font-size:40px;margin-bottom:10px}
.vw-step h3{font-size:22px;margin-bottom:8px}
.vw-step p{color:var(--muted);font-size:15px;font-family:'Inter',sans-serif}
.vw-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.vw-gal img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:4px}
.vw-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:clamp(54px,8vw,96px) 24px}
.vw-final h2{font-size:clamp(32px,5vw,56px);max-width:16ch;margin:0 auto 16px}
.vw-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.vw-grid{grid-template-columns:1fr}.vw-gal{grid-template-columns:1fr 1fr}}
</style>
<div class="vw">
  <section class="vw-wrap vw-hero">
    <span class="vw-eye">{eyebrow}</span>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <a class="vw-btn vw-btn-p" href="#">{cta_primary}</a>
    <img class="vw-img" src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="vw-sec"><div class="vw-wrap">
    <div class="vw-head"><h2>{steps_title}</h2><p>{steps_subtitle}</p></div>
    <div class="vw-grid">
      <div class="vw-step"><div class="n">i</div><h3>{step_1_title}</h3><p>{step_1_desc}</p></div>
      <div class="vw-step"><div class="n">ii</div><h3>{step_2_title}</h3><p>{step_2_desc}</p></div>
      <div class="vw-step"><div class="n">iii</div><h3>{step_3_title}</h3><p>{step_3_desc}</p></div>
    </div>
  </div></section>

  <section class="vw-sec"><div class="vw-wrap">
    <div class="vw-gal">
      <img src="{gal_1}" alt="{hero_title}"><img src="{gal_2}" alt="{hero_title}"><img src="{gal_3}" alt="{hero_title}">
    </div>
  </div></section>

  <section class="vw-sec"><div class="vw-wrap"><div class="vw-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="vw-btn vw-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "vow-wedding", name: "Vow — Wedding Planner", description: "Elegant serif wedding planner landing with steps and a photo gallery.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{hero_image}",
      "{steps_title}", "{steps_subtitle}",
      "{step_1_title}", "{step_1_desc}", "{step_2_title}", "{step_2_desc}", "{step_3_title}", "{step_3_desc}",
      "{gal_1}", "{gal_2}", "{gal_3}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["wedding", "planner", "events", "elegant", "serif"],
    author: "Community", downloads: 489, rating: 4.9,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-wedding",
    schema_type: "Service", platform: "generic",
    defaultValues: {
      eyebrow: "Wedding planning", hero_title: "The day you'll always remember",
      hero_subtitle: "We design timeless celebrations — thoughtfully planned, beautifully styled and perfectly run from first toast to last dance.",
      cta_primary: "Plan your day",
      hero_image: U("1519225421980-715cb0215aed", 1200, 600),
      steps_title: "How it works", steps_subtitle: "A calm, considered process so you can enjoy every moment.",
      step_1_title: "Discover", step_1_desc: "We learn your story, style and dreams over a relaxed consultation.",
      step_2_title: "Design", step_2_desc: "A bespoke plan, mood board and trusted vendors curated for you.",
      step_3_title: "Celebrate", step_3_desc: "We manage every detail on the day so you're fully present.",
      gal_1: U("1465495976277-4387d4b0b4c6", 600, 800), gal_2: U("1511285560929-80b456fea0bc", 600, 800), gal_3: U("1606800052052-a08af7148866", 600, 800),
      final_title: "Let's create something unforgettable", final_subtitle: "Tell us about your wedding and we'll craft a celebration that's entirely yours.",
      final_cta: "Get in touch",
    },
  };
};

/* ───────────────────────── 33. AZURE — Resort / hotel ────────────────────── */
const azureResort = (): MarketplaceTemplate => {
  const content = `<style>
.az{--bg:#0c1c24;--fg:#eef5f7;--muted:#9fb4bc;--line:rgba(255,255,255,.1);--ac:#3ec9c0;--ac2:#4f8cff;--card:#11252e;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.az *{box-sizing:border-box;margin:0}
.az-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.az h1,.az h2,.az h3{letter-spacing:-.02em;line-height:1.08;font-weight:700}
.az-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,124px) 0}
.az-eye{display:inline-block;color:var(--ac);background:rgba(62,201,192,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.az-hero h1{font-size:clamp(40px,6vw,70px);margin-bottom:18px}
.az-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:26px}
.az-cta{display:flex;gap:14px;flex-wrap:wrap}
.az-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.az-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#06181d;box-shadow:0 14px 34px rgba(62,201,192,.3)}
.az-btn-p:hover{transform:translateY(-2px)}
.az-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.az-hero img{width:100%;border-radius:24px;aspect-ratio:4/4.2;object-fit:cover;box-shadow:0 30px 70px rgba(0,0,0,.5)}
.az-sec{padding:clamp(54px,8vw,100px) 0}
.az-head{text-align:center;max-width:640px;margin:0 auto 48px}
.az-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.az-head p{color:var(--muted);font-size:17px}
.az-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.az-room{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.25s}
.az-room:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,.4)}
.az-room img{width:100%;aspect-ratio:4/3;object-fit:cover}
.az-room .b{padding:22px}
.az-room .pr{color:var(--ac);font-weight:700;font-size:19px;margin-bottom:6px}
.az-room h3{font-size:18px;margin-bottom:6px}
.az-room p{color:var(--muted);font-size:14px}
.az-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.az-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.az-final p{color:var(--muted);max-width:46ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.az-hero{grid-template-columns:1fr}.az-grid{grid-template-columns:1fr}}
</style>
<div class="az">
  <section class="az-wrap az-hero">
    <div>
      <span class="az-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="az-cta"><a class="az-btn az-btn-p" href="#">{cta_primary}</a><a class="az-btn az-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="az-sec"><div class="az-wrap">
    <div class="az-head"><h2>{rooms_title}</h2><p>{rooms_subtitle}</p></div>
    <div class="az-grid">
      <div class="az-room"><img src="{room_1_image}" alt="{room_1_title}"><div class="b"><div class="pr">{room_1_price}</div><h3>{room_1_title}</h3><p>{room_1_meta}</p></div></div>
      <div class="az-room"><img src="{room_2_image}" alt="{room_2_title}"><div class="b"><div class="pr">{room_2_price}</div><h3>{room_2_title}</h3><p>{room_2_meta}</p></div></div>
      <div class="az-room"><img src="{room_3_image}" alt="{room_3_title}"><div class="b"><div class="pr">{room_3_price}</div><h3>{room_3_title}</h3><p>{room_3_meta}</p></div></div>
    </div>
  </div></section>

  <section class="az-sec"><div class="az-wrap"><div class="az-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="az-btn az-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "azure-resort", name: "Azure — Resort & Hotel", description: "Coastal resort / hotel landing with room listings, pricing and a booking CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{rooms_title}", "{rooms_subtitle}",
      "{room_1_image}", "{room_1_price}", "{room_1_title}", "{room_1_meta}",
      "{room_2_image}", "{room_2_price}", "{room_2_title}", "{room_2_meta}",
      "{room_3_image}", "{room_3_price}", "{room_3_title}", "{room_3_meta}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["hotel", "resort", "travel", "hospitality", "dark"],
    author: "Community", downloads: 567, rating: 4.8,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-resort",
    schema_type: "Resort", platform: "generic",
    defaultValues: {
      eyebrow: "Seaside escape", hero_title: "Where the ocean meets effortless luxury",
      hero_subtitle: "Wake to sea breezes, unwind by infinity pools and dine under the stars at our award-winning coastal retreat.",
      cta_primary: "Book your stay", cta_secondary: "Explore rooms",
      hero_image: U("1571896349842-33c89424de2d", 900, 950),
      rooms_title: "Rooms & suites", rooms_subtitle: "Spaces designed for rest, with views you'll never forget.",
      room_1_image: U("1566073771259-6a8506099945", 800, 600), room_1_price: "$210 / night", room_1_title: "Ocean view room", room_1_meta: "King bed · Balcony · 38m²",
      room_2_image: U("1582719478250-c89cae4dc85b", 800, 600), room_2_price: "$340 / night", room_2_title: "Garden suite", room_2_meta: "Living area · Terrace · 62m²",
      room_3_image: U("1618773928121-c32242e63f39", 800, 600), room_3_price: "$520 / night", room_3_title: "Beachfront villa", room_3_meta: "Private pool · 2 bed · 110m²",
      final_title: "Your perfect getaway awaits", final_subtitle: "Reserve now and enjoy complimentary breakfast and late checkout on every booking.",
      final_cta: "Reserve now",
    },
  };
};

/* ───────────────────────── 34. SHIELD — Cybersecurity ────────────────────── */
const shieldSecurity = (): MarketplaceTemplate => {
  const content = `<style>
.sh{--bg:#070b14;--fg:#e7edf7;--muted:#8a97ad;--line:rgba(255,255,255,.09);--ac:#36e0a0;--ac2:#2dd4ff;--card:#0d1422;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sh *{box-sizing:border-box;margin:0}
.sh-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.sh h1,.sh h2,.sh h3{letter-spacing:-.025em;line-height:1.05;font-weight:800}
.sh-hero{text-align:center;padding:clamp(72px,11vw,140px) 0}
.sh-eye{display:inline-block;color:var(--ac);border:1px solid rgba(54,224,160,.4);padding:6px 16px;border-radius:99px;font-size:13px;font-weight:600;letter-spacing:.05em;margin-bottom:22px}
.sh-hero h1{font-size:clamp(44px,7.5vw,92px);margin-bottom:20px}
.sh-hero h1 em{font-style:normal;background:linear-gradient(120deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.sh-hero p{color:var(--muted);font-size:clamp(16px,1.8vw,20px);max-width:54ch;margin:0 auto 30px}
.sh-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sh-btn{display:inline-flex;align-items:center;padding:15px 30px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.sh-btn-p{background:linear-gradient(120deg,var(--ac),var(--ac2));color:#04140d;box-shadow:0 14px 36px rgba(54,224,160,.26)}
.sh-btn-p:hover{transform:translateY(-2px)}
.sh-btn-g{border:1px solid var(--line);color:#fff}
.sh-sec{padding:clamp(54px,8vw,100px) 0}
.sh-head{text-align:center;max-width:640px;margin:0 auto 48px}
.sh-head h2{font-size:clamp(28px,4.6vw,48px);margin-bottom:14px}
.sh-head p{color:var(--muted);font-size:17px}
.sh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.sh-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px;transition:.25s}
.sh-card:hover{border-color:rgba(54,224,160,.4);transform:translateY(-4px)}
.sh-card .ic{width:50px;height:50px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:rgba(54,224,160,.1);margin-bottom:18px}
.sh-card h3{font-size:19px;margin-bottom:8px}
.sh-card p{color:var(--muted);font-size:15px}
.sh-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;border:1px solid var(--line);border-radius:20px;padding:44px 28px}
.sh-stats .st{text-align:center}
.sh-stats .st b{display:block;font-size:clamp(28px,4vw,44px);font-weight:800;background:linear-gradient(120deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.sh-stats .st span{color:var(--muted);font-size:14px}
.sh-final{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:clamp(54px,8vw,96px) 24px}
.sh-final h2{font-size:clamp(32px,5.5vw,60px);max-width:16ch;margin:0 auto 16px}
.sh-final p{color:var(--muted);max-width:48ch;margin:0 auto 28px;font-size:17px}
@media(max-width:860px){.sh-grid{grid-template-columns:1fr}.sh-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="sh">
  <section class="sh-wrap sh-hero">
    <span class="sh-eye">{eyebrow}</span>
    <h1>{hero_title} <em>{hero_accent}</em></h1>
    <p>{hero_subtitle}</p>
    <div class="sh-cta"><a class="sh-btn sh-btn-p" href="#">{cta_primary}</a><a class="sh-btn sh-btn-g" href="#">{cta_secondary}</a></div>
  </section>

  <section class="sh-sec"><div class="sh-wrap">
    <div class="sh-head"><h2>{features_title}</h2><p>{features_subtitle}</p></div>
    <div class="sh-grid">
      <div class="sh-card"><div class="ic">🛡️</div><h3>{feat_1_title}</h3><p>{feat_1_desc}</p></div>
      <div class="sh-card"><div class="ic">🔒</div><h3>{feat_2_title}</h3><p>{feat_2_desc}</p></div>
      <div class="sh-card"><div class="ic">⚡</div><h3>{feat_3_title}</h3><p>{feat_3_desc}</p></div>
    </div>
  </div></section>

  <section class="sh-sec"><div class="sh-wrap">
    <div class="sh-stats">
      <div class="st"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="st"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="st"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="st"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="sh-sec"><div class="sh-wrap"><div class="sh-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="sh-btn sh-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "shield-security", name: "Shield — Cybersecurity", description: "Modern cybersecurity SaaS landing with features, stats and a gradient hero.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_accent}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{features_title}", "{features_subtitle}",
      "{feat_1_title}", "{feat_1_desc}", "{feat_2_title}", "{feat_2_desc}", "{feat_3_title}", "{feat_3_desc}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "technology", tags: ["security", "cybersecurity", "saas", "tech", "dark"],
    author: "Community", downloads: 612, rating: 4.9,
    seo_title_pattern: "{hero_title} {hero_accent}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-security",
    schema_type: "SoftwareApplication", platform: "generic",
    defaultValues: {
      eyebrow: "Zero-trust security", hero_title: "Protect everything,", hero_accent: "trust nothing",
      hero_subtitle: "Enterprise-grade threat detection, identity protection and continuous monitoring — all from one intelligent platform.",
      cta_primary: "Start free trial", cta_secondary: "Book a demo",
      features_title: "Defense at every layer", features_subtitle: "Built to stop modern attacks before they reach you.",
      feat_1_title: "Threat detection", feat_1_desc: "Real-time AI monitoring spots and isolates threats in milliseconds.",
      feat_2_title: "Identity & access", feat_2_desc: "Granular zero-trust controls for every user, device and request.",
      feat_3_title: "Instant response", feat_3_desc: "Automated playbooks contain incidents before they spread.",
      stat_1_num: "99.99%", stat_1_label: "Uptime SLA", stat_2_num: "2M+", stat_2_label: "Threats blocked / day", stat_3_num: "<50ms", stat_3_label: "Detection time", stat_4_num: "SOC 2", stat_4_label: "Certified",
      final_title: "Secure your business today", final_subtitle: "Join thousands of teams who trust us to keep their data and customers safe.",
      final_cta: "Get protected",
    },
  };
};

/* ───────────────────────── 35. PETAL — Florist ───────────────────────────── */
const petalFlorist = (): MarketplaceTemplate => {
  const content = `<style>
.pt{--bg:#fdf6f4;--fg:#3a2a2e;--muted:#8a7176;--line:rgba(0,0,0,.07);--ac:#e06b8b;--card:#ffffff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.pt *{box-sizing:border-box;margin:0}
.pt-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
.pt h1,.pt h2,.pt h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.pt-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,120px) 0}
.pt-eye{display:inline-block;color:var(--ac);background:rgba(224,107,139,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.pt-hero h1{font-size:clamp(40px,6vw,68px);margin-bottom:18px}
.pt-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:44ch;margin-bottom:26px}
.pt-cta{display:flex;gap:14px;flex-wrap:wrap}
.pt-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:99px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.pt-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 32px rgba(224,107,139,.28)}
.pt-btn-p:hover{transform:translateY(-2px)}
.pt-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.pt-hero img{width:100%;border-radius:24px;aspect-ratio:4/4;object-fit:cover;box-shadow:0 26px 56px rgba(0,0,0,.12)}
.pt-sec{padding:clamp(54px,8vw,100px) 0}
.pt-head{text-align:center;max-width:600px;margin:0 auto 48px}
.pt-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.pt-head p{color:var(--muted);font-size:17px}
.pt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pt-prod{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.25s}
.pt-prod:hover{transform:translateY(-4px);box-shadow:0 20px 44px rgba(0,0,0,.1)}
.pt-prod img{width:100%;aspect-ratio:1/1;object-fit:cover}
.pt-prod .b{padding:20px;text-align:center}
.pt-prod h3{font-size:18px;margin-bottom:6px}
.pt-prod .pr{color:var(--ac);font-weight:700;font-size:17px}
.pt-final{text-align:center;background:var(--ac);color:#fff;border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.pt-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.pt-final p{opacity:.92;max-width:46ch;margin:0 auto 28px;font-size:17px}
.pt-final .pt-btn-p{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.pt-hero{grid-template-columns:1fr}.pt-grid{grid-template-columns:1fr 1fr}}
</style>
<div class="pt">
  <section class="pt-wrap pt-hero">
    <div>
      <span class="pt-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="pt-cta"><a class="pt-btn pt-btn-p" href="#">{cta_primary}</a><a class="pt-btn pt-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="pt-sec"><div class="pt-wrap">
    <div class="pt-head"><h2>{shop_title}</h2><p>{shop_subtitle}</p></div>
    <div class="pt-grid">
      <div class="pt-prod"><img src="{prod_1_image}" alt="{prod_1_title}"><div class="b"><h3>{prod_1_title}</h3><div class="pr">{prod_1_price}</div></div></div>
      <div class="pt-prod"><img src="{prod_2_image}" alt="{prod_2_title}"><div class="b"><h3>{prod_2_title}</h3><div class="pr">{prod_2_price}</div></div></div>
      <div class="pt-prod"><img src="{prod_3_image}" alt="{prod_3_title}"><div class="b"><h3>{prod_3_title}</h3><div class="pr">{prod_3_price}</div></div></div>
    </div>
  </div></section>

  <section class="pt-sec"><div class="pt-wrap"><div class="pt-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="pt-btn pt-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "petal-florist", name: "Petal — Florist & Flowers", description: "Charming florist shop landing with a product grid and warm CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{shop_title}", "{shop_subtitle}",
      "{prod_1_image}", "{prod_1_title}", "{prod_1_price}",
      "{prod_2_image}", "{prod_2_title}", "{prod_2_price}",
      "{prod_3_image}", "{prod_3_title}", "{prod_3_price}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "ecommerce", tags: ["florist", "flowers", "shop", "gifts", "light"],
    author: "Community", downloads: 398, rating: 4.7,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-flowers",
    schema_type: "Florist", platform: "generic",
    defaultValues: {
      eyebrow: "Fresh blooms daily", hero_title: "Flowers that say it perfectly",
      hero_subtitle: "Hand-tied bouquets and seasonal arrangements, delivered fresh to your door for every occasion.",
      cta_primary: "Shop bouquets", cta_secondary: "Same-day delivery",
      hero_image: U("1490750967868-88aa4486c946", 800, 800),
      shop_title: "Our bestsellers", shop_subtitle: "Lovingly arranged by our florists, ready to brighten any day.",
      prod_1_image: U("1563241527-3004b7be0ffd", 600, 600), prod_1_title: "Garden romance", prod_1_price: "$54",
      prod_2_image: U("1487070183336-b863922373d4", 600, 600), prod_2_title: "Sunlit posy", prod_2_price: "$42",
      prod_3_image: U("1519378058457-4c29a0a2efac", 600, 600), prod_3_title: "Blush peonies", prod_3_price: "$68",
      final_title: "Send a little joy today", final_subtitle: "Order before 2pm for same-day delivery, with a handwritten note included free.",
      final_cta: "Order now",
    },
  };
};

/* ───────────────────────── 36. HIRE — Recruitment / HR ──────────────────── */
const hireRecruit = (): MarketplaceTemplate => {
  const content = `<style>
.hr{--bg:#0f1117;--fg:#eef1f7;--muted:#9aa1b2;--line:rgba(255,255,255,.09);--ac:#7c5cff;--ac2:#4f8cff;--card:#171a23;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.hr *{box-sizing:border-box;margin:0}
.hr-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.hr h1,.hr h2,.hr h3{letter-spacing:-.025em;line-height:1.08;font-weight:800}
.hr-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,124px) 0}
.hr-eye{display:inline-block;color:var(--ac);background:rgba(124,92,255,.14);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600;margin-bottom:18px}
.hr-hero h1{font-size:clamp(40px,6.2vw,72px);margin-bottom:18px}
.hr-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,19px);max-width:46ch;margin-bottom:26px}
.hr-cta{display:flex;gap:14px;flex-wrap:wrap}
.hr-btn{display:inline-flex;align-items:center;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;transition:.25s}
.hr-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 34px rgba(124,92,255,.3)}
.hr-btn-p:hover{transform:translateY(-2px)}
.hr-btn-g{background:var(--card);border:1px solid var(--line);color:var(--fg)}
.hr-hero img{width:100%;border-radius:24px;aspect-ratio:4/3.6;object-fit:cover;box-shadow:0 30px 70px rgba(0,0,0,.45)}
.hr-sec{padding:clamp(54px,8vw,100px) 0}
.hr-head{text-align:center;max-width:640px;margin:0 auto 48px}
.hr-head h2{font-size:clamp(28px,4.4vw,46px);margin-bottom:14px}
.hr-head p{color:var(--muted);font-size:17px}
.hr-jobs{display:grid;gap:14px}
.hr-job{display:flex;justify-content:space-between;align-items:center;gap:18px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 26px;transition:.25s}
.hr-job:hover{border-color:rgba(124,92,255,.4);transform:translateX(4px)}
.hr-job h3{font-size:18px;margin-bottom:4px}
.hr-job p{color:var(--muted);font-size:14px}
.hr-job .tag{flex-shrink:0;color:var(--ac);background:rgba(124,92,255,.12);padding:6px 14px;border-radius:99px;font-size:13px;font-weight:600}
.hr-final{text-align:center;background:linear-gradient(135deg,var(--ac),var(--ac2));border-radius:28px;padding:clamp(54px,8vw,96px) 24px}
.hr-final h2{font-size:clamp(30px,5vw,52px);max-width:16ch;margin:0 auto 16px}
.hr-final p{opacity:.92;max-width:46ch;margin:0 auto 28px;font-size:17px}
.hr-final .hr-btn-p{background:#fff;color:var(--ac);box-shadow:none}
@media(max-width:860px){.hr-hero{grid-template-columns:1fr}.hr-job{flex-direction:column;align-items:flex-start}}
</style>
<div class="hr">
  <section class="hr-wrap hr-hero">
    <div>
      <span class="hr-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="hr-cta"><a class="hr-btn hr-btn-p" href="#">{cta_primary}</a><a class="hr-btn hr-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="hr-sec"><div class="hr-wrap">
    <div class="hr-head"><h2>{jobs_title}</h2><p>{jobs_subtitle}</p></div>
    <div class="hr-jobs">
      <div class="hr-job"><div><h3>{job_1_title}</h3><p>{job_1_meta}</p></div><span class="tag">{job_1_tag}</span></div>
      <div class="hr-job"><div><h3>{job_2_title}</h3><p>{job_2_meta}</p></div><span class="tag">{job_2_tag}</span></div>
      <div class="hr-job"><div><h3>{job_3_title}</h3><p>{job_3_meta}</p></div><span class="tag">{job_3_tag}</span></div>
      <div class="hr-job"><div><h3>{job_4_title}</h3><p>{job_4_meta}</p></div><span class="tag">{job_4_tag}</span></div>
    </div>
  </div></section>

  <section class="hr-sec"><div class="hr-wrap"><div class="hr-final">
    <h2>{final_title}</h2><p>{final_subtitle}</p>
    <a class="hr-btn hr-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "hire-recruit", name: "Hire — Recruitment & Careers", description: "Recruitment / careers landing with a job listings board and hiring CTA.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{jobs_title}", "{jobs_subtitle}",
      "{job_1_title}", "{job_1_meta}", "{job_1_tag}",
      "{job_2_title}", "{job_2_meta}", "{job_2_tag}",
      "{job_3_title}", "{job_3_meta}", "{job_3_tag}",
      "{job_4_title}", "{job_4_meta}", "{job_4_tag}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business", tags: ["recruitment", "careers", "jobs", "hr", "dark"],
    author: "Community", downloads: 452, rating: 4.8,
    seo_title_pattern: "{hero_title}", seo_description_pattern: "{hero_subtitle}", slug_pattern: "{eyebrow}-careers",
    schema_type: "Organization", platform: "generic",
    defaultValues: {
      eyebrow: "We're hiring", hero_title: "Build your career with people who get it",
      hero_subtitle: "Join a team that values growth, ownership and balance. Explore open roles and find where you belong.",
      cta_primary: "View open roles", cta_secondary: "Life at the company",
      hero_image: U("1521737604893-d14cc237f11d", 900, 780),
      jobs_title: "Open positions", jobs_subtitle: "We're growing fast — here's where you can make an impact.",
      job_1_title: "Senior Product Designer", job_1_meta: "Design · Remote · Full-time", job_1_tag: "Remote",
      job_2_title: "Backend Engineer", job_2_meta: "Engineering · Hybrid · Full-time", job_2_tag: "Hybrid",
      job_3_title: "Growth Marketer", job_3_meta: "Marketing · Remote · Full-time", job_3_tag: "Remote",
      job_4_title: "Customer Success Lead", job_4_meta: "Support · On-site · Full-time", job_4_tag: "On-site",
      final_title: "Don't see the right role?", final_subtitle: "We're always looking for talented people. Send us your details and we'll be in touch.",
      final_cta: "Submit your CV",
    },
  };
};

export const FRAMER_BATCH6_TEMPLATES: MarketplaceTemplate[] = [
  pawsVet(),
  vowWedding(),
  azureResort(),
  shieldSecurity(),
  petalFlorist(),
  hireRecruit(),
];
