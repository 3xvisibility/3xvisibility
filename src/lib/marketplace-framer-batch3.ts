// Framer-modelled marketplace templates — Batch 3 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 13. SONIC — Podcast ──────────────────────────── */
const sonicPodcast = (): MarketplaceTemplate => {
  const content = `<style>
.sn{--bg:#0b0a14;--fg:#f3f0ff;--muted:#9a96b8;--line:rgba(255,255,255,.1);--ac:#ff5d73;--ac2:#7c5cff;--card:#13111f;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sn *{box-sizing:border-box;margin:0}
.sn-wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.sn h1,.sn h2,.sn h3{letter-spacing:-.03em;line-height:1.08;font-weight:700}
.sn-hero{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding:clamp(70px,11vw,140px) 0}
.sn-hero::before{content:'';position:absolute;width:600px;height:480px;left:-120px;top:0;background:radial-gradient(circle,rgba(124,92,255,.22),transparent 65%);pointer-events:none}
.sn-eye{display:inline-block;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:18px}
.sn-hero h1{position:relative;font-size:clamp(40px,6.4vw,76px);margin-bottom:22px}
.sn-hero h1 .g{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.sn-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:46ch;margin-bottom:30px}
.sn-cta{display:flex;gap:14px;flex-wrap:wrap}
.sn-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.sn-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 40px rgba(124,92,255,.35)}
.sn-btn-p:hover{transform:translateY(-2px)}
.sn-btn-g{background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--fg)}
.sn-cover{position:relative}
.sn-cover img{width:100%;border-radius:24px;aspect-ratio:1;object-fit:cover;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.sn-sec{padding:clamp(56px,8vw,100px) 0}
.sn-eye2{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
.sn-sec h2{text-align:center;font-size:clamp(28px,4.4vw,46px);max-width:18ch;margin:0 auto 46px}
.sn-ep{display:flex;align-items:center;gap:20px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 22px;margin-bottom:14px;transition:.25s}
.sn-ep:hover{transform:translateY(-2px);border-color:rgba(255,93,115,.4)}
.sn-ep img{width:72px;height:72px;border-radius:12px;object-fit:cover;flex-shrink:0}
.sn-ep .meta{flex:1}
.sn-ep .meta span{color:var(--ac);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.1em}
.sn-ep .meta h3{font-size:18px;margin:4px 0 6px}
.sn-ep .meta p{color:var(--muted);font-size:14px}
.sn-ep .play{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--ac),var(--ac2));display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0}
.sn-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px;background:radial-gradient(100% 140% at 50% 0%,rgba(124,92,255,.18),transparent 60%)}
.sn-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 18px}
.sn-final p{color:var(--muted);max-width:46ch;margin:0 auto 30px;font-size:17px}
@media(max-width:860px){.sn-hero{grid-template-columns:1fr}}
</style>
<div class="sn">
  <section class="sn-wrap sn-hero">
    <div>
      <span class="sn-eye">{eyebrow}</span>
      <h1>{hero_title_a} <span class="g">{hero_title_b}</span></h1>
      <p>{hero_subtitle}</p>
      <div class="sn-cta"><a class="sn-btn sn-btn-p" href="#">{cta_primary}</a><a class="sn-btn sn-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <div class="sn-cover"><img src="{hero_image}" alt="{hero_title_a}"></div>
  </section>

  <section class="sn-sec"><div class="sn-wrap">
    <div class="sn-eye2">{episodes_eyebrow}</div>
    <h2>{episodes_title}</h2>
    <div class="sn-ep"><img src="{ep_1_image}" alt="{ep_1_title}"><div class="meta"><span>{ep_1_tag}</span><h3>{ep_1_title}</h3><p>{ep_1_desc}</p></div><div class="play">▶</div></div>
    <div class="sn-ep"><img src="{ep_2_image}" alt="{ep_2_title}"><div class="meta"><span>{ep_2_tag}</span><h3>{ep_2_title}</h3><p>{ep_2_desc}</p></div><div class="play">▶</div></div>
    <div class="sn-ep"><img src="{ep_3_image}" alt="{ep_3_title}"><div class="meta"><span>{ep_3_tag}</span><h3>{ep_3_title}</h3><p>{ep_3_desc}</p></div><div class="play">▶</div></div>
    <div class="sn-ep"><img src="{ep_4_image}" alt="{ep_4_title}"><div class="meta"><span>{ep_4_tag}</span><h3>{ep_4_title}</h3><p>{ep_4_desc}</p></div><div class="play">▶</div></div>
  </div></section>

  <section class="sn-sec"><div class="sn-wrap"><div class="sn-final">
    <h2>{final_title}</h2>
    <p>{final_subtitle}</p>
    <a class="sn-btn sn-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "podcast-show",
    name: "Podcast Show Template",
    description: "Vibrant podcast landing — gradient split hero with cover art, an episode list with play buttons and a glowing subscribe CTA. Modelled on Framer podcast templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{episodes_eyebrow}", "{episodes_title}",
      "{ep_1_tag}", "{ep_1_title}", "{ep_1_desc}", "{ep_1_image}",
      "{ep_2_tag}", "{ep_2_title}", "{ep_2_desc}", "{ep_2_image}",
      "{ep_3_tag}", "{ep_3_title}", "{ep_3_desc}", "{ep_3_image}",
      "{ep_4_tag}", "{ep_4_title}", "{ep_4_desc}", "{ep_4_image}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "personal",
    tags: ["podcast", "audio", "media", "dark", "show"],
    author: "Community", downloads: 472, rating: 4.8,
    seo_title_pattern: "{hero_title_a} {hero_title_b}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "{hero_title_b}-podcast",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      eyebrow: "New episodes weekly", hero_title_a: "Conversations that", hero_title_b: "move you forward",
      hero_subtitle: "Honest talks with founders, creators and thinkers about the craft of building a life and work you love.",
      cta_primary: "Listen now", cta_secondary: "Subscribe",
      hero_image: U("1478737270239-2f02b77fc618", 800, 800),
      episodes_eyebrow: "Latest episodes", episodes_title: "Catch up on recent shows",
      ep_1_tag: "Episode 42", ep_1_title: "Building in public", ep_1_desc: "How sharing the messy middle builds trust and an audience.", ep_1_image: U("1590602847861-f357a9332bbc", 200, 200),
      ep_2_tag: "Episode 41", ep_2_title: "The art of saying no", ep_2_desc: "Why focus is the rarest superpower for creators.", ep_2_image: U("1505740420928-5e560c06d30e", 200, 200),
      ep_3_tag: "Episode 40", ep_3_title: "From side project to startup", ep_3_desc: "The messy path from nights-and-weekends to full time.", ep_3_image: U("1511671782779-c97d3d27a1d4", 200, 200),
      ep_4_tag: "Episode 39", ep_4_title: "Designing for calm", ep_4_desc: "Lessons on building products that respect attention.", ep_4_image: U("1554118811-1e0d58224f24", 200, 200),
      final_title: "Never miss an episode", final_subtitle: "Subscribe on your favourite platform and get new shows the moment they drop.",
      final_cta: "Subscribe free",
    },
  };
};

/* ───────────────────────── 14. WANDER — Travel ──────────────────────────── */
const wanderTravel = (): MarketplaceTemplate => {
  const content = `<style>
.wd{--bg:#fbfaf7;--fg:#1c2218;--muted:#5f6a58;--line:#e7e3d8;--ac:#2f7d52;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.wd *{box-sizing:border-box;margin:0}
.wd-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.wd h1,.wd h2,.wd h3{letter-spacing:-.02em;line-height:1.08;font-weight:700}
.wd-hero{position:relative;min-height:88vh;display:flex;align-items:flex-end;background-size:cover;background-position:center;border-radius:0 0 32px 32px;overflow:hidden}
.wd-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.6))}
.wd-hero .in{position:relative;z-index:2;color:#fff;padding:clamp(40px,7vw,80px) 0;width:100%}
.wd-hero .eye{color:#cfe9d8;font-size:13px;text-transform:uppercase;letter-spacing:.2em;margin-bottom:16px}
.wd-hero h1{font-size:clamp(40px,7vw,86px);max-width:16ch;margin-bottom:20px}
.wd-hero p{font-size:clamp(16px,1.8vw,20px);max-width:46ch;opacity:.92;margin-bottom:28px}
.wd-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.wd-btn-p{background:var(--ac);color:#fff}
.wd-btn-p:hover{filter:brightness(1.08)}
.wd-btn-o{border:1px solid var(--fg);color:var(--fg)}
.wd-sec{padding:clamp(56px,8vw,100px) 0}
.wd-eye{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:14px}
.wd-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.wd-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 50px;font-size:17px}
.wd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.wd-card{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden;transition:.25s}
.wd-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,.1)}
.wd-card img{width:100%;aspect-ratio:4/3;object-fit:cover}
.wd-card .body{padding:22px}
.wd-card .body .loc{color:var(--ac);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.1em}
.wd-card .body h3{font-size:20px;margin:6px 0 8px}
.wd-card .body p{color:var(--muted);font-size:14px;margin-bottom:14px}
.wd-card .body .price{font-weight:700;font-size:18px}
.wd-card .body .price span{color:var(--muted);font-weight:400;font-size:13px}
.wd-final{position:relative;text-align:center;border-radius:28px;overflow:hidden;padding:clamp(56px,9vw,110px) 24px;background-size:cover;background-position:center}
.wd-final::before{content:'';position:absolute;inset:0;background:rgba(20,30,20,.66)}
.wd-final .in{position:relative;z-index:2;color:#fff}
.wd-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 18px}
.wd-final p{max-width:46ch;margin:0 auto 30px;font-size:17px;opacity:.92}
@media(max-width:860px){.wd-grid{grid-template-columns:1fr}}
</style>
<div class="wd">
  <section class="wd-hero" style="background-image:url('{hero_image}')"><div class="wd-wrap in">
    <div class="eye">{eyebrow}</div>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <a class="wd-btn wd-btn-p" href="#">{cta_primary}</a>
  </div></section>

  <section class="wd-sec"><div class="wd-wrap">
    <div class="wd-eye">{trips_eyebrow}</div>
    <h2>{trips_title}</h2>
    <p class="wd-sub">{trips_subtitle}</p>
    <div class="wd-grid">
      <div class="wd-card"><img src="{trip_1_image}" alt="{trip_1_title}"><div class="body"><div class="loc">{trip_1_loc}</div><h3>{trip_1_title}</h3><p>{trip_1_desc}</p><div class="price">{trip_1_price} <span>{trip_1_unit}</span></div></div></div>
      <div class="wd-card"><img src="{trip_2_image}" alt="{trip_2_title}"><div class="body"><div class="loc">{trip_2_loc}</div><h3>{trip_2_title}</h3><p>{trip_2_desc}</p><div class="price">{trip_2_price} <span>{trip_2_unit}</span></div></div></div>
      <div class="wd-card"><img src="{trip_3_image}" alt="{trip_3_title}"><div class="body"><div class="loc">{trip_3_loc}</div><h3>{trip_3_title}</h3><p>{trip_3_desc}</p><div class="price">{trip_3_price} <span>{trip_3_unit}</span></div></div></div>
    </div>
  </div></section>

  <section class="wd-sec"><div class="wd-wrap"><div class="wd-final" style="background-image:url('{final_image}')"><div class="in">
    <h2>{final_title}</h2>
    <p>{final_subtitle}</p>
    <a class="wd-btn wd-btn-p" href="#">{final_cta}</a>
  </div></div></div></section>
