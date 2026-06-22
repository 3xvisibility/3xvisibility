// Native Elementor JSON marketplace templates.
//
// Unlike the HTML-based templates, these carry their original Elementor
// `_elementor_data` structure (`elementorData`) and `kind: "elementor"`. When
// imported and published they create NATIVE, fully-editable Elementor pages on
// the target WordPress site — the design, typography, colors and layout are
// preserved exactly and {variables} are replaced with AI/row content.
//
// These are modelled on the common Astra + Elementor "free download" layouts
// (hero / features / services / testimonials / CTA) with real styling settings
// so the published page looks designed, not plain.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

const UN = "https://images.unsplash.com/photo";

// ── Small Elementor builders ────────────────────────────────────────────────
let _id = 0;
const eid = (p: string) => `${p}${(++_id).toString(36)}`;

const heading = (title: string, size: string, settings: Record<string, unknown> = {}) => ({
  id: eid("h"),
  elType: "widget",
  widgetType: "heading",
  settings: { title, header_size: size, ...settings },
});

const text = (editor: string, settings: Record<string, unknown> = {}) => ({
  id: eid("t"),
  elType: "widget",
  widgetType: "text-editor",
  settings: { editor, ...settings },
});

const button = (label: string, url: string, settings: Record<string, unknown> = {}) => ({
  id: eid("b"),
  elType: "widget",
  widgetType: "button",
  settings: {
    text: label,
    link: { url, is_external: "", nofollow: "" },
    button_background_color: "#2563eb",
    button_text_color: "#ffffff",
    border_radius: { unit: "px", top: "8", right: "8", bottom: "8", left: "8", isLinked: true },
    text_padding: { unit: "px", top: "16", right: "32", bottom: "16", left: "32", isLinked: false },
    ...settings,
  },
});

const image = (url: string, alt: string, settings: Record<string, unknown> = {}) => ({
  id: eid("i"),
  elType: "widget",
  widgetType: "image",
  settings: {
    image: { url, alt },
    image_size: "full",
    border_radius: { unit: "px", top: "16", right: "16", bottom: "16", left: "16", isLinked: true },
    ...settings,
  },
});

const icon = (iconName: string, title: string, body: string) => ({
  id: eid("ib"),
  elType: "widget",
  widgetType: "icon-box",
  settings: {
    selected_icon: { value: iconName, library: "fa-solid" },
    title_text: title,
    description_text: body,
    title_size: "h4",
    position: "top",
  },
});

const column = (size: number, elements: unknown[], settings: Record<string, unknown> = {}) => ({
  id: eid("c"),
  elType: "column",
  settings: { _column_size: size, ...settings },
  elements,
});

const section = (
  elements: unknown[],
  settings: Record<string, unknown> = {},
) => ({
  id: eid("s"),
  elType: "section",
  settings: {
    padding: { unit: "px", top: "80", right: "0", bottom: "80", left: "0", isLinked: false },
    ...settings,
  },
  elements,
});

const HERO_OVERLAY = {
  background_background: "classic",
  background_overlay_background: "classic",
  background_overlay_color: "rgba(15,23,42,0.6)",
};

