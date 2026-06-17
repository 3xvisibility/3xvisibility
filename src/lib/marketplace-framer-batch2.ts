// Framer-modelled marketplace templates — Batch 2 (1:1 design clones).
// Self-contained: scoped CSS, real photo defaults, editable {variables}.
// NO header / nav / logo bar and NO footer — only the main page design.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const U = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

/* ───────────────────────── 7. AURORA — Web3 / Crypto ────────────────────── */
const auroraWeb3 = (): MarketplaceTemplate => {
  const content = `<style>
.aw{--bg:#05060f;--fg:#eef0ff;--muted:#9298c4;--line:rgba(255,255,255,.1);--ac:#4ad8ff;--ac2:#9b6bff;--card:#0c0e1d;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.aw *{box-sizing:border-box;margin:0}
.aw-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.aw h1,.aw h2,.aw h3{letter-spacing:-.03em;line-height:1.06;font-weight:700}
.aw-hero{position:relative;text-align:center;padding:clamp(90px,13vw,170px) 0 clamp(50px,7vw,90px)}
.aw-hero::before{content:'';position:absolute;width:720px;height:520px;left:50%;top:-160px;transform:translateX(-50%);background:radial-gradient(circle,rgba(74,216,255,.22),rgba(155,107,255,.16) 40%,transparent 65%);filter:blur(10px);pointer-events:none}
.aw-pill{position:relative;display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:13px;color:var(--muted);margin-bottom:26px}
.aw-pill b{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:600}
.aw-hero h1{position:relative;font-size:clamp(40px,7vw,82px);max-width:15ch;margin:0 auto 22px}
.aw-hero h1 .g{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.aw-hero p{position:relative;color:var(--muted);font-size:clamp(16px,1.7vw,20px);max-width:52ch;margin:0 auto 34px}
.aw-cta{position:relative;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.aw-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.aw-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#05060f;box-shadow:0 14px 40px rgba(74,216,255,.35)}
.aw-btn-p:hover{transform:translateY(-2px)}
.aw-btn-g{background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--fg)}
.aw-stats{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:880px;margin:54px auto 0;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:32px 24px}
.aw-stat b{display:block;font-size:clamp(26px,3.4vw,40px);background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.aw-stat span{color:var(--muted);font-size:13px}
.aw-sec{padding:clamp(60px,9vw,110px) 0}
.aw-eye{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
.aw-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.aw-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 54px;font-size:17px}
.aw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.aw-card{background:linear-gradient(160deg,rgba(74,216,255,.07),rgba(155,107,255,.05));border:1px solid var(--line);border-radius:20px;padding:30px}
.aw-card .ic{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(255,255,255,.06);margin-bottom:18px}
.aw-card h3{font-size:18px;margin-bottom:10px}
.aw-card p{color:var(--muted);font-size:15px}
.aw-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;counter-reset:s}
.aw-step{position:relative;padding-top:18px;border-top:2px solid var(--line)}
.aw-step::before{counter-increment:s;content:'0' counter(s);position:absolute;top:-2px;left:0;width:46px;border-top:2px solid var(--ac);padding-top:18px;font-weight:700;color:var(--ac);font-size:14px}
.aw-step h3{font-size:19px;margin:14px 0 8px}
.aw-step p{color:var(--muted);font-size:15px}
.aw-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px;background:radial-gradient(100% 140% at 50% 0%,rgba(74,216,255,.16),transparent 60%)}
.aw-final h2{font-size:clamp(30px,5vw,56px);max-width:16ch;margin:0 auto 18px}
.aw-final p{color:var(--muted);max-width:46ch;margin:0 auto 32px;font-size:17px}
@media(max-width:860px){.aw-grid,.aw-steps{grid-template-columns:1fr}.aw-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="aw">
  <section class="aw-hero"><div class="aw-wrap">
    <span class="aw-pill">◈ <b>{badge_text}</b></span>
    <h1>{hero_title_a} <span class="g">{hero_title_b}</span></h1>
    <p>{hero_subtitle}</p>
    <div class="aw-cta"><a class="aw-btn aw-btn-p" href="#">{cta_primary}</a><a class="aw-btn aw-btn-g" href="#">{cta_secondary}</a></div>
    <div class="aw-stats">
      <div class="aw-stat"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="aw-stat"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="aw-stat"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="aw-stat"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="aw-sec"><div class="aw-wrap">
    <div class="aw-eye">{features_eyebrow}</div>
    <h2>{features_title}</h2>
    <p class="aw-sub">{features_subtitle}</p>
    <div class="aw-grid">
      <div class="aw-card"><div class="ic">🔐</div><h3>{feature_1_title}</h3><p>{feature_1_desc}</p></div>
      <div class="aw-card"><div class="ic">⚡</div><h3>{feature_2_title}</h3><p>{feature_2_desc}</p></div>
      <div class="aw-card"><div class="ic">🌍</div><h3>{feature_3_title}</h3><p>{feature_3_desc}</p></div>
      <div class="aw-card"><div class="ic">📈</div><h3>{feature_4_title}</h3><p>{feature_4_desc}</p></div>
      <div class="aw-card"><div class="ic">🤝</div><h3>{feature_5_title}</h3><p>{feature_5_desc}</p></div>
      <div class="aw-card"><div class="ic">🛠️</div><h3>{feature_6_title}</h3><p>{feature_6_desc}</p></div>
    </div>
  </div></section>

  <section class="aw-sec"><div class="aw-wrap">
    <div class="aw-eye">{how_eyebrow}</div>
    <h2>{how_title}</h2>
    <p class="aw-sub">{how_subtitle}</p>
    <div class="aw-steps">
      <div class="aw-step"><h3>{step_1_title}</h3><p>{step_1_desc}</p></div>
      <div class="aw-step"><h3>{step_2_title}</h3><p>{step_2_desc}</p></div>
      <div class="aw-step"><h3>{step_3_title}</h3><p>{step_3_desc}</p></div>
    </div>
  </div></section>

  <section class="aw-sec"><div class="aw-wrap">
    <div class="aw-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="aw-btn aw-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "aurora-web3",
    name: "Web3 Platform Template",
    description: "Neon, glassy Web3 / crypto platform landing — gradient hero with live stat panel, six-feature grid, numbered steps and a glowing final CTA. Modelled on Framer Web3 templates.",
    content,
    variables: [
      "{badge_text}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{features_eyebrow}", "{features_title}", "{features_subtitle}",
      "{feature_1_title}", "{feature_1_desc}", "{feature_2_title}", "{feature_2_desc}", "{feature_3_title}", "{feature_3_desc}",
      "{feature_4_title}", "{feature_4_desc}", "{feature_5_title}", "{feature_5_desc}", "{feature_6_title}", "{feature_6_desc}",
      "{how_eyebrow}", "{how_title}", "{how_subtitle}",
      "{step_1_title}", "{step_1_desc}", "{step_2_title}", "{step_2_desc}", "{step_3_title}", "{step_3_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["web3", "crypto", "defi", "dark", "fintech"],
    author: "Community", downloads: 588, rating: 4.8,
    seo_title_pattern: "{hero_title_a} {hero_title_b}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "",
    slug_pattern: "{hero_title_b}-web3",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      badge_text: "Audited & non-custodial", hero_title_a: "The future of", hero_title_b: "decentralized finance",
      hero_subtitle: "Swap, stake and earn across chains with a single, secure wallet built for everyone.",
      cta_primary: "Launch app", cta_secondary: "Read docs",
      stat_1_num: "$4.2B", stat_1_label: "Total volume", stat_2_num: "850k", stat_2_label: "Wallets",
      stat_3_num: "12", stat_3_label: "Chains", stat_4_num: "0.05%", stat_4_label: "Avg. fee",
      features_eyebrow: "Why Aurora", features_title: "Built for the next billion users",
      features_subtitle: "Powerful tools wrapped in an interface anyone can use — no jargon required.",
      feature_1_title: "Self-custody", feature_1_desc: "Your keys, your coins. We never touch your funds.",
      feature_2_title: "Instant swaps", feature_2_desc: "Best-rate routing across dozens of liquidity pools.",
      feature_3_title: "Cross-chain", feature_3_desc: "Move assets between chains in a few taps.",
      feature_4_title: "Smart staking", feature_4_desc: "Earn passive yield with auto-compounding vaults.",
      feature_5_title: "Open & audited", feature_5_desc: "Fully open-source and audited by leading firms.",
      feature_6_title: "Developer API", feature_6_desc: "Build on top of Aurora with a clean, documented API.",
      how_eyebrow: "Get started", how_title: "Up and running in minutes",
      how_subtitle: "No paperwork, no waiting — connect and start in three steps.",
      step_1_title: "Create a wallet", step_1_desc: "Spin up a secure wallet in seconds, no email needed.",
      step_2_title: "Fund it", step_2_desc: "Deposit crypto or buy directly with your card.",
      step_3_title: "Swap & earn", step_3_desc: "Trade, stake and watch your portfolio grow.",
      final_title: "Own your financial future", final_subtitle: "Join hundreds of thousands already building wealth on Aurora.",
      final_cta: "Launch app",
    },
  };
};

/* ───────────────────────── 8. SAVORA — Restaurant ───────────────────────── */
const savoraRestaurant = (): MarketplaceTemplate => {
  const content = `<style>
.sv{--bg:#13100c;--fg:#f6efe4;--muted:#b7a994;--line:rgba(255,255,255,.12);--ac:#d9a441;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.sv *{box-sizing:border-box;margin:0}
.sv-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.sv-serif{font-family:'Playfair Display',Georgia,serif}
.sv h1,.sv h2,.sv h3{letter-spacing:-.01em;line-height:1.08;font-weight:600}
.sv-hero{position:relative;min-height:90vh;display:flex;align-items:center;text-align:center;background-size:cover;background-position:center}
.sv-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(19,16,12,.55),rgba(19,16,12,.85))}
.sv-hero .in{position:relative;z-index:2;width:100%}
.sv-hero .eye{color:var(--ac);font-size:13px;text-transform:uppercase;letter-spacing:.24em;margin-bottom:20px}
.sv-hero h1{font-size:clamp(44px,8vw,96px);max-width:16ch;margin:0 auto 22px}
.sv-hero p{color:var(--fg);opacity:.9;font-size:clamp(16px,1.8vw,20px);max-width:46ch;margin:0 auto 32px}
.sv-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sv-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:4px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s;letter-spacing:.04em}
.sv-btn-p{background:var(--ac);color:#13100c}
.sv-btn-p:hover{filter:brightness(1.08)}
.sv-btn-o{border:1px solid var(--fg);color:var(--fg)}
.sv-sec{padding:clamp(60px,9vw,110px) 0}
.sv-eye{text-align:center;color:var(--ac);font-size:13px;text-transform:uppercase;letter-spacing:.2em;margin-bottom:14px}
.sv-sec h2{text-align:center;font-size:clamp(30px,5vw,52px);max-width:18ch;margin:0 auto 18px}
.sv-sub{text-align:center;color:var(--muted);max-width:50ch;margin:0 auto 54px;font-size:17px}
.sv-about{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.sv-about img{width:100%;border-radius:8px;aspect-ratio:4/5;object-fit:cover}
.sv-about p{color:var(--muted);font-size:17px;margin-bottom:16px}
.sv-menu{display:grid;grid-template-columns:1fr 1fr;gap:14px 48px;max-width:880px;margin:0 auto}
.sv-item{display:flex;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px dashed var(--line)}
.sv-item h3{font-size:18px}
.sv-item p{color:var(--muted);font-size:14px;margin-top:4px}
.sv-item .pr{color:var(--ac);font-weight:600;white-space:nowrap}
.sv-gal{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.sv-gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;transition:.4s}
.sv-gal img:hover{transform:scale(1.03)}
.sv-final{position:relative;text-align:center;border-radius:12px;overflow:hidden;padding:clamp(60px,9vw,120px) 24px;background-size:cover;background-position:center}
.sv-final::before{content:'';position:absolute;inset:0;background:rgba(19,16,12,.8)}
.sv-final .c{position:relative;z-index:2}
.sv-final h2{font-size:clamp(30px,5vw,56px);max-width:16ch;margin:0 auto 16px}
.sv-final p{color:var(--muted);max-width:44ch;margin:0 auto 30px;font-size:17px}
@media(max-width:760px){.sv-about,.sv-menu{grid-template-columns:1fr}.sv-gal{grid-template-columns:1fr 1fr}}
</style>
<div class="sv">
  <section class="sv-hero" style="background-image:url('{hero_image}')"><div class="sv-wrap in">
    <div class="eye">{eyebrow}</div>
    <h1 class="sv-serif">{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="sv-cta"><a class="sv-btn sv-btn-p" href="#">{cta_primary}</a><a class="sv-btn sv-btn-o" href="#">{cta_secondary}</a></div>
  </div></section>

  <section class="sv-sec"><div class="sv-wrap">
    <div class="sv-about">
      <img src="{about_image}" alt="{restaurant_name}"/>
      <div>
        <div class="sv-eye" style="text-align:left">{about_eyebrow}</div>
        <h2 class="sv-serif" style="text-align:left">{about_title}</h2>
        <p>{about_text_1}</p>
        <p>{about_text_2}</p>
      </div>
    </div>
  </div></section>

  <section class="sv-sec"><div class="sv-wrap">
    <div class="sv-eye">{menu_eyebrow}</div>
    <h2 class="sv-serif">{menu_title}</h2>
    <p class="sv-sub">{menu_subtitle}</p>
    <div class="sv-menu">
      <div class="sv-item"><div><h3 class="sv-serif">{dish_1_name}</h3><p>{dish_1_desc}</p></div><span class="pr">{dish_1_price}</span></div>
      <div class="sv-item"><div><h3 class="sv-serif">{dish_2_name}</h3><p>{dish_2_desc}</p></div><span class="pr">{dish_2_price}</span></div>
      <div class="sv-item"><div><h3 class="sv-serif">{dish_3_name}</h3><p>{dish_3_desc}</p></div><span class="pr">{dish_3_price}</span></div>
      <div class="sv-item"><div><h3 class="sv-serif">{dish_4_name}</h3><p>{dish_4_desc}</p></div><span class="pr">{dish_4_price}</span></div>
      <div class="sv-item"><div><h3 class="sv-serif">{dish_5_name}</h3><p>{dish_5_desc}</p></div><span class="pr">{dish_5_price}</span></div>
      <div class="sv-item"><div><h3 class="sv-serif">{dish_6_name}</h3><p>{dish_6_desc}</p></div><span class="pr">{dish_6_price}</span></div>
    </div>
  </div></section>

  <section class="sv-sec"><div class="sv-wrap">
    <div class="sv-eye">{gallery_eyebrow}</div>
    <h2 class="sv-serif">{gallery_title}</h2>
    <p class="sv-sub">{gallery_subtitle}</p>
    <div class="sv-gal">
      <img src="{gallery_1}" alt="dish"/><img src="{gallery_2}" alt="dish"/><img src="{gallery_3}" alt="dish"/><img src="{gallery_4}" alt="dish"/>
    </div>
  </div></section>

  <section class="sv-sec"><div class="sv-wrap">
    <div class="sv-final" style="background-image:url('{final_image}')"><div class="c">
      <h2 class="sv-serif">{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="sv-btn sv-btn-p" href="#">{final_cta}</a>
    </div></div>
  </div></section>
</div>`;
  return {
    id: "savora-restaurant",
    name: "Fine Dining Restaurant Template",
    description: "Warm, elegant fine-dining restaurant page — full-bleed serif hero, story split, two-column à la carte menu with prices, dish gallery and a reservation CTA. Modelled on Framer restaurant templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}", "{restaurant_name}",
      "{about_eyebrow}", "{about_title}", "{about_text_1}", "{about_text_2}", "{about_image}",
      "{menu_eyebrow}", "{menu_title}", "{menu_subtitle}",
      "{dish_1_name}", "{dish_1_desc}", "{dish_1_price}", "{dish_2_name}", "{dish_2_desc}", "{dish_2_price}",
      "{dish_3_name}", "{dish_3_desc}", "{dish_3_price}", "{dish_4_name}", "{dish_4_desc}", "{dish_4_price}",
      "{dish_5_name}", "{dish_5_desc}", "{dish_5_price}", "{dish_6_name}", "{dish_6_desc}", "{dish_6_price}",
      "{gallery_eyebrow}", "{gallery_title}", "{gallery_subtitle}", "{gallery_1}", "{gallery_2}", "{gallery_3}", "{gallery_4}",
      "{final_title}", "{final_subtitle}", "{final_cta}", "{final_image}",
    ],
    category: "business",
    tags: ["restaurant", "food", "dining", "menu", "elegant"],
    author: "Community", downloads: 497, rating: 4.9,
    seo_title_pattern: "{restaurant_name} — {hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{restaurant_name} — {hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "{restaurant_name}-restaurant",
    schema_type: "Restaurant",
    platform: "generic",
    defaultValues: {
      eyebrow: "Modern European · Est. 2014", hero_title: "A taste worth remembering",
      hero_subtitle: "Seasonal dishes crafted from the finest local ingredients, served in a warm, intimate setting.",
      cta_primary: "Reserve a table", cta_secondary: "View menu", restaurant_name: "Savora",
      hero_image: U("1414235077428-338989a2e8c0", 1600, 1000),
      about_eyebrow: "Our story", about_title: "Cooking with heart since 2014",
      about_text_1: "Savora began as a small neighbourhood kitchen with a simple belief: great food brings people together.",
      about_text_2: "Today our chefs honour that spirit with a menu that changes with the seasons and a welcome that never does.",
      about_image: U("1517248135467-4c7edcad34c4", 700, 875),
      menu_eyebrow: "The menu", menu_title: "Signature plates",
      menu_subtitle: "A selection of our guests' favourites, refreshed throughout the year.",
      dish_1_name: "Burrata & Heirloom", dish_1_desc: "Creamy burrata, tomatoes, basil oil", dish_1_price: "$14",
      dish_2_name: "Wild Mushroom Risotto", dish_2_desc: "Carnaroli rice, parmesan, truffle", dish_2_price: "$22",
      dish_3_name: "Seared Sea Bass", dish_3_desc: "Fennel, citrus, white wine butter", dish_3_price: "$28",
      dish_4_name: "Braised Short Rib", dish_4_desc: "Red wine jus, root vegetables", dish_4_price: "$32",
      dish_5_name: "Tagliatelle Ragù", dish_5_desc: "Slow-cooked beef, pecorino", dish_5_price: "$24",
      dish_6_name: "Dark Chocolate Tart", dish_6_desc: "Sea salt, vanilla cream", dish_6_price: "$12",
      gallery_eyebrow: "Gallery", gallery_title: "Made with love",
      gallery_subtitle: "A glimpse of what awaits you at the table.",
      gallery_1: U("1546069901-ba9599a7e63c", 500, 500), gallery_2: U("1565299624946-b28f40a0ca4b", 500, 500),
      gallery_3: U("1540189549336-e6e99c3679fe", 500, 500), gallery_4: U("1551782450-a2132b4ba21d", 500, 500),
      final_title: "Join us for dinner", final_subtitle: "Reservations recommended. We can't wait to welcome you.",
      final_cta: "Book your table", final_image: U("1424847651672-bf20a4b0982b", 1600, 900),
    },
  };
};

/* ───────────────────────── 9. CIRA — Marketing agency ───────────────────── */
const ciraAgency = (): MarketplaceTemplate => {
  const content = `<style>
.cr{--bg:#fafaf8;--fg:#101014;--muted:#62626c;--line:#e6e6e0;--ac:#3b5bff;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6}
.cr *{box-sizing:border-box;margin:0}
.cr-wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.cr h1,.cr h2,.cr h3{letter-spacing:-.03em;line-height:1.05;font-weight:700}
.cr-hero{padding:clamp(70px,11vw,140px) 0 clamp(40px,6vw,70px)}
.cr-pill{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:13px;color:var(--ac);margin-bottom:24px;font-weight:600}
.cr-hero h1{font-size:clamp(40px,7vw,86px);max-width:16ch;margin-bottom:22px}
.cr-hero h1 em{color:var(--ac);font-style:normal}
.cr-hero p{color:var(--muted);font-size:clamp(17px,1.8vw,21px);max-width:52ch;margin-bottom:32px}
.cr-cta{display:flex;gap:14px;flex-wrap:wrap}
.cr-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.cr-btn-p{background:var(--fg);color:#fff}
.cr-btn-p:hover{background:var(--ac)}
.cr-btn-o{border:1px solid var(--line);color:var(--fg)}
.cr-logos{display:flex;flex-wrap:wrap;gap:14px 40px;align-items:center;margin-top:48px;opacity:.6;font-weight:600;color:var(--muted)}
.cr-sec{padding:clamp(60px,9vw,110px) 0;border-top:1px solid var(--line)}
.cr-eye{color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:14px}
.cr-sec h2{font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin-bottom:18px}
.cr-sub{color:var(--muted);max-width:54ch;margin-bottom:48px;font-size:17px}
.cr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.cr-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:30px}
.cr-card .ic{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(59,91,255,.1);margin-bottom:18px}
.cr-card h3{font-size:19px;margin-bottom:10px}
.cr-card p{color:var(--muted);font-size:15px}
.cr-work{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
.cr-proj{cursor:pointer}
.cr-proj img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:16px;transition:.4s}
.cr-proj:hover img{transform:scale(1.02)}
.cr-proj h3{font-size:20px;margin:16px 0 4px}
.cr-proj span{color:var(--muted);font-size:14px}
.cr-quote{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:clamp(40px,6vw,72px);text-align:center}
.cr-quote p{font-size:clamp(20px,3vw,32px);font-weight:600;letter-spacing:-.02em;max-width:24ch;margin:0 auto 24px;line-height:1.3}
.cr-quote .who{display:flex;align-items:center;justify-content:center;gap:12px}
.cr-quote img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.cr-quote b{display:block;font-size:15px}
.cr-quote span{color:var(--muted);font-size:13px}
.cr-final{text-align:center;background:var(--fg);color:#fff;border-radius:28px;padding:clamp(54px,8vw,100px) 24px}
.cr-final h2{font-size:clamp(30px,5vw,56px);color:#fff;max-width:16ch;margin:0 auto 18px}
.cr-final p{color:rgba(255,255,255,.7);max-width:46ch;margin:0 auto 32px;font-size:17px}
.cr-final .cr-btn-p{background:var(--ac)}
@media(max-width:860px){.cr-grid,.cr-work{grid-template-columns:1fr}}
</style>
<div class="cr">
  <section class="cr-hero"><div class="cr-wrap">
    <span class="cr-pill">✦ {badge_text}</span>
    <h1>{hero_title_a} <em>{hero_title_b}</em></h1>
    <p>{hero_subtitle}</p>
    <div class="cr-cta"><a class="cr-btn cr-btn-p" href="#">{cta_primary}</a><a class="cr-btn cr-btn-o" href="#">{cta_secondary}</a></div>
    <div class="cr-logos"><span>{client_1}</span><span>{client_2}</span><span>{client_3}</span><span>{client_4}</span><span>{client_5}</span></div>
  </div></section>

  <section class="cr-sec"><div class="cr-wrap">
    <div class="cr-eye">{services_eyebrow}</div>
    <h2>{services_title}</h2>
    <p class="cr-sub">{services_subtitle}</p>
    <div class="cr-grid">
      <div class="cr-card"><div class="ic">📣</div><h3>{service_1_title}</h3><p>{service_1_desc}</p></div>
      <div class="cr-card"><div class="ic">🎯</div><h3>{service_2_title}</h3><p>{service_2_desc}</p></div>
      <div class="cr-card"><div class="ic">📊</div><h3>{service_3_title}</h3><p>{service_3_desc}</p></div>
    </div>
  </div></section>

  <section class="cr-sec"><div class="cr-wrap">
    <div class="cr-eye">{work_eyebrow}</div>
    <h2>{work_title}</h2>
    <p class="cr-sub">{work_subtitle}</p>
    <div class="cr-work">
      <div class="cr-proj"><img src="{project_1_image}" alt="{project_1_title}"/><h3>{project_1_title}</h3><span>{project_1_meta}</span></div>
      <div class="cr-proj"><img src="{project_2_image}" alt="{project_2_title}"/><h3>{project_2_title}</h3><span>{project_2_meta}</span></div>
    </div>
  </div></section>

  <section class="cr-sec"><div class="cr-wrap">
    <div class="cr-quote">
      <p>"{quote_text}"</p>
      <div class="who"><img src="{quote_avatar}" alt="{quote_name}"/><div style="text-align:left"><b>{quote_name}</b><span>{quote_role}</span></div></div>
    </div>
  </div></section>

  <section class="cr-sec"><div class="cr-wrap">
    <div class="cr-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="cr-btn cr-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "cira-agency",
    name: "Marketing Agency Template",
    description: "Clean, confident marketing agency page — bold light hero with client logos, three-service grid, two-up case studies, big testimonial and a dark final CTA. Modelled on Framer agency templates.",
    content,
    variables: [
      "{badge_text}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{client_1}", "{client_2}", "{client_3}", "{client_4}", "{client_5}",
      "{services_eyebrow}", "{services_title}", "{services_subtitle}",
      "{service_1_title}", "{service_1_desc}", "{service_2_title}", "{service_2_desc}", "{service_3_title}", "{service_3_desc}",
      "{work_eyebrow}", "{work_title}", "{work_subtitle}",
      "{project_1_title}", "{project_1_meta}", "{project_1_image}", "{project_2_title}", "{project_2_meta}", "{project_2_image}",
      "{quote_text}", "{quote_name}", "{quote_role}", "{quote_avatar}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["agency", "marketing", "light", "creative", "case-study"],
    author: "Community", downloads: 605, rating: 4.8,
    seo_title_pattern: "{hero_title_a} {hero_title_b}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{project_1_image}",
    slug_pattern: "{hero_title_b}-agency",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      badge_text: "Growth marketing studio", hero_title_a: "We help brands", hero_title_b: "grow faster",
      hero_subtitle: "A full-service marketing team that turns ambitious goals into measurable results.",
      cta_primary: "Start a project", cta_secondary: "See our work",
      client_1: "Northwind", client_2: "Lumora", client_3: "Vertex", client_4: "Brightly", client_5: "Coastal",
      services_eyebrow: "What we do", services_title: "Marketing that moves the needle",
      services_subtitle: "From strategy to execution, we cover every channel that drives growth.",
      service_1_title: "Brand & Content", service_1_desc: "Stories and assets that make your brand impossible to ignore.",
      service_2_title: "Performance Ads", service_2_desc: "Paid campaigns engineered for ROI across every platform.",
      service_3_title: "SEO & Analytics", service_3_desc: "Data-led optimisation that compounds month after month.",
      work_eyebrow: "Case studies", work_title: "Results we're proud of",
      work_subtitle: "A few recent partnerships and the outcomes we delivered.",
      project_1_title: "Lumora — 3x revenue", project_1_meta: "Performance · Branding", project_1_image: U("1460925895917-afdab827c52f", 900, 560),
      project_2_title: "Vertex — 220% leads", project_2_meta: "SEO · Content", project_2_image: U("1551434678-e076c223a692", 900, 560),
      quote_text: "Cira didn't just run our campaigns — they reshaped how we think about growth. Best partner we've had.",
      quote_name: "Elena Marsh", quote_role: "CMO, Lumora", quote_avatar: U("1438761681033-6461ffad8d80", 120, 120),
      final_title: "Let's grow your brand", final_subtitle: "Tell us your goals and we'll build a plan to hit them.",
      final_cta: "Book a free call",
    },
  };
};

/* ───────────────────────── 10. NOVA — Online course ─────────────────────── */
const novaCourse = (): MarketplaceTemplate => {
  const content = `<style>
.nv{--bg:#0e0a18;--fg:#f3effc;--muted:#a79fc0;--line:rgba(255,255,255,.1);--ac:#ffb020;--ac2:#a855f7;--card:#171026;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.nv *{box-sizing:border-box;margin:0}
.nv-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.nv h1,.nv h2,.nv h3{letter-spacing:-.03em;line-height:1.06;font-weight:700}
.nv-hero{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding:clamp(70px,10vw,130px) 0}
.nv-badge{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:7px 16px;font-size:13px;color:var(--ac);margin-bottom:22px;font-weight:600}
.nv-hero h1{font-size:clamp(36px,5.6vw,66px);max-width:16ch;margin-bottom:20px}
.nv-hero h1 span{color:var(--ac)}
.nv-hero p{color:var(--muted);font-size:clamp(16px,1.6vw,19px);max-width:48ch;margin-bottom:28px}
.nv-meta{display:flex;gap:24px;flex-wrap:wrap;margin-bottom:28px;color:var(--muted);font-size:14px}
.nv-meta b{color:var(--fg)}
.nv-cta{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.nv-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.nv-btn-p{background:linear-gradient(135deg,var(--ac),#ff7a18);color:#1a1206;box-shadow:0 14px 38px rgba(255,176,32,.35)}
.nv-btn-p:hover{transform:translateY(-2px)}
.nv-price{color:var(--muted);font-size:14px}
.nv-price b{color:var(--fg);font-size:22px}
.nv-card-img{position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--line);box-shadow:0 40px 90px rgba(0,0,0,.5)}
.nv-card-img img{width:100%;display:block;aspect-ratio:4/3;object-fit:cover}
.nv-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.nv-play span{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.9);color:#0e0a18;display:flex;align-items:center;justify-content:center;font-size:24px}
.nv-sec{padding:clamp(60px,9vw,110px) 0}
.nv-eye{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
.nv-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.nv-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 54px;font-size:17px}
.nv-learn{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:880px;margin:0 auto}
.nv-learn div{display:flex;gap:12px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px}
.nv-learn div::before{content:'✓';color:var(--ac);font-weight:700;font-size:18px}
.nv-learn p{color:var(--fg);font-size:15px}
.nv-mod{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.nv-moditem{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 24px;display:flex;justify-content:space-between;gap:16px;align-items:center}
.nv-moditem h3{font-size:17px}
.nv-moditem p{color:var(--muted);font-size:14px;margin-top:4px}
.nv-moditem span{color:var(--muted);font-size:13px;white-space:nowrap}
.nv-inst{display:grid;grid-template-columns:.8fr 1.2fr;gap:40px;align-items:center;max-width:920px;margin:0 auto}
.nv-inst img{width:100%;border-radius:18px;aspect-ratio:1;object-fit:cover}
.nv-inst h2{text-align:left;font-size:clamp(26px,3.6vw,40px);margin-bottom:8px}
.nv-inst .role{color:var(--ac);font-size:15px;margin-bottom:16px}
.nv-inst p{color:var(--muted);font-size:16px}
.nv-final{text-align:center;background:linear-gradient(135deg,rgba(255,176,32,.14),rgba(168,85,247,.12));border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px}
.nv-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 16px}
.nv-final p{color:var(--muted);max-width:44ch;margin:0 auto 30px;font-size:17px}
@media(max-width:860px){.nv-hero,.nv-learn,.nv-inst{grid-template-columns:1fr}}
</style>
<div class="nv">
  <section class="nv-hero nv-wrap">
    <div>
      <span class="nv-badge">🎓 {badge_text}</span>
      <h1>{hero_title_a} <span>{hero_title_b}</span></h1>
      <p>{hero_subtitle}</p>
      <div class="nv-meta"><span>⭐ <b>{rating}</b> ({rating_count})</span><span>👥 <b>{students}</b> students</span><span>⏱️ <b>{duration}</b></span></div>
      <div class="nv-cta"><a class="nv-btn nv-btn-p" href="#">{cta_primary}</a><span class="nv-price"><b>{price}</b> {price_note}</span></div>
    </div>
    <div class="nv-card-img"><img src="{hero_image}" alt="{course_name}"/><div class="nv-play"><span>▶</span></div></div>
  </section>

  <section class="nv-sec"><div class="nv-wrap">
    <div class="nv-eye">{learn_eyebrow}</div>
    <h2>{learn_title}</h2>
    <p class="nv-sub">{learn_subtitle}</p>
    <div class="nv-learn">
      <div><p>{learn_1}</p></div><div><p>{learn_2}</p></div>
      <div><p>{learn_3}</p></div><div><p>{learn_4}</p></div>
      <div><p>{learn_5}</p></div><div><p>{learn_6}</p></div>
    </div>
  </div></section>

  <section class="nv-sec"><div class="nv-wrap">
    <div class="nv-eye">{curriculum_eyebrow}</div>
    <h2>{curriculum_title}</h2>
    <p class="nv-sub">{curriculum_subtitle}</p>
    <div class="nv-mod">
      <div class="nv-moditem"><div><h3>{module_1_title}</h3><p>{module_1_desc}</p></div><span>{module_1_meta}</span></div>
      <div class="nv-moditem"><div><h3>{module_2_title}</h3><p>{module_2_desc}</p></div><span>{module_2_meta}</span></div>
      <div class="nv-moditem"><div><h3>{module_3_title}</h3><p>{module_3_desc}</p></div><span>{module_3_meta}</span></div>
      <div class="nv-moditem"><div><h3>{module_4_title}</h3><p>{module_4_desc}</p></div><span>{module_4_meta}</span></div>
    </div>
  </div></section>

  <section class="nv-sec"><div class="nv-wrap">
    <div class="nv-inst">
      <img src="{instructor_image}" alt="{instructor_name}"/>
      <div>
        <div class="nv-eye" style="text-align:left">{instructor_eyebrow}</div>
        <h2>{instructor_name}</h2>
        <div class="role">{instructor_role}</div>
        <p>{instructor_bio}</p>
      </div>
    </div>
  </div></section>

  <section class="nv-sec"><div class="nv-wrap">
    <div class="nv-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="nv-btn nv-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "nova-course",
    name: "Online Course Template",
    description: "Vibrant online-course / e-learning landing — split hero with video card and stats, what-you'll-learn grid, curriculum accordion list, instructor bio and an enrol CTA. Modelled on Framer course templates.",
    content,
    variables: [
      "{badge_text}", "{hero_title_a}", "{hero_title_b}", "{hero_subtitle}", "{rating}", "{rating_count}", "{students}", "{duration}",
      "{cta_primary}", "{price}", "{price_note}", "{hero_image}", "{course_name}",
      "{learn_eyebrow}", "{learn_title}", "{learn_subtitle}", "{learn_1}", "{learn_2}", "{learn_3}", "{learn_4}", "{learn_5}", "{learn_6}",
      "{curriculum_eyebrow}", "{curriculum_title}", "{curriculum_subtitle}",
      "{module_1_title}", "{module_1_desc}", "{module_1_meta}", "{module_2_title}", "{module_2_desc}", "{module_2_meta}",
      "{module_3_title}", "{module_3_desc}", "{module_3_meta}", "{module_4_title}", "{module_4_desc}", "{module_4_meta}",
      "{instructor_eyebrow}", "{instructor_name}", "{instructor_role}", "{instructor_bio}", "{instructor_image}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["course", "education", "e-learning", "dark", "online"],
    author: "Community", downloads: 562, rating: 4.9,
    seo_title_pattern: "{hero_title_a} {hero_title_b}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title_a} {hero_title_b}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "{course_name}-course",
    schema_type: "Course",
    platform: "generic",
    defaultValues: {
      badge_text: "Bestselling course", hero_title_a: "Master", hero_title_b: "modern web design",
      hero_subtitle: "Go from beginner to confident designer with a project-based course built for the real world.",
      rating: "4.9", rating_count: "2,100+", students: "18,000+", duration: "12 hours",
      cta_primary: "Enrol now", price: "$89", price_note: "one-time · lifetime access", course_name: "Master Modern Web Design",
      hero_image: U("1498050108023-c5249f4df085", 900, 675),
      learn_eyebrow: "What you'll learn", learn_title: "Skills that get you hired",
      learn_subtitle: "Everything you need to design and ship beautiful, modern interfaces.",
      learn_1: "Design principles & visual hierarchy", learn_2: "Building scalable design systems",
      learn_3: "Prototyping & interaction design", learn_4: "Responsive layouts that work everywhere",
      learn_5: "Handoff & collaboration with developers", learn_6: "Building a standout portfolio",
      curriculum_eyebrow: "Curriculum", curriculum_title: "What's inside",
      curriculum_subtitle: "Four hands-on modules packed with real projects.",
      module_1_title: "Foundations", module_1_desc: "Color, type, spacing and the rules that matter", module_1_meta: "8 lessons · 2h",
      module_2_title: "Design Systems", module_2_desc: "Components, tokens and reusable patterns", module_2_meta: "10 lessons · 3h",
      module_3_title: "Prototyping", module_3_desc: "Bring your designs to life with motion", module_3_meta: "7 lessons · 2.5h",
      module_4_title: "Portfolio & Career", module_4_desc: "Land your first or next design role", module_4_meta: "6 lessons · 2h",
      instructor_eyebrow: "Your instructor", instructor_name: "Daniel Reyes", instructor_role: "Senior Product Designer",
      instructor_bio: "Daniel has spent over a decade designing products used by millions and has taught more than 40,000 students worldwide.",
      instructor_image: U("1506794778202-cad84cf45f1d", 600, 600),
      final_title: "Start learning today", final_subtitle: "Join thousands of students already building beautiful products.",
      final_cta: "Enrol now",
    },
  };
};

/* ───────────────────────── 11. EVENA — Event / Conference ───────────────── */
const evenaEvent = (): MarketplaceTemplate => {
  const content = `<style>
.ev{--bg:#0b0f1a;--fg:#eef2fb;--muted:#9aa4c0;--line:rgba(255,255,255,.1);--ac:#ff4d7d;--ac2:#5b8cff;--card:#121726;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.ev *{box-sizing:border-box;margin:0}
.ev-wrap{max-width:1140px;margin:0 auto;padding:0 24px}
.ev h1,.ev h2,.ev h3{letter-spacing:-.03em;line-height:1.05;font-weight:700}
.ev-hero{position:relative;text-align:center;padding:clamp(90px,12vw,160px) 0 clamp(50px,7vw,90px)}
.ev-hero::before{content:'';position:absolute;width:760px;height:520px;left:50%;top:-160px;transform:translateX(-50%);background:radial-gradient(circle,rgba(255,77,125,.2),rgba(91,140,255,.16) 45%,transparent 65%);filter:blur(12px);pointer-events:none}
.ev-pill{position:relative;display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:13px;color:var(--ac);margin-bottom:24px;font-weight:600}
.ev-hero h1{position:relative;font-size:clamp(42px,7.5vw,92px);max-width:14ch;margin:0 auto 20px}
.ev-hero .when{position:relative;color:var(--fg);font-size:clamp(16px,1.8vw,20px);margin-bottom:14px}
.ev-hero .when b{background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.ev-hero p{position:relative;color:var(--muted);font-size:clamp(16px,1.6vw,19px);max-width:50ch;margin:0 auto 32px}
.ev-cta{position:relative;display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.ev-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.ev-btn-p{background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:0 14px 40px rgba(255,77,125,.35)}
.ev-btn-p:hover{transform:translateY(-2px)}
.ev-btn-g{background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--fg)}
.ev-stats{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:760px;margin:52px auto 0}
.ev-stat b{display:block;font-size:clamp(26px,3.4vw,40px);background:linear-gradient(135deg,var(--ac),var(--ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.ev-stat span{color:var(--muted);font-size:13px}
.ev-sec{padding:clamp(60px,9vw,110px) 0}
.ev-eye{text-align:center;color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px}
.ev-sec h2{text-align:center;font-size:clamp(28px,4.4vw,48px);max-width:18ch;margin:0 auto 18px}
.ev-sub{text-align:center;color:var(--muted);max-width:52ch;margin:0 auto 54px;font-size:17px}
.ev-speakers{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.ev-sp{text-align:center}
.ev-sp img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:16px;margin-bottom:14px}
.ev-sp h3{font-size:17px}
.ev-sp span{color:var(--muted);font-size:13px}
.ev-agenda{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.ev-ag{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 24px;display:flex;gap:20px;align-items:center}
.ev-ag .t{color:var(--ac);font-weight:700;font-size:15px;white-space:nowrap}
.ev-ag h3{font-size:17px}
.ev-ag p{color:var(--muted);font-size:14px;margin-top:2px}
.ev-final{position:relative;text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(54px,8vw,100px) 24px;background:radial-gradient(100% 140% at 50% 0%,rgba(255,77,125,.16),transparent 60%)}
.ev-final h2{font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 16px}
.ev-final p{color:var(--muted);max-width:44ch;margin:0 auto 30px;font-size:17px}
@media(max-width:860px){.ev-speakers{grid-template-columns:repeat(2,1fr)}.ev-stats{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="ev">
  <section class="ev-hero"><div class="ev-wrap">
    <span class="ev-pill">📍 {badge_text}</span>
    <h1>{event_name}</h1>
    <div class="when"><b>{event_date}</b> · {event_location}</div>
    <p>{hero_subtitle}</p>
    <div class="ev-cta"><a class="ev-btn ev-btn-p" href="#">{cta_primary}</a><a class="ev-btn ev-btn-g" href="#">{cta_secondary}</a></div>
    <div class="ev-stats">
      <div class="ev-stat"><b>{stat_1_num}</b><span>{stat_1_label}</span></div>
      <div class="ev-stat"><b>{stat_2_num}</b><span>{stat_2_label}</span></div>
      <div class="ev-stat"><b>{stat_3_num}</b><span>{stat_3_label}</span></div>
      <div class="ev-stat"><b>{stat_4_num}</b><span>{stat_4_label}</span></div>
    </div>
  </div></section>

  <section class="ev-sec"><div class="ev-wrap">
    <div class="ev-eye">{speakers_eyebrow}</div>
    <h2>{speakers_title}</h2>
    <p class="ev-sub">{speakers_subtitle}</p>
    <div class="ev-speakers">
      <div class="ev-sp"><img src="{speaker_1_img}" alt="{speaker_1_name}"/><h3>{speaker_1_name}</h3><span>{speaker_1_role}</span></div>
      <div class="ev-sp"><img src="{speaker_2_img}" alt="{speaker_2_name}"/><h3>{speaker_2_name}</h3><span>{speaker_2_role}</span></div>
      <div class="ev-sp"><img src="{speaker_3_img}" alt="{speaker_3_name}"/><h3>{speaker_3_name}</h3><span>{speaker_3_role}</span></div>
      <div class="ev-sp"><img src="{speaker_4_img}" alt="{speaker_4_name}"/><h3>{speaker_4_name}</h3><span>{speaker_4_role}</span></div>
    </div>
  </div></section>

  <section class="ev-sec"><div class="ev-wrap">
    <div class="ev-eye">{agenda_eyebrow}</div>
    <h2>{agenda_title}</h2>
    <p class="ev-sub">{agenda_subtitle}</p>
    <div class="ev-agenda">
      <div class="ev-ag"><span class="t">{agenda_1_time}</span><div><h3>{agenda_1_title}</h3><p>{agenda_1_desc}</p></div></div>
      <div class="ev-ag"><span class="t">{agenda_2_time}</span><div><h3>{agenda_2_title}</h3><p>{agenda_2_desc}</p></div></div>
      <div class="ev-ag"><span class="t">{agenda_3_time}</span><div><h3>{agenda_3_title}</h3><p>{agenda_3_desc}</p></div></div>
      <div class="ev-ag"><span class="t">{agenda_4_time}</span><div><h3>{agenda_4_title}</h3><p>{agenda_4_desc}</p></div></div>
    </div>
  </div></section>

  <section class="ev-sec"><div class="ev-wrap">
    <div class="ev-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="ev-btn ev-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "evena-event",
    name: "Conference Event Template",
    description: "Energetic conference / event landing — gradient hero with date, location and live counters, speaker grid, timed agenda list and a register CTA. Modelled on Framer event templates.",
    content,
    variables: [
      "{badge_text}", "{event_name}", "{event_date}", "{event_location}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}",
      "{stat_1_num}", "{stat_1_label}", "{stat_2_num}", "{stat_2_label}", "{stat_3_num}", "{stat_3_label}", "{stat_4_num}", "{stat_4_label}",
      "{speakers_eyebrow}", "{speakers_title}", "{speakers_subtitle}",
      "{speaker_1_name}", "{speaker_1_role}", "{speaker_1_img}", "{speaker_2_name}", "{speaker_2_role}", "{speaker_2_img}",
      "{speaker_3_name}", "{speaker_3_role}", "{speaker_3_img}", "{speaker_4_name}", "{speaker_4_role}", "{speaker_4_img}",
      "{agenda_eyebrow}", "{agenda_title}", "{agenda_subtitle}",
      "{agenda_1_time}", "{agenda_1_title}", "{agenda_1_desc}", "{agenda_2_time}", "{agenda_2_title}", "{agenda_2_desc}",
      "{agenda_3_time}", "{agenda_3_title}", "{agenda_3_desc}", "{agenda_4_time}", "{agenda_4_title}", "{agenda_4_desc}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["event", "conference", "speakers", "dark", "agenda"],
    author: "Community", downloads: 471, rating: 4.7,
    seo_title_pattern: "{event_name} — {event_date}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{event_name} — {event_date}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{speaker_1_img}",
    slug_pattern: "{event_name}-event",
    schema_type: "Event",
    platform: "generic",
    defaultValues: {
      badge_text: "In-person & online", event_name: "Designverse 2026", event_date: "May 14–16, 2026", event_location: "San Francisco, CA",
      hero_subtitle: "Three days of talks, workshops and connections with the people shaping the future of design.",
      cta_primary: "Get tickets", cta_secondary: "View schedule",
      stat_1_num: "40+", stat_1_label: "Speakers", stat_2_num: "60", stat_2_label: "Sessions",
      stat_3_num: "3", stat_3_label: "Days", stat_4_num: "2k", stat_4_label: "Attendees",
      speakers_eyebrow: "Speakers", speakers_title: "Learn from the best",
      speakers_subtitle: "Industry leaders sharing what's next in design and technology.",
      speaker_1_name: "Aria Cole", speaker_1_role: "Head of Design, Figbit", speaker_1_img: U("1494790108377-be9c29b29330", 400, 400),
      speaker_2_name: "Marcus Lee", speaker_2_role: "Founder, Studio Mono", speaker_2_img: U("1506794778202-cad84cf45f1d", 400, 400),
      speaker_3_name: "Priya Nair", speaker_3_role: "VP Product, Lumora", speaker_3_img: U("1438761681033-6461ffad8d80", 400, 400),
      speaker_4_name: "Tom Becker", speaker_4_role: "Creative Director, Vertex", speaker_4_img: U("1500648767791-00dcc994a43e", 400, 400),
      agenda_eyebrow: "Agenda", agenda_title: "What to expect",
      agenda_subtitle: "A snapshot of day one — full schedule on the tickets page.",
      agenda_1_time: "09:00", agenda_1_title: "Opening Keynote", agenda_1_desc: "The state of design in 2026",
      agenda_2_time: "11:00", agenda_2_title: "Workshop: Design Systems", agenda_2_desc: "Hands-on session with the Figbit team",
      agenda_3_time: "14:00", agenda_3_title: "Panel: The AI Shift", agenda_3_desc: "How AI is reshaping creative work",
      agenda_4_time: "17:00", agenda_4_title: "Networking Mixer", agenda_4_desc: "Drinks, music and great conversation",
      final_title: "Don't miss out", final_subtitle: "Early-bird tickets are limited — secure your spot today.",
      final_cta: "Register now",
    },
  };
};

/* ───────────────────────── 12. TERRA — Real estate ──────────────────────── */
const terraRealEstate = (): MarketplaceTemplate => {
  const content = `<style>
.tr{--bg:#fbfaf7;--fg:#14130f;--muted:#6c6a62;--line:#e7e4dc;--ac:#1f7a5a;--card:#fff;background:var(--bg);color:var(--fg);font-family:'Inter',system-ui,sans-serif;line-height:1.6;overflow:hidden}
.tr *{box-sizing:border-box;margin:0}
.tr-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.tr h1,.tr h2,.tr h3{letter-spacing:-.02em;line-height:1.06;font-weight:700}
.tr-hero{position:relative;min-height:84vh;display:flex;align-items:flex-end;padding:0 0 clamp(50px,7vw,90px);background-size:cover;background-position:center;border-radius:0 0 24px 24px;overflow:hidden}
.tr-hero::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.65))}
.tr-hero .in{position:relative;z-index:2;color:#fff}
.tr-hero .eye{color:#cdebdd;font-size:13px;text-transform:uppercase;letter-spacing:.2em;margin-bottom:16px}
.tr-hero h1{color:#fff;font-size:clamp(40px,7vw,84px);max-width:16ch;margin-bottom:18px}
.tr-hero p{color:rgba(255,255,255,.92);font-size:clamp(16px,1.7vw,20px);max-width:46ch;margin-bottom:28px}
.tr-cta{display:flex;gap:14px;flex-wrap:wrap}
.tr-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 30px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;transition:.25s}
.tr-btn-p{background:var(--ac);color:#fff}
.tr-btn-p:hover{filter:brightness(1.08)}
.tr-btn-o{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.5);color:#fff;backdrop-filter:blur(8px)}
.tr-sec{padding:clamp(60px,9vw,110px) 0}
.tr-eye{color:var(--ac);font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.16em;margin-bottom:14px}
.tr-head{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:40px}
.tr-head h2{font-size:clamp(28px,4.4vw,46px);max-width:18ch}
.tr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.tr-prop{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:.3s}
.tr-prop:hover{transform:translateY(-4px);box-shadow:0 24px 50px rgba(0,0,0,.1)}
.tr-prop img{width:100%;aspect-ratio:4/3;object-fit:cover}
.tr-prop .b{padding:22px}
.tr-prop .price{color:var(--ac);font-weight:700;font-size:20px}
.tr-prop h3{font-size:18px;margin:6px 0 4px}
.tr-prop .addr{color:var(--muted);font-size:14px;margin-bottom:14px}
.tr-prop .specs{display:flex;gap:16px;color:var(--muted);font-size:13px;border-top:1px solid var(--line);padding-top:14px}
.tr-feat{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.tr-feat img{width:100%;border-radius:18px;aspect-ratio:4/3;object-fit:cover}
.tr-feat h2{font-size:clamp(26px,3.6vw,42px);margin-bottom:16px}
.tr-feat p{color:var(--muted);font-size:17px;margin-bottom:14px}
.tr-list{list-style:none;padding:0;display:flex;flex-direction:column;gap:12px}
.tr-list li{color:var(--muted);font-size:15px;display:flex;gap:10px}
.tr-list li::before{content:'✓';color:var(--ac);font-weight:700}
.tr-final{text-align:center;background:var(--ac);color:#fff;border-radius:28px;padding:clamp(54px,8vw,100px) 24px}
.tr-final h2{color:#fff;font-size:clamp(30px,5vw,54px);max-width:16ch;margin:0 auto 16px}
.tr-final p{color:rgba(255,255,255,.85);max-width:44ch;margin:0 auto 30px;font-size:17px}
.tr-final .tr-btn-p{background:#fff;color:var(--ac)}
@media(max-width:860px){.tr-grid{grid-template-columns:1fr}.tr-feat{grid-template-columns:1fr}}
</style>
<div class="tr">
  <section class="tr-hero" style="background-image:url('{hero_image}')"><div class="tr-wrap in">
    <div class="eye">{eyebrow}</div>
    <h1>{hero_title}</h1>
    <p>{hero_subtitle}</p>
    <div class="tr-cta"><a class="tr-btn tr-btn-p" href="#">{cta_primary}</a><a class="tr-btn tr-btn-o" href="#">{cta_secondary}</a></div>
  </div></section>

  <section class="tr-sec"><div class="tr-wrap">
    <div class="tr-head">
      <div><div class="tr-eye">{listings_eyebrow}</div><h2>{listings_title}</h2></div>
    </div>
    <div class="tr-grid">
      <div class="tr-prop"><img src="{prop_1_image}" alt="{prop_1_title}"/><div class="b"><div class="price">{prop_1_price}</div><h3>{prop_1_title}</h3><div class="addr">{prop_1_addr}</div><div class="specs"><span>🛏 {prop_1_beds}</span><span>🛁 {prop_1_baths}</span><span>📐 {prop_1_area}</span></div></div></div>
      <div class="tr-prop"><img src="{prop_2_image}" alt="{prop_2_title}"/><div class="b"><div class="price">{prop_2_price}</div><h3>{prop_2_title}</h3><div class="addr">{prop_2_addr}</div><div class="specs"><span>🛏 {prop_2_beds}</span><span>🛁 {prop_2_baths}</span><span>📐 {prop_2_area}</span></div></div></div>
      <div class="tr-prop"><img src="{prop_3_image}" alt="{prop_3_title}"/><div class="b"><div class="price">{prop_3_price}</div><h3>{prop_3_title}</h3><div class="addr">{prop_3_addr}</div><div class="specs"><span>🛏 {prop_3_beds}</span><span>🛁 {prop_3_baths}</span><span>📐 {prop_3_area}</span></div></div></div>
    </div>
  </div></section>

  <section class="tr-sec"><div class="tr-wrap">
    <div class="tr-feat">
      <img src="{feature_image}" alt="{feature_title}"/>
      <div>
        <div class="tr-eye">{feature_eyebrow}</div>
        <h2>{feature_title}</h2>
        <p>{feature_text}</p>
        <ul class="tr-list"><li>{feature_point_1}</li><li>{feature_point_2}</li><li>{feature_point_3}</li></ul>
      </div>
    </div>
  </div></section>

  <section class="tr-sec"><div class="tr-wrap">
    <div class="tr-final">
      <h2>{final_title}</h2>
      <p>{final_subtitle}</p>
      <a class="tr-btn tr-btn-p" href="#">{final_cta}</a>
    </div>
  </div></section>
</div>`;
  return {
    id: "terra-real-estate",
    name: "Real Estate Template",
    description: "Refined real-estate / property page — full-bleed hero, three-card property listings with specs, a featured-property split with checklist and a contact CTA. Modelled on Framer real-estate templates.",
    content,
    variables: [
      "{eyebrow}", "{hero_title}", "{hero_subtitle}", "{cta_primary}", "{cta_secondary}", "{hero_image}",
      "{listings_eyebrow}", "{listings_title}",
      "{prop_1_price}", "{prop_1_title}", "{prop_1_addr}", "{prop_1_beds}", "{prop_1_baths}", "{prop_1_area}", "{prop_1_image}",
      "{prop_2_price}", "{prop_2_title}", "{prop_2_addr}", "{prop_2_beds}", "{prop_2_baths}", "{prop_2_area}", "{prop_2_image}",
      "{prop_3_price}", "{prop_3_title}", "{prop_3_addr}", "{prop_3_beds}", "{prop_3_baths}", "{prop_3_area}", "{prop_3_image}",
      "{feature_eyebrow}", "{feature_title}", "{feature_text}", "{feature_point_1}", "{feature_point_2}", "{feature_point_3}", "{feature_image}",
      "{final_title}", "{final_subtitle}", "{final_cta}",
    ],
    category: "business",
    tags: ["real-estate", "property", "listings", "light", "homes"],
    author: "Community", downloads: 519, rating: 4.8,
    seo_title_pattern: "{hero_title}",
    seo_description_pattern: "{hero_subtitle}",
    og_title_pattern: "{hero_title}", og_description_pattern: "{hero_subtitle}", og_image_pattern: "{hero_image}",
    slug_pattern: "terra-real-estate",
    schema_type: "Organization",
    platform: "generic",
    defaultValues: {
      eyebrow: "Premium properties", hero_title: "Find a place you'll love to call home",
      hero_subtitle: "Handpicked homes and expert guidance to make your next move effortless.",
      cta_primary: "Browse listings", cta_secondary: "Book a viewing",
      hero_image: U("1564013799919-ab600027ffc6", 1600, 1000),
      listings_eyebrow: "Featured listings", listings_title: "Homes on the market now",
      prop_1_price: "$845,000", prop_1_title: "Modern Hillside Villa", prop_1_addr: "Oak Ridge, Austin TX", prop_1_beds: "4 beds", prop_1_baths: "3 baths", prop_1_area: "2,800 sqft", prop_1_image: U("1568605114967-8130f3a36994", 800, 600),
      prop_2_price: "$520,000", prop_2_title: "Downtown Loft", prop_2_addr: "Market St, Austin TX", prop_2_beds: "2 beds", prop_2_baths: "2 baths", prop_2_area: "1,450 sqft", prop_2_image: U("1493809842364-78817add7ffb", 800, 600),
      prop_3_price: "$1,250,000", prop_3_title: "Lakeside Estate", prop_3_addr: "Lake Travis, TX", prop_3_beds: "5 beds", prop_3_baths: "4 baths", prop_3_area: "4,100 sqft", prop_3_image: U("1512917774080-9991f1c4c750", 800, 600),
      feature_eyebrow: "Why Terra", feature_title: "Guidance from start to keys",
      feature_text: "Our agents handle the details so you can focus on finding the right home — not the paperwork.",
      feature_point_1: "Local market experts", feature_point_2: "Transparent, no-pressure process", feature_point_3: "Support through closing and beyond",
      final_title: "Ready to find your home?", final_subtitle: "Talk to one of our agents and start your search today.",
      final_cta: "Get in touch",
    },
  };
};

export const FRAMER_BATCH2_TEMPLATES: MarketplaceTemplate[] = [
  auroraWeb3(),
  savoraRestaurant(),
  ciraAgency(),
  novaCourse(),
  evenaEvent(),
  terraRealEstate(),
];