</div>`;
  return {
    id: "travel-and-tours",
    name: "Travel & Tours Template",
    description: "Earthy travel / tour-operator page — full-bleed destination hero, three trip cards with location, price and a closing booking CTA over a scenic backdrop. Modelled on Framer travel templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{hero_image}",
      "{trips_eyebrow}", "{trips_title}", "{trips_subtitle}",
      "{trip_1_loc}", "{trip_1_title}", "{trip_1_desc}", "{trip_1_price}", "{trip_1_unit}", "{trip_1_image}",
      "{trip_2_loc}", "{trip_2_title}", "{trip_2_desc}", "{trip_2_price}", "{trip_2_unit}", "{trip_2_image}",
      "{trip_3_loc}", "{trip_3_title}", "{trip_3_desc}", "{trip_3_price}", "{trip_3_unit}", "{trip_3_image}",
      "{final_title}", "{final_subtitle}", "{final_cta}", "{final_image}",
    ],
    category: "business",
    tags: ["travel", "tours", "tourism", "light", "adventure"],
    author: "Community", downloads: 561, rating: 4.9,
    seo_title_pattern: "{hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "wander-travel",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      eyebrow: "Curated adventures", hero_title: "See the world, one journey at a time",
      hero_subtitle: "Small-group trips to extraordinary places, planned down to the last detail by people who live there.",
      cta_primary: "Explore trips", hero_image: U("1469474968028-56623f02e42e", 1600, 1000),
      trips_eyebrow: "Featured trips", trips_title: "Where will you go next?",
      trips_subtitle: "Hand-picked itineraries for every kind of traveller — from slow escapes to big adventures.",
      trip_1_loc: "Patagonia, Chile", trip_1_title: "Glaciers & peaks trek", trip_1_desc: "Eight days hiking through one of the wildest landscapes on earth.", trip_1_price: "$2,490", trip_1_unit: "/ person", trip_1_image: U("1426604966848-d7adac402bff", 800, 600),
      trip_2_loc: "Kyoto, Japan", trip_2_title: "Temples & gardens tour", trip_2_desc: "A calm week exploring ancient streets, shrines and tea houses.", trip_2_price: "$1,980", trip_2_unit: "/ person", trip_2_image: U("1493976040374-85c8e12f0c0e", 800, 600),
      trip_3_loc: "Santorini, Greece", trip_3_title: "Island sailing escape", trip_3_desc: "Sun-soaked days hopping between whitewashed island villages.", trip_3_price: "$2,150", trip_3_unit: "/ person", trip_3_image: U("1570077188670-e3a8d69ac5ff", 800, 600),
      final_title: "Your next story starts here", final_subtitle: "Tell us where you dream of going and we'll craft the perfect trip.",
      final_cta: "Plan my trip", final_image: U("1507525428034-b723cf961d3e", 1600, 900),
    },
  };
};

/* ───────────────────────── 15. BLOOM — Charity ──────────────────────────── */
const bloomCharity = (): MarketplaceTemplate => {
  const content = `<style>