// ── 1. SaaS / Agency landing ────────────────────────────────────────────────
const saasLanding = (): MarketplaceTemplate => {
  _id = 0;
  const data = [
    section(
      [
        column(100, [
          heading("{headline}", "h1", { align: "center", title_color: "#ffffff" }),
          heading("{subheadline}", "h3", { align: "center", title_color: "#e2e8f0" }),
          text("<p style='text-align:center;color:#e2e8f0'>{intro}</p>"),
          button("{cta_label}", "{cta_url}", { align: "center" }),
        ]),
      ],
      {
        ...HERO_OVERLAY,
        background_image: { url: `${UN}-1497366216548-37526070297c?w=1600` },
        background_position: "center center",
        background_size: "cover",
        padding: { unit: "px", top: "140", right: "0", bottom: "140", left: "0", isLinked: false },
      },
    ),
    section([
      column(100, [heading("{features_title}", "h2", { align: "center" })]),
    ], { padding: { unit: "px", top: "70", right: "0", bottom: "20", left: "0", isLinked: false } }),
    section([
      column(33, [icon("fas fa-bolt", "{feature_1_title}", "{feature_1_body}")]),
      column(33, [icon("fas fa-shield-halved", "{feature_2_title}", "{feature_2_body}")]),
      column(33, [icon("fas fa-chart-line", "{feature_3_title}", "{feature_3_body}")]),
    ]),
    section([
      column(50, [image("{about_image}", "{about_title}")]),
      column(50, [
        heading("{about_title}", "h2"),
        text("<p>{about_body}</p>"),
        button("{cta_label}", "{cta_url}"),
      ], { padding: { unit: "px", top: "20", right: "0", bottom: "0", left: "40", isLinked: false } }),
    ]),
    section([
      column(100, [
        heading("{cta_headline}", "h2", { align: "center", title_color: "#ffffff" }),
        button("{cta_label}", "{cta_url}", { align: "center" }),
      ]),
    ], { background_background: "classic", background_color: "#0f172a" }),
  ];
  return {
    id: "elementor-saas-landing",
    name: "Elementor — SaaS / Agency Landing",
    description: "Native Elementor landing page: hero, feature icons, about split, and CTA. Publishes as a true editable Elementor page.",
    content: "<!-- Native Elementor template -->",
    variables: [
      "headline", "subheadline", "intro", "cta_label", "cta_url", "features_title",
      "feature_1_title", "feature_1_body", "feature_2_title", "feature_2_body",
      "feature_3_title", "feature_3_body", "about_title", "about_body", "about_image",
      "cta_headline",
    ],
    category: "WordPress Elementor",
    tags: ["elementor", "native", "saas", "agency", "landing"],
    author: "Lovable",
    downloads: 0,
    rating: 5,
    platform: "wordpress",
    kind: "elementor",
    elementorData: data,
    elementorPageTemplate: "elementor_canvas",
    defaultValues: {
      headline: "Grow your {service} business in {city}",
      subheadline: "The all-in-one platform trusted by local teams",
      intro: "Launch faster, convert more, and scale your {service} with confidence.",
      cta_label: "Start Free",
      cta_url: "#contact",
      features_title: "Everything you need",
      feature_1_title: "Lightning fast", feature_1_body: "Built for speed and performance.",
      feature_2_title: "Secure", feature_2_body: "Enterprise-grade protection by default.",
      feature_3_title: "Insightful", feature_3_body: "Track what matters with live analytics.",
      about_title: "Why choose us", about_body: "Years of experience delivering results for {service} clients across {city}.",
      about_image: `${UN}-1522071820081-009f0129c71c?w=1000`,
      cta_headline: "Ready to get started?",
    },
  };
};

