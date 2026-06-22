// Native Elementor JSON marketplace templates.
//
// Unlike the HTML-based templates, these carry their original Elementor
// `_elementor_data` structure (`elementorData`) and `kind: "elementor"`. When
// imported and published they create NATIVE, fully-editable Elementor pages on
// the target WordPress site — the design and layout are preserved exactly and
// {variables} are replaced with AI/row content.
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";

// A single full-width Elementor section → column → heading + text + button.
// Uses {variables} inside widget settings so AI content fills them on publish.
const heroLeadElementorData = [
  {
    id: "sec1",
    elType: "section",
    settings: { layout: "full_width", padding: { unit: "px", top: "100", bottom: "100" } },
    elements: [
      {
        id: "col1",
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: "w_head",
            elType: "widget",
            widgetType: "heading",
            settings: { title: "{headline}", header_size: "h1", align: "center" },
          },
          {
            id: "w_sub",
            elType: "widget",
            widgetType: "heading",
            settings: { title: "{subheadline}", header_size: "h3", align: "center" },
          },
          {
            id: "w_text",
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p>{intro}</p>", align: "center" },
          },
          {
            id: "w_btn",
            elType: "widget",
            widgetType: "button",
            settings: {
              text: "{cta_label}",
              link: { url: "{cta_url}", is_external: "", nofollow: "" },
              align: "center",
            },
          },
        ],
      },
    ],
  },
  {
    id: "sec2",
    elType: "section",
    settings: { padding: { unit: "px", top: "80", bottom: "80" } },
    elements: [
      {
        id: "col2",
        elType: "column",
        settings: { _column_size: 100 },
        elements: [
          {
            id: "w_feat_head",
            elType: "widget",
            widgetType: "heading",
            settings: { title: "{section_title}", header_size: "h2", align: "center" },
          },
          {
            id: "w_feat_text",
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: "<p>{section_body}</p>" },
          },
          {
            id: "w_img",
            elType: "widget",
            widgetType: "image",
            settings: { image: { url: "{feature_image}", alt: "{section_title}" } },
          },
        ],
      },
    ],
  },
];

const elementorHeroLead = (): MarketplaceTemplate => ({
  id: "elementor-hero-lead",
  name: "Elementor — Hero Lead Page",
  description:
    "Native Elementor landing page (hero + features). Publishes as a true, editable Elementor page with your AI content filled in.",
  content: "<!-- Native Elementor template -->",
  variables: [
    "headline",
    "subheadline",
    "intro",
    "cta_label",
    "cta_url",
    "section_title",
    "section_body",
    "feature_image",
  ],
  category: "WordPress",
  tags: ["elementor", "native", "landing", "lead-gen"],
  author: "Lovable",
  downloads: 0,
  rating: 5,
  platform: "wordpress",
  kind: "elementor",
  elementorData: heroLeadElementorData,
  elementorPageTemplate: "elementor_canvas",
  defaultValues: {
    headline: "Grow your business in {city}",
    subheadline: "Trusted {service} experts",
    intro: "We help local businesses get found online and convert more customers.",
    cta_label: "Get a Free Quote",
    cta_url: "#contact",
    section_title: "Why choose us",
    section_body: "Years of experience delivering results for {service} clients across {city}.",
    feature_image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
  },
});

export const ELEMENTOR_NATIVE_TEMPLATES: MarketplaceTemplate[] = [elementorHeroLead()];