.bl{--bg:#fffaf6;--fg:#241c1a;--muted:#6b5d57;--line:#efe5dc;--ac:#e0633a;--ac2:#1f8a70;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.bl *{box-sizing:border-box;margin:0}
.bl-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.bl h1,.bl h2,.bl h3{letter-spacing:-.02em;line-height:1.1;font-weight:700}
.bl-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,130px) 0}
.bl-eye{display:inline-block;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:18px}
.bl-hero h1{font-size:clamp(40px,6.4vw,76px);margin-bottom:22px}
.bl-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:46ch;margin-bottom:30px}
.bl-cta{display:flex;gap:14px;flex-wrap:wrap}
.bl-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.bl-btn-p{background:var(--ac);color:#fff;box-shadow:0 14px 36px rgba(224,99,58,.3)}
.bl-btn-p:hover{transform:translateY(-2px)}
.bl-btn-o{border:1px solid var(--fg);color:var(--fg)}
.bl-hero img{width:100%;border-radius:24px;aspect-ratio:5/4;object-fit:cover}
.bl-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:0 0 clamp(50px,8vw,90px)}
.bl-stat{text-align:center;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px 18px}
.bl-stat b{display:block;font-size:clamp(30px,4vw,46px);color:var(--ac2)}
.bl-stat span{color:var(--muted);font-size:14px}
.bl-sec{padding:clamp(56px,8vw,100px) 0}
.bl-eye2{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:14px}
.bl-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.bl-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 50px;font-size:17px}
.bl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.bl-card{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden}
.bl-card img{width:100%;aspect-ratio:3/2;object-fit:cover}
.bl-card .body{padding:24px}
.bl-card .body h3{font-size:19px;margin-bottom:10px}
.bl-card .body p{color:var(--muted);font-size:15px}
.bl-final{position:relative;text-align:center;border-radius:28px;padding:clamp(54px,8vw,100px) 24px;background:linear-gradient(135deg,#e0633a,#c84e2a);color:#fff}
.bl-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 18px}
.bl-final p{max-width:46ch;margin:0 auto 30px;font-size:17px;opacity:.94}
.bl-final .bl-btn-w{background:#fff;color:var(--ac)}
@media(max-width:860px){.bl-hero,.bl-grid,.bl-stats{grid-template-columns:1fr}}
</style>
<div class="bl">
  <section class="bl-wrap bl-hero">
    <div>
      <span class="bl-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="bl-cta"><a class="bl-btn bl-btn-p" href="#">{cta_primary}</a><a class="bl-btn bl-btn-o" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="bl-wrap"><div class="bl-stats">
    <div class="bl-stat"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
    <div class="bl-stat"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
    <div class="bl-stat"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
  </div></section>

  <section class="bl-sec"><div class="bl-wrap">
    <div class="bl-eye2">{programs_eyebrow}</div>
    <h2>{programs_title}</h2>
    <p class="bl-sub">{programs_subtitle}</p>
    <div class="bl-grid">
      <div class="bl-card"><img src="{prog_1_image}" alt="{prog_1_title}"><div class="body"><h3>{prog_1_title}</h3><p>{prog_1_desc}</p></div></div>
      <div class="bl-card"><img src="{prog_2_image}" alt="{prog_2_title}"><div class="body"><h3>{prog_2_title}</h3><p>{prog_2_desc}</p></div></div>
      <div class="bl-card"><img src="{prog_3_image}" alt="{prog_3_title}"><div class="body"><h3>{prog_3_title}</h3><p>{prog_3_desc}</p></div></div>
    </div>
  </div></section>

  <section class="bl-sec"><div class="bl-wrap"><div class="bl-final">
    <h2>{final_title}</h2>
    <p>{final_subtitle}</p>
    <a class="bl-btn bl-btn-w" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "charity-and-nonprofit",
    name: "Charity & Nonprofit Template",
    description: "Warm nonprofit / charity page — split hero with donate CTA, an impact stat row, three program cards and a bold donation CTA banner. Modelled on Framer nonprofit templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}",
      "{programs_eyebrow}", "{programs_title}", "{programs_subtitle}",
      "{prog_1_title}", "{prog_1_desc}", "{prog_1_image}",
      "{prog_2_title}", "{prog_2_desc}", "{prog_2_image}",
      "{prog_3_title}", "{prog_3_desc}", "{prog_3_image}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["charity", "nonprofit", "donate", "light", "community"],
    author: "Community", downloads: 503, rating: 4.9,
    seo_title_pattern: "{hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "bloom-charity",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      eyebrow: "Together we can", hero_title: "Small acts, lasting change",
      hero_subtitle: "We bring clean water, education and hope to communities that need it most — and every gift goes further than you think.",
      cta_primary: "Donate now", cta_secondary: "Volunteer",
      hero_image: U("1488521787991-ed7bbaae773c", 900, 720),
      stat_1_num: "120k+", stat_1_label: "People reached", stat_2_num: "38", stat_2_label: "Countries", stat_3_num: "94%", stat_3_label: "Goes to programs",
      programs_eyebrow: "Our work", programs_title: "Where your support goes",
      programs_subtitle: "Focused programs designed with local partners for real, measurable impact.",
      prog_1_title: "Clean water", prog_1_desc: "Wells and filtration systems that give villages safe water for life.", prog_1_image: U("1541802645635-11f2286a7482", 800, 540),
      prog_2_title: "Education", prog_2_desc: "Classrooms, books and teachers so every child can learn.", prog_2_image: U("1497633762265-9d179a990aa6", 800, 540),
      prog_3_title: "Healthcare", prog_3_desc: "Mobile clinics bringing care to remote communities.", prog_3_image: U("1576091160550-2173dba999ef", 800, 540),
      final_title: "Be the reason someone smiles today", final_subtitle: "Your donation, big or small, creates ripples of change that last for generations.",
      final_cta: "Make a donation",
    },
  };
};