// ── 2. Local business / service ─────────────────────────────────────────────
const localBusiness = (): MarketplaceTemplate => {
  _id = 0;
  const data = [
    section(
      [column(100, [
        heading("{business_name}", "h1", { align: "center", title_color: "#ffffff" }),
        heading("{tagline}", "h3", { align: "center", title_color: "#f1f5f9" }),
        button("{cta_label}", "{cta_url}", { align: "center" }),
      ])],
      {
        ...HERO_OVERLAY,
        background_image: { url: `${UN}-1581578731548-c64695cc6952?w=1600` },
        background_size: "cover",
        padding: { unit: "px", top: "130", right: "0", bottom: "130", left: "0", isLinked: false },
      },
    ),
    section([column(100, [heading("{services_title}", "h2", { align: "center" })])],
      { padding: { unit: "px", top: "70", right: "0", bottom: "10", left: "0", isLinked: false } }),
    section([
      column(33, [image("{service_1_image}", "{service_1_title}"), heading("{service_1_title}", "h4", { align: "center" }), text("<p style='text-align:center'>{service_1_body}</p>")]),
      column(33, [image("{service_2_image}", "{service_2_title}"), heading("{service_2_title}", "h4", { align: "center" }), text("<p style='text-align:center'>{service_2_body}</p>")]),
      column(33, [image("{service_3_image}", "{service_3_title}"), heading("{service_3_title}", "h4", { align: "center" }), text("<p style='text-align:center'>{service_3_body}</p>")]),
    ]),
    section([column(100, [
      heading("{cta_headline}", "h2", { align: "center", title_color: "#ffffff" }),
      text("<p style='text-align:center;color:#e2e8f0'>{cta_subtext}</p>"),
      button("{cta_label}", "{cta_url}", { align: "center" }),
    ])], { background_background: "classic", background_color: "#111827" }),
  ];
  return {
    id: "elementor-local-business",
    name: "Elementor — Local Business / Services",
    description: "Native Elementor service page: hero, 3 service cards with images, and contact CTA. Perfect for local SEO landing pages.",
    content: "<!-- Native Elementor template -->",
    variables: [
      "business_name", "tagline", "cta_label", "cta_url", "services_title",
      "service_1_title", "service_1_body", "service_1_image",
      "service_2_title", "service_2_body", "service_2_image",
      "service_3_title", "service_3_body", "service_3_image",
      "cta_headline", "cta_subtext",
    ],
    category: "WordPress Elementor",
    tags: ["elementor", "native", "local", "services", "seo"],
    author: "Lovable",
    downloads: 0,
    rating: 5,
    platform: "wordpress",
    kind: "elementor",
    elementorData: data,
    elementorPageTemplate: "elementor_canvas",
    defaultValues: {
      business_name: "{brand_name}", tagline: "Trusted {service} experts in {city}",
      cta_label: "Get a Free Quote", cta_url: "#contact", services_title: "Our Services",
      service_1_title: "{service} Repair", service_1_body: "Fast, reliable repairs done right.", service_1_image: `${UN}-1504148455328-c376907d081c?w=900`,
      service_2_title: "Installation", service_2_body: "Professional installation you can trust.", service_2_image: `${UN}-1581094794329-c8112a89af12?w=900`,
      service_3_title: "Maintenance", service_3_body: "Keep things running with regular care.", service_3_image: `${UN}-1521791136064-7986c2920216?w=900`,
      cta_headline: "Need help today?", cta_subtext: "Call us for a free, no-obligation quote in {city}.",
    },
  };
};

// ── 3. Hero lead (simple) ───────────────────────────────────────────────────
const heroLead = (): MarketplaceTemplate => {
  _id = 0;
  const data = [
    section([column(100, [
      heading("{headline}", "h1", { align: "center" }),
      heading("{subheadline}", "h3", { align: "center" }),
      text("<p style='text-align:center'>{intro}</p>"),
      button("{cta_label}", "{cta_url}", { align: "center" }),
    ])], { padding: { unit: "px", top: "100", right: "0", bottom: "60", left: "0", isLinked: false } }),
    section([column(100, [
      heading("{section_title}", "h2", { align: "center" }),
      text("<p style='text-align:center'>{section_body}</p>"),
      image("{feature_image}", "{section_title}", { align: "center" }),
    ])]),
  ];
  return {
    id: "elementor-hero-lead",
    name: "Elementor — Hero Lead Page",
    description: "Simple native Elementor landing page (hero + feature). Publishes as a true editable Elementor page with your AI content filled in.",
    content: "<!-- Native Elementor template -->",
    variables: ["headline", "subheadline", "intro", "cta_label", "cta_url", "section_title", "section_body", "feature_image"],
    category: "WordPress Elementor",
    tags: ["elementor", "native", "landing", "lead-gen"],
    author: "Lovable",
    downloads: 0,
    rating: 5,
    platform: "wordpress",
    kind: "elementor",
    elementorData: data,
    elementorPageTemplate: "elementor_canvas",
    defaultValues: {
      headline: "Grow your business in {city}", subheadline: "Trusted {service} experts",
      intro: "We help local businesses get found online and convert more customers.",
      cta_label: "Get a Free Quote", cta_url: "#contact", section_title: "Why choose us",
      section_body: "Years of experience delivering results for {service} clients across {city}.",
      feature_image: `${UN}-1497366216548-37526070297c?w=1200`,
    },
  };
};

// ── Generic themed factory (Ultimate Addons / Elementor "free download" style) ─
// Builds a standard hero → features → about → CTA native Elementor page so each
// niche template publishes as a true, editable Elementor page on WordPress.
export type ThemedSpec = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  heroImage: string;
  heroOverlay?: string;
  ctaBg: string;
  feature1: [string, string, string]; // icon, title, body
  feature2: [string, string, string];
  feature3: [string, string, string];
  aboutImage: string;
  defaults: Record<string, string>;
  /** Live demo URL this template is modelled on (fetched for the real design on import). */
  demoUrl?: string;
};

