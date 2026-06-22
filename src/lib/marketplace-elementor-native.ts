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
    category: "WordPress",
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
    category: "WordPress",
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
    category: "WordPress",
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

export const ELEMENTOR_NATIVE_TEMPLATES: MarketplaceTemplate[] = [
  saasLanding(),
  localBusiness(),
  heroLead(),
];