/* ───────────────────────── 16. FADE — Barber / Salon ────────────────────── */
const fadeBarber = (): MarketplaceTemplate => {
  const content = `<style>
.fd{--bg:#101010;--fg:#f4f1ea;--muted:#a39d92;--line:rgba(255,255,255,.12);--ac:#c89b3c;--card:#181715;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.fd *{box-sizing:border-box;margin:0}
.fd-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.fd-serif{font-family:'Playfair Display',Georgia,serif}
.fd h1,.fd h2,.fd h3{letter-spacing:.01em;line-height:1.08;font-weight:600}
.fd-hero{position:relative;min-height:90vh;display:flex;align-items:center;text-align:center;background-size:cover;background-position:center}
.fd-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,16,16,.45),rgba(16,16,16,.85))}
.fd-hero .in{position:relative;z-index:2;width:100%}
.fd-hero .eye{color:var(--ac);font-size:13px;text-transform:uppercase;letter-spacing:.26em;margin-bottom:18px}
.fd-hero h1{font-size:clamp(46px,9vw,108px);max-width:16ch;margin:0 auto 20px}
.fd-hero p{color:var(--fg);opacity:.9;font-size:clamp(16px,1.8vw,20px);max-width:44ch;margin:0 auto 30px}
.fd-btn{display:inline-flex;align-items:center;gap:8px;padding:15px 34px;border-radius:2px;font-weight:600;font-size:14px;text-decoration:none;transition:.25s;letter-spacing:.08em;text-transform:uppercase}
.fd-btn-p{background:var(--ac);color:#101010}
.fd-btn-p:hover{filter:brightness(1.08)}
.fd-sec{padding:clamp(56px,8vw,100px) 0}
.fd-eye{text-align:center;color:var(--ac);font-size:13px;text-transform:uppercase;letter-spacing:.22em;margin-bottom:14px}
.fd-sec h2{text-align:center;font-size:clamp(30px,5vw,52px);max-width:18ch;margin:0 auto 50px}
.fd-srv{display:grid;grid-template-columns:1fr 1fr;gap:14px 56px;max-width:880px;margin:0 auto}
.fd-row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:18px 0;border-bottom:1px solid var(--line)}
.fd-row h3{font-size:19px}
.fd-row p{color:var(--muted);font-size:14px;margin-top:4px}
.fd-row .pr{color:var(--ac);font-weight:700;white-space:nowrap;font-size:18px}
.fd-gal{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.fd-gal img{width:100%;aspect-ratio:3/4;object-fit:cover;transition:.4s}
.fd-gal img:hover{transform:scale(1.04)}
.fd-final{position:relative;text-align:center;border-radius:8px;overflow:hidden;padding:clamp(56px,9vw,110px) 24px;background-size:cover;background-position:center}
.fd-final::before{content:'';position:absolute;inset:0;background:rgba(16,16,16,.8)}
.fd-final .in{position:relative;z-index:2}
.fd-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 18px}
.fd-final p{color:var(--muted);max-width:44ch;margin:0 auto 30px;font-size:17px}
@media(max-width:860px){.fd-srv,.fd-gal{grid-template-columns:1fr}.fd-gal{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="fd">
  <section class="fd-hero" style="background-image:url('{hero_image}')"><div class="fd-wrap in">
    <div class="eye">{eyebrow}</div>
    <h1 class="fd-serif">{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <a class="fd-btn fd-btn-p" href="#">{cta_primary}</a>
  </div></section>

  <section class="fd-sec"><div class="fd-wrap">
    <div class="fd-eye">{services_eyebrow}</div>
    <h2 class="fd-serif">{services_title}</h2>
    <div class="fd-srv">
      <div class="fd-row"><div><h3>{srv_1_name}</h3><p>{srv_1_desc}</p></div><div class="pr">{srv_1_price}</div></div>
      <div class="fd-row"><div><h3>{srv_2_name}</h3><p>{srv_2_desc}</p></div><div class="pr">{srv_2_price}</div></div>
      <div class="fd-row"><div><h3>{srv_3_name}</h3><p>{srv_3_desc}</p></div><div class="pr">{srv_3_price}</div></div>
      <div class="fd-row"><div><h3>{srv_4_name}</h3><p>{srv_4_desc}</p></div><div class="pr">{srv_4_price}</div></div>
    </div>
  </div></section>

  <section class="fd-sec"><div class="fd-wrap">
    <div class="fd-eye">{gallery_eyebrow}</div>
    <h2 class="fd-serif">{gallery_title}</h2>
    <div class="fd-gal">
      <img src="{gal_1}" alt="Cut 1"><img src="{gal_2}" alt="Cut 2"><img src="{gal_3}" alt="Cut 3"><img src="{gal_4}" alt="Cut 4">
    </div>
  </div></section>

  <section class="fd-sec"><div class="fd-wrap"><div class="fd-final" style="background-image:url('{final_image}')"><div class="in">
    <h2 class="fd-serif">{final_title}</h2>
    <p>{final_subtitle}</p>
    <a class="fd-btn fd-btn-p" href="#">{final_cta}</a>
  </div></div></div></section>
</div>`;
  return {
    id: "barber-and-grooming",
    name: "Barber & Grooming Template",
    description: "Bold barbershop / salon page — cinematic dark hero, a two-column price list, a four-up gallery grid and a booking CTA over a backdrop. Modelled on Framer barbershop templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{hero_image}",
      "{services_eyebrow}", "{services_title}",
      "{srv_1_name}", "{srv_1_desc}", "{srv_1_price}",
      "{srv_2_name}", "{srv_2_desc}", "{srv_2_price}",
      "{srv_3_name}", "{srv_3_desc}", "{srv_3_price}",
      "{srv_4_name}", "{srv_4_desc}", "{srv_4_price}",
      "{gallery_eyebrow}", "{gallery_title}", "{gal_1}", "{gal_2}", "{gal_3}", "{gal_4}",
      "{final_title}", "{final_subtitle}", "{final_cta}", "{final_image}",
    ],
    category: "business",
    tags: ["barber", "salon", "grooming", "dark", "booking"],
    author: "Community", downloads: 487, rating: 4.8,
    seo_title_pattern: "{hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "fade-barber",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      eyebrow: "Est. craft barbershop", hero_title: "Sharp cuts, classic care",
      hero_subtitle: "Precision haircuts, hot-towel shaves and grooming done the old-fashioned way — by hands that take their time.",
      cta_primary: "Book a chair", hero_image: U("1503951914875-452162b0f3f1", 1600, 1000),
      services_eyebrow: "The menu", services_title: "Services & pricing",
      srv_1_name: "Signature haircut", srv_1_desc: "Consultation, cut and style.", srv_1_price: "$35",
      srv_2_name: "Beard trim & shape", srv_2_desc: "Line-up with hot towel finish.", srv_2_price: "$22",
      srv_3_name: "Hot-towel shave", srv_3_desc: "Classic straight-razor shave.", srv_3_price: "$30",
      srv_4_name: "Cut + beard combo", srv_4_desc: "The full grooming package.", srv_4_price: "$50",
      gallery_eyebrow: "Our work", gallery_title: "Fresh from the chair",
      gal_1: U("1599351431202-1e0f0137899a", 600, 800), gal_2: U("1622286342621-4bd786c2447c", 600, 800), gal_3: U("1605497788044-5a32c7078486", 600, 800), gal_4: U("1521590832167-7bcbfaa6381f", 600, 800),
      final_title: "Look sharp. Feel sharper.", final_subtitle: "Walk-ins welcome, but booking ahead means no wait. Grab your slot today.",
      final_cta: "Book now", final_image: U("1585747860715-2ba37e788b70", 1600, 900),
    },
  };
};