export const makeThemed = (s: ThemedSpec): MarketplaceTemplate => {
  _id = 0;
  const data = [
    section(
      [column(100, [
        heading("{headline}", "h1", { align: "center", title_color: "#ffffff" }),
        heading("{subheadline}", "h3", { align: "center", title_color: "#e2e8f0" }),
        text("<p style='text-align:center;color:#e2e8f0'>{intro}</p>"),
        button("{cta_label}", "{cta_url}", { align: "center" }),
      ])],
      {
        ...HERO_OVERLAY,
        background_overlay_color: s.heroOverlay ?? "rgba(15,23,42,0.6)",
        background_image: { url: s.heroImage },
        background_position: "center center",
        background_size: "cover",
        padding: { unit: "px", top: "140", right: "0", bottom: "140", left: "0", isLinked: false },
      },
    ),
    section([column(100, [heading("{features_title}", "h2", { align: "center" })])],
      { padding: { unit: "px", top: "70", right: "0", bottom: "10", left: "0", isLinked: false } }),
    section([
      column(33, [icon(s.feature1[0], "{feature_1_title}", "{feature_1_body}")]),
      column(33, [icon(s.feature2[0], "{feature_2_title}", "{feature_2_body}")]),
      column(33, [icon(s.feature3[0], "{feature_3_title}", "{feature_3_body}")]),
    ]),
    section([
      column(50, [image("{about_image}", "{about_title}")]),
      column(50, [
        heading("{about_title}", "h2"),
        text("<p>{about_body}</p>"),
        button("{cta_label}", "{cta_url}"),
      ], { padding: { unit: "px", top: "20", right: "0", bottom: "0", left: "40", isLinked: false } }),
    ]),
    section([column(100, [
      heading("{cta_headline}", "h2", { align: "center", title_color: "#ffffff" }),
      text("<p style='text-align:center;color:#e2e8f0'>{cta_subtext}</p>"),
      button("{cta_label}", "{cta_url}", { align: "center" }),
    ])], { background_background: "classic", background_color: s.ctaBg }),
  ];
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    content: "<!-- Native Elementor template -->",
    variables: [
      "headline", "subheadline", "intro", "cta_label", "cta_url", "features_title",
      "feature_1_title", "feature_1_body", "feature_2_title", "feature_2_body",
      "feature_3_title", "feature_3_body", "about_title", "about_body", "about_image",
      "cta_headline", "cta_subtext",
    ],
    category: "WordPress Elementor",
    tags: ["elementor", "native", "wordpress", "json", ...s.tags],
    author: "Lovable",
    downloads: 0,
    rating: 5,
    platform: "wordpress",
    kind: "elementor",
    elementorData: data,
    elementorPageTemplate: "elementor_canvas",
    sourceUrl: s.demoUrl,
    defaultValues: {
      cta_label: "Get Started", cta_url: "#contact", features_title: "What we offer",
      feature_1_title: s.feature1[1], feature_1_body: s.feature1[2],
      feature_2_title: s.feature2[1], feature_2_body: s.feature2[2],
      feature_3_title: s.feature3[1], feature_3_body: s.feature3[2],
      about_image: s.aboutImage,
      cta_headline: "Ready to begin?", cta_subtext: "Reach out today and let's get started.",
      ...s.defaults,
    },
  };
};