/* ───────────────────────── 17. ROAST — Coffee Brand ─────────────────────── */
const roastCoffee = (): MarketplaceTemplate => {
  const content = `<style>
.rc{--bg:#1b120c;--fg:#f5ece1;--muted:#c2ad9a;--line:rgba(255,255,255,.12);--ac:#d98a3d;--card:#241811;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.rc *{box-sizing:border-box;margin:0}
.rc-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.rc h1,.rc h2,.rc h3{letter-spacing:-.02em;line-height:1.08;font-weight:700}
.rc-hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:clamp(64px,10vw,130px) 0}
.rc-eye{display:inline-block;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:18px}
.rc-hero h1{font-size:clamp(42px,6.6vw,80px);margin-bottom:22px}
.rc-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:46ch;margin-bottom:30px}
.rc-cta{display:flex;gap:14px;flex-wrap:wrap}
.rc-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.rc-btn-p{background:var(--ac);color:#1b120c;box-shadow:0 14px 36px rgba(217,138,61,.28)}
.rc-btn-p:hover{transform:translateY(-2px)}
.rc-btn-o{border:1px solid var(--fg);color:var(--fg)}
.rc-hero img{width:100%;border-radius:24px;aspect-ratio:4/5;object-fit:cover}
.rc-sec{padding:clamp(56px,8vw,100px) 0}
.rc-eye2{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
.rc-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.rc-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 50px;font-size:17px}
.rc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.rc-card{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden;text-align:center;transition:.25s}
.rc-card:hover{transform:translateY(-4px)}
.rc-card img{width:100%;aspect-ratio:1;object-fit:cover}
.rc-card .body{padding:24px}
.rc-card .body .tag{color:var(--ac);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.1em}
.rc-card .body h3{font-size:20px;margin:6px 0 10px}
.rc-card .body p{color:var(--muted);font-size:14px;margin-bottom:14px}
.rc-card .body .price{font-weight:700;font-size:20px}
.rc-feat{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;text-align:center}
.rc-feat .it .ic{font-size:30px;margin-bottom:12px}
.rc-feat .it h3{font-size:18px;margin-bottom:8px}
.rc-feat .it p{color:var(--muted);font-size:15px}
.rc-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px;background:radial-gradient(100% 140% at 50% 0%,rgba(217,138,61,.16),transparent 60%)}
.rc-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 18px}
.rc-final p{color:var(--muted);max-width:46ch;margin:0 auto 30px;font-size:17px}
@media(max-width:860px){.rc-hero,.rc-grid,.rc-feat{grid-template-columns:1fr}}
</style>
<div class="rc">
  <section class="rc-wrap rc-hero">
    <div>
      <span class="rc-eye">{eyebrow}</span>
      <h1>{hero_title}</h1>
      <p>{hero_subtitle}</p>
      <div class="rc-cta"><a class="rc-btn rc-btn-p" href="#">{cta_primary}</a><a class="rc-btn rc-btn-o" href="#">{cta_secondary}</a></div>
    </div>
    <img src="{hero_image}" alt="{hero_title}">
  </section>

  <section class="rc-sec"><div class="rc-wrap">
    <div class="rc-eye2">{products_eyebrow}</div>
    <h2>{products_title}</h2>
    <p class="rc-sub">{products_subtitle}</p>
    <div class="rc-grid">
      <div class="rc-card"><img src="{prod_1_image}" alt="{prod_1_title}"><div class="body"><div class="tag">{prod_1_tag}</div><h3>{prod_1_title}</h3><p>{prod_1_desc}</p><div class="price">{prod_1_price}</div></div></div>
      <div class="rc-card"><img src="{prod_2_image}" alt="{prod_2_title}"><div class="body"><div class="tag">{prod_2_tag}</div><h3>{prod_2_title}</h3><p>{prod_2_desc}</p><div class="price">{prod_2_price}</div></div></div>
      <div class="rc-card"><img src="{prod_3_image}" alt="{prod_3_title}"><div class="body"><div class="tag">{prod_3_tag}</div><h3>{prod_3_title}</h3><p>{prod_3_desc}</p><div class="price">{prod_3_price}</div></div></div>
    </div>
  </div></section>

  <section class="rc-sec"><div class="rc-wrap">
    <div class="rc-feat">
      <div class="it"><div class="ic">🌱</div><h3>{feat_1_title}</h3><p>{feat_1_desc}</p></div>
      <div class="it"><div class="ic">🔥</div><h3>{feat_2_title}</h3><p>{feat_2_desc}</p></div>
      <div class="it"><div class="ic">🚚</div><h3>{feat_3_title}</h3><p>{feat_3_desc}</p></div>
    </div>
  </div></section>

  <section class="rc-sec"><div class="rc-wrap"><div class="rc-final">
    <h2>{final_title}</h2>
    <p>{final_subtitle}</p>
    <a class="rc-btn rc-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "coffee-brand",
    name: "Coffee Brand Template",
    description: "Rich coffee-brand / e-commerce page — split hero with shop CTA, three product cards with prices, a three-up benefits row and a warm closing CTA. Modelled on Framer coffee templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{products_eyebrow}", "{products_title}", "{products_subtitle}",
      "{prod_1_tag}", "{prod_1_title}", "{prod_1_desc}", "{prod_1_price}", "{prod_1_image}",
      "{prod_2_tag}", "{prod_2_title}", "{prod_2_desc}", "{prod_2_price}", "{prod_2_image}",
      "{prod_3_tag}", "{prod_3_title}", "{prod_3_desc}", "{prod_3_price}", "{prod_3_image}",
      "{feat_1_title}", "{feat_1_desc}", "{feat_2_title}", "{feat_2_desc}", "{feat_3_title}", "{feat_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "ecommerce",
    tags: ["coffee", "ecommerce", "product", "dark", "shop"],
    author: "Community", downloads: 542, rating: 4.9,
    seo_title_pattern: "{hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "roast-coffee",
    schema_type: "Product",
    platform: "generic",
    defaultValues: {
      eyebrow: "Small-batch roastery", hero_title: "Coffee worth waking up for",
      hero_subtitle: "Ethically sourced beans, roasted in small batches and shipped fresh to your door within days of roasting.",
      cta_primary: "Shop beans", cta_secondary: "Our story",
      hero_image: U("1447933601403-0c6688de566e", 900, 1120),
      products_eyebrow: "Best sellers", products_title: "Find your perfect roast",
      products_subtitle: "From bright and fruity to deep and bold — there's a bag here with your name on it.",
      prod_1_tag: "Light roast", prod_1_title: "Morning Bloom", prod_1_desc: "Floral and citrusy with a clean, bright finish.", prod_1_price: "$18", prod_1_image: U("1559056199-641a0ac8b55e", 600, 600),
      prod_2_tag: "Medium roast", prod_2_title: "House Blend", prod_2_desc: "Balanced, smooth and chocolatey — an everyday favourite.", prod_2_price: "$17", prod_2_image: U("1442512595331-e89e73853f31", 600, 600),
      prod_3_tag: "Dark roast", prod_3_title: "Midnight Bold", prod_3_desc: "Rich, smoky and intense for the serious coffee lover.", prod_3_price: "$19", prod_3_image: U("1611854779393-1b2da9d400fe", 600, 600),
      feat_1_title: "Ethically sourced", feat_1_desc: "Direct trade with farmers who are paid fairly.",
      feat_2_title: "Roasted fresh", feat_2_desc: "Every bag roasted to order, never sitting on a shelf.",
      feat_3_title: "Free shipping", feat_3_desc: "On every order over $30, delivered fast.",
      final_title: "Fresh beans, every month", final_subtitle: "Join our subscription and never run out of great coffee again — pause or cancel anytime.",
      final_cta: "Start subscription",
    },
  };
};

/* ───────────────────────── 18. LEDGER — Finance / Bank ──────────────────── */
const ledgerFinance = (): MarketplaceTemplate => {
  const content = `<style>
.lg{--bg:#0a0f14;--fg:#eaf2f7;--muted:#8ea0ad;--line:rgba(255,255,255,.1);--ac:#2fd6a6;--ac2:#3a8dff;--card:#0f161d;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.lg *{box-sizing:border-box;margin:0}
.lg-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.lg h1,.lg h2,.lg h3{letter-spacing:-.03em;line-height:1.08;font-weight:700}
.lg-hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:clamp(64px,10vw,130px) 0}
.lg-eye{display:inline-block;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:18px}
.lg-hero h1{font-size:clamp(42px,6.4vw,78px);margin-bottom:22px}
.lg-hero h1 .g{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.lg-hero p{color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:46ch;margin-bottom:30px}
.lg-cta{display:flex;gap:14px;flex-wrap:wrap}
.lg-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.lg-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#06121a;box-shadow:0 14px 40px rgba(47,214,166,.28)}
.lg-btn-p:hover{transform:translateY(-2px)}
.lg-btn-g{background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--fg)}
.lg-card-img{position:relative}
.lg-card-img img{width:100%;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.lg-sec{padding:clamp(56px,8vw,100px) 0}
.lg-eye2{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:14px}
.lg-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.lg-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 50px;font-size:17px}
.lg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.lg-fc{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px}
.lg-fc .ic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(47,214,166,.1);margin-bottom:18px}
.lg-fc h3{font-size:18px;margin-bottom:10px}
.lg-fc p{color:var(--muted);font-size:15px}
.lg-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:34px 24px;text-align:center}
.lg-stat b{display:block;font-size:clamp(26px,3.4vw,42px);background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.lg-stat span{color:var(--muted);font-size:13px}
.lg-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px;background:radial-gradient(100% 140% at 50% 0%,rgba(58,141,255,.16),transparent 60%)}
.lg-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 18px}
.lg-final p{color:var(--muted);max-width:46ch;margin:0 auto 30px;font-size:17px}
@media(max-width:860px){.lg-hero,.lg-grid{grid-template-columns:1fr}.lg-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="lg">
  <section class="lg-wrap lg-hero">
    <div>
      <span class="lg-eye">{eyebrow}</span>
      <h1>{hero_title_a} <span class="g">{hero_title_b}</span></h1>
      <p>{hero_subtitle}</p>
      <div class="lg-cta"><a class="lg-btn lg-btn-p" href="#">{cta_primary}</a><a class="lg-btn lg-btn-g" href="#">{cta_secondary}</a></div>
    </div>
    <div class="lg-card-img"><img src="{hero_image}" alt="{hero_title_a}"></div>
  </section>

  <section class="lg-sec"><div class="lg-wrap">
    <div class="lg-eye2">{features_eyebrow}</div>
    <h2>{features_title}</h2>
    <p class="lg-sub">{features_subtitle}</p>
    <div class="lg-grid">
      <div class="lg-fc"><div class="ic">💳</div><h3>{feature_1_title}</h3><p>{feature_1_desc}</p></div>
      <div class="lg-fc"><div class="ic">📊</div><h3>{feature_2_title}</h3><p>{feature_2_desc}</p></div>
      <div class="lg-fc"><div class="ic">🔒</div><h3>{feature_3_title}</h3><p>{feature_3_desc}</p></div>
      <div class="lg-fc"><div class="ic">🌍</div><h3>{feature_4_title}</h3><p>{feature_4_desc}</p></div>
      <div class="lg-fc"><div class="ic">⚡</div><h3>{feature_5_title}</h3><p>{feature_5_desc}</p></div>
      <div class="lg-fc"><div class="ic">🤝</div><h3>{feature_6_title}</h3><p>{feature_6_desc}</p></div>
    </div>
  </div></section>

  <section class="lg-sec"><div class="lg-wrap"><div class="lg-stats">
    <div class="lg-stat"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
    <div class="lg-stat"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
    <div class="lg-stat"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
    <div class="lg-stat"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
  </div></div></section>

  <section class="lg-sec"><div class="lg-wrap"><div class="lg-final">
    <h2>{final_title}</h2>
    <p>{final_subtitle}</p>
    <a class="lg-btn lg-btn-p" href="#">{final_cta}</a>
  </div></div></section>
</div>`;
  return {
    id: "finance-app",
    name: "Finance App Template",
    description: "Sleek fintech / banking app page — gradient split hero with app card, a six-feature grid, a stat panel and a glowing sign-up CTA. Modelled on Framer fintech templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{features_eyebrow}", "{features_title}", "{features_subtitle}",
      "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}",
      "{feature_4_title}", "{feature_4_desc}", "{feature_5_title}", "{feature_5_desc}", "{feature_6_title}", "{feature_6_desc}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["finance", "fintech", "banking", "dark", "saas"],
    author: "Community", downloads: 598, rating: 4.9,
    seo_title_pattern: "{hero_title_a} {hero_title_b}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "{hero_title_b}-finance",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      eyebrow: "Banking, reimagined", hero_title_a: "Money that", hero_title_b: "works as hard as you",
      hero_subtitle: "Spend, save and invest from one beautiful app — with zero hidden fees and insights that actually help.",
      cta_primary: "Open an account", cta_secondary: "See pricing",
      hero_image: U("1563013544-824ae1b704d3", 900, 720),
      features_eyebrow: "Why Ledger", features_title: "Everything your money needs",
      features_subtitle: "Powerful tools wrapped in a simple, friendly app you'll actually enjoy using.",
      feature_1_title: "Smart cards", feature_1_desc: "Virtual and physical cards with instant freeze and limits.",
      feature_2_title: "Live insights", feature_2_desc: "See where your money goes with real-time analytics.",
      feature_3_title: "Bank-grade security", feature_3_desc: "Encryption, biometrics and 24/7 fraud monitoring.",
      feature_4_title: "Global payments", feature_4_desc: "Send and receive in 30+ currencies at fair rates.",
      feature_5_title: "Instant transfers", feature_5_desc: "Move money in seconds, any day of the week.",
      feature_6_title: "Human support", feature_6_desc: "Real people ready to help whenever you need it.",
      stat_1_num: "2.4M", stat_1_label: "Customers", stat_2_num: "$0", stat_2_label: "Hidden fees", stat_3_num: "4.9★", stat_3_label: "App rating", stat_4_num: "30+", stat_4_label: "Currencies",
      final_title: "Take control of your finances", final_subtitle: "Join millions who switched to smarter banking. Opening an account takes two minutes.",
      final_cta: "Get started free",
    },
  };
};

export const FRAMER_BATCH3_TEMPLATES: MarketplaceTemplate[] = [
  sonicPodcast(),
  wanderTravel(),
  bloomCharity(),
  fadeBarber(),
  roastCoffee(),
  ledgerFinance(),
];