const THEMED_TEMPLATES: MarketplaceTemplate[] = [
  makeThemed({
    id: "elementor-business-consulting",
    name: "Elementor — Business Consulting",
    description: "Native Elementor consulting/agency page: hero, services, about, CTA. Publishes as a true editable Elementor page.",
    tags: ["consulting", "business", "agency"],
    heroImage: `${UN}-1454165804606-c3d57bc86b40?w=1600`,
    ctaBg: "#0f172a",
    feature1: ["fas fa-briefcase", "Strategy", "Data-driven plans tailored to your goals."],
    feature2: ["fas fa-handshake", "Partnership", "We work as an extension of your team."],
    feature3: ["fas fa-chart-line", "Growth", "Measurable results that move the needle."],
    aboutImage: `${UN}-1521737604893-d14cc237f11d?w=1000`,
    defaults: {
      headline: "Consulting that drives {service} growth in {city}",
      subheadline: "Expert guidance for ambitious businesses",
      intro: "We help {service} companies scale with proven strategy and execution.",
      about_title: "Trusted advisors", about_body: "Decades of combined experience helping {service} businesses in {city} succeed.",
    },
  }),
  makeThemed({
    id: "elementor-restaurant",
    name: "Elementor — Restaurant / Cafe",
    description: "Native Elementor restaurant page: hero, menu highlights, about, reservation CTA.",
    tags: ["restaurant", "cafe", "food"],
    heroImage: `${UN}-1517248135467-4c7edcad34c4?w=1600`,
    heroOverlay: "rgba(0,0,0,0.55)",
    ctaBg: "#1c1917",
    feature1: ["fas fa-utensils", "Fresh Cuisine", "Locally-sourced ingredients, made daily."],
    feature2: ["fas fa-wine-glass", "Fine Drinks", "Curated wines and signature cocktails."],
    feature3: ["fas fa-star", "Great Ambience", "A warm space for any occasion."],
    aboutImage: `${UN}-1552566626-52f8b828add9?w=1000`,
    defaults: {
      headline: "Authentic dining in {city}", subheadline: "{brand_name} — taste the difference",
      intro: "Enjoy handcrafted dishes in a welcoming atmosphere.",
      cta_label: "Book a Table", features_title: "Why dine with us",
      about_title: "Our story", about_body: "A passion for food and hospitality, serving {city} for years.",
      cta_headline: "Reserve your table today",
    },
  }),
  makeThemed({
    id: "elementor-fitness-gym",
    name: "Elementor — Fitness / Gym",
    description: "Native Elementor gym page: hero, programs, about, membership CTA.",
    tags: ["fitness", "gym", "health"],
    heroImage: `${UN}-1534438327276-14e5300c3a48?w=1600`,
    heroOverlay: "rgba(2,6,23,0.6)",
    ctaBg: "#0c0a09",
    feature1: ["fas fa-dumbbell", "Strength", "Personalized programs for real results."],
    feature2: ["fas fa-heart-pulse", "Cardio", "High-energy classes for every level."],
    feature3: ["fas fa-user-check", "Coaching", "Certified trainers in your corner."],
    aboutImage: `${UN}-1571019613454-1cb2f99b2d8b?w=1000`,
    defaults: {
      headline: "Transform your body in {city}", subheadline: "Train hard. Get stronger.",
      intro: "Join {brand_name} and reach your fitness goals faster.",
      cta_label: "Join Now", features_title: "Our programs",
      about_title: "Built for results", about_body: "State-of-the-art equipment and expert coaching in {city}.",
      cta_headline: "Start your free trial",
    },
  }),
  makeThemed({
    id: "elementor-medical-clinic",
    name: "Elementor — Medical / Clinic",
    description: "Native Elementor healthcare page: hero, services, about, appointment CTA.",
    tags: ["medical", "clinic", "health", "dental"],
    heroImage: `${UN}-1576091160550-2173dba999ef?w=1600`,
    heroOverlay: "rgba(8,47,73,0.55)",
    ctaBg: "#082f49",
    feature1: ["fas fa-stethoscope", "Expert Care", "Experienced, compassionate professionals."],
    feature2: ["fas fa-notes-medical", "Modern Facility", "Advanced equipment and clean spaces."],
    feature3: ["fas fa-calendar-check", "Easy Booking", "Flexible appointments that fit your day."],
    aboutImage: `${UN}-1551190822-a9333d879b1f?w=1000`,
    defaults: {
      headline: "Quality {service} care in {city}", subheadline: "Your health is our priority",
      intro: "Comprehensive care from a team you can trust.",
      cta_label: "Book Appointment", features_title: "Our services",
      about_title: "Caring for {city}", about_body: "Dedicated to providing exceptional {service} care for every patient.",
      cta_headline: "Schedule your visit",
    },
  }),
  makeThemed({
    id: "elementor-real-estate",
    name: "Elementor — Real Estate",
    description: "Native Elementor real estate page: hero, listings highlights, about, contact CTA.",
    tags: ["real-estate", "property", "agent"],
    heroImage: `${UN}-1560518883-ce09059eeffa?w=1600`,
    heroOverlay: "rgba(15,23,42,0.55)",
    ctaBg: "#111827",
    feature1: ["fas fa-house", "Find Homes", "Browse curated listings in {city}."],
    feature2: ["fas fa-key", "Easy Buying", "We guide you through every step."],
    feature3: ["fas fa-handshake", "Trusted Agents", "Local experts on your side."],
    aboutImage: `${UN}-1568605114967-8130f3a36994?w=1000`,
    defaults: {
      headline: "Find your dream home in {city}", subheadline: "Properties that fit your life",
      intro: "Discover the best {service} listings with expert local agents.",
      cta_label: "View Listings", features_title: "Why choose us",
      about_title: "Local market experts", about_body: "Helping families buy and sell across {city} with confidence.",
      cta_headline: "Talk to an agent today",
    },
  }),
  makeThemed({
    id: "elementor-education-course",
    name: "Elementor — Education / Course",
    description: "Native Elementor education page: hero, course highlights, about, enroll CTA.",
    tags: ["education", "course", "learning"],
    heroImage: `${UN}-1503676260728-1c00da094a0b?w=1600`,
    heroOverlay: "rgba(30,27,75,0.6)",
    ctaBg: "#1e1b4b",
    feature1: ["fas fa-graduation-cap", "Expert Tutors", "Learn from industry professionals."],
    feature2: ["fas fa-laptop", "Flexible Learning", "Study anytime, anywhere."],
    feature3: ["fas fa-certificate", "Get Certified", "Earn credentials that matter."],
    aboutImage: `${UN}-1522202176988-66273c2fd55f?w=1000`,
    defaults: {
      headline: "Learn {service} the right way", subheadline: "Courses built for real results",
      intro: "Master new skills with hands-on, expert-led courses.",
      cta_label: "Enroll Now", features_title: "Why learn with us",
      about_title: "Education that works", about_body: "Thousands of students have advanced their careers with us.",
      cta_headline: "Start learning today",
    },
  }),
  makeThemed({
    id: "elementor-photography",
    name: "Elementor — Photography / Portfolio",
    description: "Native Elementor portfolio page: hero, services, about, booking CTA.",
    tags: ["photography", "portfolio", "creative"],
    heroImage: `${UN}-1452587925148-ce544e77e70d?w=1600`,
    heroOverlay: "rgba(0,0,0,0.5)",
    ctaBg: "#18181b",
    feature1: ["fas fa-camera", "Portraits", "Timeless images that tell your story."],
    feature2: ["fas fa-image", "Events", "Capturing the moments that matter."],
    feature3: ["fas fa-palette", "Editing", "Polished, professional finishing."],
    aboutImage: `${UN}-1492691527719-9d1e07e534b4?w=1000`,
    defaults: {
      headline: "{brand_name} Photography in {city}", subheadline: "Moments made unforgettable",
      intro: "Professional photography for portraits, events, and brands.",
      cta_label: "Book a Session", features_title: "What I shoot",
      about_title: "Behind the lens", about_body: "A creative eye and years of experience serving clients in {city}.",
      cta_headline: "Let's create something beautiful",
    },
  }),
  makeThemed({
    id: "elementor-app-showcase",
    name: "Elementor — App / Product Showcase",
    description: "Native Elementor app landing page: hero, features, about, download CTA.",
    tags: ["app", "saas", "product", "startup"],
    heroImage: `${UN}-1551650975-87deedd944c3?w=1600`,
    heroOverlay: "rgba(2,6,23,0.65)",
    ctaBg: "#020617",
    feature1: ["fas fa-mobile-screen", "Beautiful UI", "Intuitive design users love."],
    feature2: ["fas fa-bolt", "Fast & Reliable", "Built for speed and stability."],
    feature3: ["fas fa-lock", "Secure", "Your data, protected end to end."],
    aboutImage: `${UN}-1512941937669-90a1b58e7e9c?w=1000`,
    defaults: {
      headline: "The smarter way to {service}", subheadline: "Download {brand_name} today",
      intro: "Everything you need in one beautifully simple app.",
      cta_label: "Download Free", features_title: "Key features",
      about_title: "Built for you", about_body: "Loved by thousands of users who get more done every day.",
      cta_headline: "Get the app now",
    },
  }),
];

export const ELEMENTOR_NATIVE_TEMPLATES: MarketplaceTemplate[] = [
  saasLanding(),
  localBusiness(),
  heroLead(),
  ...THEMED_TEMPLATES,
];
