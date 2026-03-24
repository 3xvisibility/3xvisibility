import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Type, Image, List, MousePointerClick, LayoutPanelTop, Trash2, Plus,
  Variable, Hash, Wand2, Columns, Square, Palette, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Underline, Monitor, Tablet, Smartphone, Undo2,
  Redo2, Move, Settings2, Layers, ChevronRight, Eye, EyeOff, Copy, Code,
  PaintBucket, Maximize2, Minimize2, LayoutGrid, SplitSquareVertical,
  GripVertical, ChevronDown, ImagePlus, MapPin, Youtube, BookOpen, Star,
  CloudSun, Map as MapIcon, ImageIcon,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
interface ElementorNode {
  id: string;
  type: "section" | "column" | "widget";
  widgetType?: "heading" | "text" | "image" | "button" | "list" | "html" | "spacer" | "divider" | "video" | "shortcode";
  settings: Record<string, any>;
  children?: ElementorNode[];
}

interface ElementorEditorProps {
  html: string;
  css?: string;
  onChange: (html: string) => void;
  onCssChange?: (css: string) => void;
  customVars?: string[];
  preserveOriginalStyles?: boolean;
  elementorJson?: string; // Native Elementor JSON data (_elementor_data)
}

let nodeCounter = 0;
const genNodeId = () => `el-${Date.now()}-${++nodeCounter}`;

// ── Variable categories ──────────────────────────────────
const VAR_CATEGORIES = [
  { label: "Local SEO", vars: ["city", "state", "country", "region", "county", "zip_code", "latitude", "longitude", "population", "timezone"] },
  { label: "Business", vars: ["company", "brand", "phone", "email", "address", "website", "opening_hours", "rating"] },
  { label: "Content", vars: ["keyword", "title", "name", "description", "service", "category", "price", "url", "slug"] },
  { label: "Custom", vars: ["custom_1", "custom_2", "custom_3"] },
];

// ── Dynamic shortcodes ──────────────────────────────────
const SHORTCODES = [
  { type: "MAP", label: "Google Map", icon: MapPin, color: "text-red-500", template: "{{MAP:{city}, {state}}}" },
  { type: "YOUTUBE", label: "YouTube", icon: Youtube, color: "text-red-600", template: "{{YOUTUBE:{keyword} {city}}}" },
  { type: "IMAGE", label: "Stock Photo", icon: ImageIcon, color: "text-blue-500", template: "{{IMAGE:{keyword} {city}}}" },
  { type: "AI", label: "AI Content", icon: Wand2, color: "text-purple-500", template: "{{AI:Write about {keyword} in {city}}}" },
  { type: "AI_IMAGE", label: "AI Image", icon: ImagePlus, color: "text-pink-500", template: "{{AI_IMAGE:{keyword} in {city}}}" },
  { type: "WIKIPEDIA", label: "Wikipedia", icon: BookOpen, color: "text-gray-600", template: "{{WIKIPEDIA:{keyword}}}" },
  { type: "WEATHER", label: "Weather", icon: CloudSun, color: "text-sky-500", template: "{{WEATHER:{city}}}" },
];

// ── Transforms reference ──────────────────────────────────
const TRANSFORMS = [
  { name: ":uppercase", ex: "{city:uppercase} → NEW YORK" },
  { name: ":lowercase", ex: "{city:lowercase} → new york" },
  { name: ":capitalize", ex: "{city:capitalize} → New York" },
  { name: ":slug", ex: "{title:slug} → my-page" },
  { name: ":truncate(n)", ex: "{desc:truncate(50)}" },
  { name: ":prefix(text)", ex: "{slug:prefix(/services/)}" },
  { name: ":suffix(text)", ex: "{city:suffix( Area)}" },
  { name: ":default(text)", ex: "{phone:default(N/A)}" },
];

// ── Elementor Native JSON Parser ──────────────────────────
// Converts native Elementor JSON (from WordPress _elementor_data) to our internal format
interface ElementorNativeWidget {
  id?: string;
  elType: "section" | "column" | "widget" | "container";
  widgetType?: string;
  settings?: Record<string, any>;
  elements?: ElementorNativeWidget[];
}

function parseElementorJson(jsonStr: string): ElementorNode[] {
  try {
    const data: ElementorNativeWidget[] = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
    if (!Array.isArray(data)) return [];
    return data.map(convertNativeElement).filter(Boolean) as ElementorNode[];
  } catch {
    return [];
  }
}

function convertNativeElement(el: ElementorNativeWidget): ElementorNode | null {
  if (!el || !el.elType) return null;
  const s = el.settings || {};

  if (el.elType === "section" || (el.elType === "container" && el.elements?.some(c => c.elType === "column" || c.elType === "container"))) {
    const children = (el.elements || []).map(convertNativeElement).filter(Boolean) as ElementorNode[];
    return {
      id: genNodeId(),
      type: "section",
      settings: {
        className: s.css_classes || "",
        style: buildStyleFromElementor(s, "section"),
        background_color: s.background_color || "",
      },
      children: children.length > 0 ? children : [{ id: genNodeId(), type: "column", settings: {}, children: [] }],
    };
  }

  if (el.elType === "column") {
    const children = (el.elements || []).map(convertNativeElement).filter(Boolean) as ElementorNode[];
    return {
      id: genNodeId(),
      type: "column",
      settings: {
        width: s._column_size ? `${s._column_size}%` : "100%",
        className: s.css_classes || "",
        style: buildStyleFromElementor(s, "column"),
      },
      children,
    };
  }

  // Container without columns = treat as section with single column
  if (el.elType === "container") {
    const children = (el.elements || []).map(convertNativeElement).filter(Boolean) as ElementorNode[];
    if (children.some(c => c.type === "widget")) {
      return {
        id: genNodeId(),
        type: "section",
        settings: { className: s.css_classes || "", style: buildStyleFromElementor(s, "section") },
        children: [{ id: genNodeId(), type: "column", settings: {}, children }],
      };
    }
    return {
      id: genNodeId(),
      type: "section",
      settings: { className: s.css_classes || "", style: buildStyleFromElementor(s, "section") },
      children: children.length > 0 ? children : [{ id: genNodeId(), type: "column", settings: {}, children: [] }],
    };
  }

  // Widget types
  if (el.elType === "widget") {
    return convertNativeWidget(el);
  }

  return null;
}

function convertNativeWidget(el: ElementorNativeWidget): ElementorNode {
  const s = el.settings || {};
  const id = genNodeId();
  const wt = el.widgetType || "";

  if (wt === "heading") {
    const tag = s.header_size || "h2";
    return {
      id, type: "widget", widgetType: "heading",
      settings: { text: s.title || "Heading", tag, level: parseInt(tag.replace("h", "")), className: s.css_classes || "", style: buildStyleFromElementor(s, "text") },
    };
  }
  if (wt === "text-editor") {
    return {
      id, type: "widget", widgetType: "text",
      settings: { text: s.editor || "", tag: "div", className: s.css_classes || "", style: buildStyleFromElementor(s, "text") },
    };
  }
  if (wt === "image") {
    const src = s.image?.url || "";
    return {
      id, type: "widget", widgetType: "image",
      settings: { src, alt: s.image?.alt || s.caption || "", className: s.css_classes || "", style: buildStyleFromElementor(s, "image") },
    };
  }
  if (wt === "button") {
    return {
      id, type: "widget", widgetType: "button",
      settings: { text: s.text || "Click Here", url: s.link?.url || "#", className: s.css_classes || "", style: buildStyleFromElementor(s, "button") },
    };
  }
  if (wt === "icon-list" || wt === "icon-box") {
    const items = (s.icon_list || []).map((i: any) => i.text || "");
    return {
      id, type: "widget", widgetType: "list",
      settings: { items: items.length > 0 ? items : ["Item 1"], listType: "ul", className: s.css_classes || "" },
    };
  }
  if (wt === "divider") {
    return { id, type: "widget", widgetType: "divider", settings: { className: s.css_classes || "" } };
  }
  if (wt === "spacer") {
    const h = parseInt(s.space?.size || "40");
    return { id, type: "widget", widgetType: "spacer", settings: { height: isNaN(h) ? 40 : h } };
  }
  if (wt === "video") {
    return {
      id, type: "widget", widgetType: "html",
      settings: { html: `<div class="elementor-video-wrapper">${s.youtube_url ? `<iframe src="${s.youtube_url}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;"></iframe>` : ""}</div>` },
    };
  }
  if (wt === "google_maps") {
    return {
      id, type: "widget", widgetType: "shortcode",
      settings: { shortcode: `{{MAP:${s.address || "{city}, {state}"}}}` },
    };
  }
  if (wt === "html") {
    return {
      id, type: "widget", widgetType: "html",
      settings: { html: s.html || "" },
    };
  }
  if (wt === "image-gallery" || wt === "image-carousel") {
    const images = (s.gallery || s.carousel || []).map((img: any) => `<img src="${img.url || ""}" alt="${img.alt || ""}" style="max-width:100%;" />`).join("\n");
    return {
      id, type: "widget", widgetType: "html",
      settings: { html: `<div class="elementor-gallery">${images}</div>` },
    };
  }

  // Fallback: render as HTML widget
  return {
    id, type: "widget", widgetType: "html",
    settings: { html: `<!-- Elementor widget: ${wt} --><div class="elementor-widget-${wt}">${s.title || s.text || s.editor || s.html || ""}</div>`, className: s.css_classes || "" },
  };
}

function buildStyleFromElementor(s: Record<string, any>, context: string): string {
  const parts: string[] = [];
  if (context === "text" || context === "button") {
    if (s.text_color || s.title_color) parts.push(`color:${s.text_color || s.title_color}`);
    if (s.typography_font_size?.size) parts.push(`font-size:${s.typography_font_size.size}${s.typography_font_size.unit || "px"}`);
    if (s.typography_font_weight) parts.push(`font-weight:${s.typography_font_weight}`);
    if (s.typography_font_family) parts.push(`font-family:${s.typography_font_family}`);
    if (s.align) parts.push(`text-align:${s.align}`);
  }
  if (context === "button") {
    if (s.background_color || s.button_background_color) parts.push(`background:${s.background_color || s.button_background_color}`);
    if (s.border_radius?.size) parts.push(`border-radius:${s.border_radius.size}${s.border_radius.unit || "px"}`);
    parts.push("display:inline-block", "padding:12px 24px", "text-decoration:none");
  }
  if (context === "section" || context === "column") {
    if (s.background_color) parts.push(`background-color:${s.background_color}`);
    if (s.padding?.top) parts.push(`padding:${s.padding.top}${s.padding.unit || "px"} ${s.padding.right || s.padding.top}${s.padding.unit || "px"} ${s.padding.bottom || s.padding.top}${s.padding.unit || "px"} ${s.padding.left || s.padding.right || s.padding.top}${s.padding.unit || "px"}`);
    if (s.margin?.top) parts.push(`margin:${s.margin.top}${s.margin.unit || "px"} ${s.margin.right || "0"}${s.margin.unit || "px"} ${s.margin.bottom || s.margin.top}${s.margin.unit || "px"} ${s.margin.left || "0"}${s.margin.unit || "px"}`);
  }
  return parts.join(";");
}

// ── HTML parsing helpers ──────────────────────────────────
function parseHtmlToNodes(html: string): ElementorNode[] {
  if (!html.trim()) return [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;
  
  const nodes: ElementorNode[] = [];
  
  function domToNode(el: Element): ElementorNode | null {
    const tag = el.tagName.toLowerCase();
    const style = el.getAttribute("style") || "";
    const cls = el.getAttribute("class") || "";
    
    if (/^h[1-6]$/.test(tag)) {
      return {
        id: genNodeId(), type: "widget", widgetType: "heading",
        settings: { text: el.innerHTML, tag, className: cls, style, level: parseInt(tag[1]) },
      };
    }
    if (tag === "p" || tag === "div" || tag === "span" || tag === "article" || tag === "main" || tag === "header" || tag === "footer" || tag === "nav") {
      // Check if it's a container with block children
      const blockChildren = Array.from(el.children).filter(c => {
        const t = c.tagName.toLowerCase();
        return /^(h[1-6]|p|div|section|ul|ol|img|a|table|form|blockquote|figure)$/.test(t);
      });
      
      if (blockChildren.length > 0 && ["div", "section", "article", "main", "header", "footer", "nav"].includes(tag)) {
        const children = Array.from(el.children).map(c => domToNode(c as Element)).filter(Boolean) as ElementorNode[];
        return {
          id: genNodeId(), type: "section",
          settings: { className: cls, style, tag },
          children: children.length > 0 ? [{ id: genNodeId(), type: "column", settings: {}, children }] : [],
        };
      }
      
      return {
        id: genNodeId(), type: "widget", widgetType: "text",
        settings: { text: el.innerHTML, className: cls, style, tag },
      };
    }
    if (tag === "img") {
      return {
        id: genNodeId(), type: "widget", widgetType: "image",
        settings: { src: el.getAttribute("src") || "", alt: el.getAttribute("alt") || "", className: cls, style },
      };
    }
    if (tag === "a" && (/btn|button|cta/i.test(cls) || /padding.*(?:8|10|12|16|20|24)px/i.test(style) || /display\s*:\s*inline-block/i.test(style))) {
      return {
        id: genNodeId(), type: "widget", widgetType: "button",
        settings: { text: el.innerHTML, url: el.getAttribute("href") || "#", className: cls, style },
      };
    }
    if (tag === "a") {
      return {
        id: genNodeId(), type: "widget", widgetType: "text",
        settings: { text: el.outerHTML, className: cls, style, tag: "div" },
      };
    }
    if (tag === "ul" || tag === "ol") {
      const items = Array.from(el.querySelectorAll("li")).map(li => li.innerHTML);
      return {
        id: genNodeId(), type: "widget", widgetType: "list",
        settings: { items, listType: tag, className: cls, style },
      };
    }
    if (tag === "section") {
      const children = Array.from(el.children).map(c => domToNode(c as Element)).filter(Boolean) as ElementorNode[];
      return {
        id: genNodeId(), type: "section",
        settings: { className: cls, style },
        children: children.length > 0 ? [{ id: genNodeId(), type: "column", settings: {}, children }] : [],
      };
    }
    if (tag === "hr") {
      return { id: genNodeId(), type: "widget", widgetType: "divider", settings: { className: cls, style } };
    }
    if (tag === "br") return null;
    // Fallback: raw HTML widget
    return {
      id: genNodeId(), type: "widget", widgetType: "html",
      settings: { html: el.outerHTML, className: cls, style },
    };
  }
  
  for (const child of Array.from(body.children)) {
    const node = domToNode(child as Element);
    if (node) nodes.push(node);
  }
  
  // Handle text nodes not wrapped in elements
  if (nodes.length === 0 && body.textContent?.trim()) {
    nodes.push({ id: genNodeId(), type: "widget", widgetType: "text", settings: { text: html, tag: "div" } });
  }
  
  return nodes;
}

function nodesToHtml(nodes: ElementorNode[]): string {
  return nodes.map(nodeToHtml).join("\n");
}

function nodeToHtml(node: ElementorNode): string {
  const cls = node.settings.className ? ` class="${node.settings.className}"` : "";
  const style = node.settings.style ? ` style="${node.settings.style}"` : "";
  
  if (node.type === "section") {
    const tag = node.settings.tag || "section";
    const inner = (node.children || []).map(nodeToHtml).join("\n");
    return `<${tag}${cls}${style}>\n${inner}\n</${tag}>`;
  }
  if (node.type === "column") {
    const inner = (node.children || []).map(nodeToHtml).join("\n");
    return inner;
  }
  
  switch (node.widgetType) {
    case "heading": {
      const tag = node.settings.tag || "h2";
      return `<${tag}${cls}${style}>${node.settings.text || ""}</${tag}>`;
    }
    case "text": {
      const tag = node.settings.tag || "p";
      return `<${tag}${cls}${style}>${node.settings.text || ""}</${tag}>`;
    }
    case "image":
      return `<img src="${node.settings.src || ""}" alt="${node.settings.alt || ""}"${cls}${style} />`;
    case "button":
      return `<a href="${node.settings.url || "#"}"${cls}${style}>${node.settings.text || "Click"}</a>`;
    case "list": {
      const tag = node.settings.listType || "ul";
      const items = (node.settings.items || []).map((i: string) => `  <li>${i}</li>`).join("\n");
      return `<${tag}${cls}${style}>\n${items}\n</${tag}>`;
    }
    case "divider":
      return `<hr${cls}${style} />`;
    case "spacer":
      return `<div${cls} style="height:${node.settings.height || 40}px;${node.settings.style || ""}"></div>`;
    case "html":
      return node.settings.html || "";
    case "shortcode":
      return node.settings.shortcode || "";
    default:
      return node.settings.html || node.settings.text || "";
  }
}

// ── Widget palette ──────────────────────────────────────
const WIDGET_PALETTE = [
  { type: "heading", label: "Heading", icon: Type, desc: "H1-H6 heading" },
  { type: "text", label: "Text Editor", icon: Type, desc: "Rich text content" },
  { type: "image", label: "Image", icon: Image, desc: "Photo or graphic" },
  { type: "button", label: "Button", icon: MousePointerClick, desc: "Call-to-action" },
  { type: "list", label: "List", icon: List, desc: "Bullet or numbered" },
  { type: "divider", label: "Divider", icon: Separator as any, desc: "Horizontal rule" },
  { type: "spacer", label: "Spacer", icon: Maximize2, desc: "Vertical spacing" },
  { type: "html", label: "HTML", icon: Code, desc: "Custom code" },
];

function createWidget(widgetType: string): ElementorNode {
  const id = genNodeId();
  switch (widgetType) {
    case "heading":
      return { id, type: "widget", widgetType: "heading", settings: { text: "Your Heading", tag: "h2", level: 2 } };
    case "text":
      return { id, type: "widget", widgetType: "text", settings: { text: "Enter your text here...", tag: "p" } };
    case "image":
      return { id, type: "widget", widgetType: "image", settings: { src: "{image_url}", alt: "{image_alt}" } };
    case "button":
      return { id, type: "widget", widgetType: "button", settings: { text: "Click Here", url: "{url}", style: "display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;" } };
    case "list":
      return { id, type: "widget", widgetType: "list", settings: { items: ["Item 1", "Item 2", "Item 3"], listType: "ul" } };
    case "divider":
      return { id, type: "widget", widgetType: "divider", settings: {} };
    case "spacer":
      return { id, type: "widget", widgetType: "spacer", settings: { height: 40 } };
    case "html":
      return { id, type: "widget", widgetType: "html", settings: { html: "<div>Custom HTML</div>" } };
    case "shortcode":
      return { id, type: "widget", widgetType: "shortcode", settings: { shortcode: "{{MAP:{city}}}" } };
    default:
      return { id, type: "widget", widgetType: "text", settings: { text: "New widget" } };
  }
}

function createSection(): ElementorNode {
  return {
    id: genNodeId(), type: "section", settings: {},
    children: [{ id: genNodeId(), type: "column", settings: { width: "100%" }, children: [] }],
  };
}

// ── Navigator Tree Item ──────────────────────────────────
function NavigatorItem({ node, depth, selectedId, onSelect }: { node: ElementorNode; depth: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (node.children?.length || 0) > 0;
  const label = node.type === "section" ? "Section" : node.type === "column" ? "Column" : (node.widgetType || "Widget");
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors ${
          isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren && (
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="shrink-0">
            <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        )}
        {!hasChildren && <span className="w-3" />}
        {node.type === "section" ? <LayoutPanelTop className="h-3 w-3 shrink-0" /> :
         node.type === "column" ? <Columns className="h-3 w-3 shrink-0" /> :
         <Square className="h-3 w-3 shrink-0" />}
        <span className="truncate capitalize">{label}</span>
      </button>
      {expanded && hasChildren && node.children!.map(child => (
        <NavigatorItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

// ── Style Panel ──────────────────────────────────────────
function StylePanel({ node, onChange }: { node: ElementorNode; onChange: (n: ElementorNode) => void }) {
  const s = node.settings;
  
  const updateSetting = (key: string, value: any) => {
    onChange({ ...node, settings: { ...s, [key]: value } });
  };
  
  const parseInlineStyle = (styleStr: string): Record<string, string> => {
    const result: Record<string, string> = {};
    if (!styleStr) return result;
    styleStr.split(";").forEach(pair => {
      const [k, v] = pair.split(":").map(s => s?.trim());
      if (k && v) result[k] = v;
    });
    return result;
  };
  
  const styleObj = parseInlineStyle(s.style || "");
  
  const updateStyle = (prop: string, value: string) => {
    const updated = { ...styleObj, [prop]: value };
    if (!value) delete updated[prop];
    const str = Object.entries(updated).map(([k, v]) => `${k}:${v}`).join(";");
    updateSetting("style", str);
  };

  return (
    <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
      <div className="space-y-4 p-3">
        {/* Content editing */}
        {(node.widgetType === "heading" || node.widgetType === "text") && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Content</Label>
            {node.widgetType === "heading" && (
              <div className="flex gap-1 mb-2">
                {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { updateSetting("tag", t); updateSetting("level", parseInt(t[1])); }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${
                      s.tag === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={s.text || ""}
              onChange={(e) => updateSetting("text", e.target.value)}
              rows={node.widgetType === "heading" ? 2 : 4}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none font-mono"
              placeholder="Use {variable} syntax for dynamic content..."
            />
            <p className="text-[9px] text-muted-foreground">Right-click or type {"{variable}"} to insert dynamic placeholders</p>
          </div>
        )}
        
        {node.widgetType === "image" && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Image</Label>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">URL</Label>
              <Input value={s.src || ""} onChange={(e) => updateSetting("src", e.target.value)} placeholder="{image_url}" className="text-xs h-8 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Alt Text</Label>
              <Input value={s.alt || ""} onChange={(e) => updateSetting("alt", e.target.value)} placeholder="{image_alt}" className="text-xs h-8" />
            </div>
          </div>
        )}
        
        {node.widgetType === "button" && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Button</Label>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Text</Label>
              <Input value={s.text || ""} onChange={(e) => updateSetting("text", e.target.value)} className="text-xs h-8" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Link</Label>
              <Input value={s.url || ""} onChange={(e) => updateSetting("url", e.target.value)} placeholder="{url}" className="text-xs h-8 font-mono" />
            </div>
          </div>
        )}
        
        {node.widgetType === "list" && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">List Items</Label>
            <div className="flex gap-1 mb-1">
              {(["ul", "ol"] as const).map(t => (
                <button key={t} onClick={() => updateSetting("listType", t)}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md ${s.listType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >{t === "ul" ? "Bullets" : "Numbers"}</button>
              ))}
            </div>
            {(s.items || []).map((item: string, i: number) => (
              <div key={i} className="flex gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground w-4 text-right">{i + 1}.</span>
                <Input value={item} onChange={(e) => {
                  const items = [...(s.items || [])];
                  items[i] = e.target.value;
                  updateSetting("items", items);
                }} className="text-xs h-7 flex-1" />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                  onClick={() => updateSetting("items", (s.items || []).filter((_: any, j: number) => j !== i))}>
                  <Trash2 className="h-2.5 w-2.5 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="text-[10px] h-6"
              onClick={() => updateSetting("items", [...(s.items || []), "New item"])}>
              <Plus className="h-2.5 w-2.5 mr-1" /> Add
            </Button>
          </div>
        )}
        
        {node.widgetType === "html" && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">HTML Code</Label>
            <textarea value={s.html || ""} onChange={(e) => updateSetting("html", e.target.value)}
              rows={6} className="w-full text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none" />
          </div>
        )}

        {node.widgetType === "shortcode" && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Shortcode</Label>
            <textarea value={s.shortcode || ""} onChange={(e) => updateSetting("shortcode", e.target.value)}
              rows={3} className="w-full text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 resize-none" />
          </div>
        )}
        
        {node.widgetType === "spacer" && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Height (px)</Label>
            <div className="flex items-center gap-3">
              <Slider value={[s.height || 40]} min={10} max={200} step={5}
                onValueChange={([v]) => updateSetting("height", v)} className="flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right">{s.height || 40}</span>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Typography */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Type className="h-3 w-3" /> Typography
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground">Font Size</Label>
              <Input value={styleObj["font-size"] || ""} onChange={(e) => updateStyle("font-size", e.target.value)}
                placeholder="16px" className="text-xs h-7" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground">Font Weight</Label>
              <Select value={styleObj["font-weight"] || ""} onValueChange={(v) => updateStyle("font-weight", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Normal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light</SelectItem>
                  <SelectItem value="400">Normal</SelectItem>
                  <SelectItem value="500">Medium</SelectItem>
                  <SelectItem value="600">Semi Bold</SelectItem>
                  <SelectItem value="700">Bold</SelectItem>
                  <SelectItem value="800">Extra Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] text-muted-foreground">Line Height</Label>
            <Input value={styleObj["line-height"] || ""} onChange={(e) => updateStyle("line-height", e.target.value)}
              placeholder="1.5" className="text-xs h-7" />
          </div>
          <div className="flex gap-1">
            {[
              { prop: "text-align", val: "left", icon: AlignLeft },
              { prop: "text-align", val: "center", icon: AlignCenter },
              { prop: "text-align", val: "right", icon: AlignRight },
            ].map(({ prop, val, icon: Icon }) => (
              <button key={val} onClick={() => updateStyle(prop, val)}
                className={`p-1.5 rounded-md transition-colors ${styleObj[prop] === val ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Colors */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Palette className="h-3 w-3" /> Colors
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground">Text Color</Label>
              <div className="flex items-center gap-1.5">
                <input type="color" value={styleObj.color || "#000000"} onChange={(e) => updateStyle("color", e.target.value)}
                  className="h-7 w-7 rounded-md border border-border cursor-pointer" />
                <Input value={styleObj.color || ""} onChange={(e) => updateStyle("color", e.target.value)}
                  placeholder="#000" className="text-xs h-7 flex-1 font-mono" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground">Background</Label>
              <div className="flex items-center gap-1.5">
                <input type="color" value={styleObj["background-color"] || styleObj.background?.replace(/[^#a-fA-F0-9]/g, "").slice(0, 7) || "#ffffff"} 
                  onChange={(e) => updateStyle("background-color", e.target.value)}
                  className="h-7 w-7 rounded-md border border-border cursor-pointer" />
                <Input value={styleObj["background-color"] || styleObj.background || ""} 
                  onChange={(e) => updateStyle("background-color", e.target.value)}
                  placeholder="#fff" className="text-xs h-7 flex-1 font-mono" />
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Spacing */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Maximize2 className="h-3 w-3" /> Spacing
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {["padding", "margin"].map(prop => (
              <div key={prop} className="space-y-1">
                <Label className="text-[9px] text-muted-foreground capitalize">{prop}</Label>
                <Input value={styleObj[prop] || ""} onChange={(e) => updateStyle(prop, e.target.value)}
                  placeholder="10px 20px" className="text-xs h-7 font-mono" />
              </div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Border */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Border</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground">Border</Label>
              <Input value={styleObj.border || ""} onChange={(e) => updateStyle("border", e.target.value)}
                placeholder="1px solid #ddd" className="text-xs h-7 font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground">Radius</Label>
              <Input value={styleObj["border-radius"] || ""} onChange={(e) => updateStyle("border-radius", e.target.value)}
                placeholder="8px" className="text-xs h-7 font-mono" />
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* CSS Class */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CSS Class</Label>
          <Input value={s.className || ""} onChange={(e) => updateSetting("className", e.target.value)}
            placeholder="my-custom-class" className="text-xs h-7 font-mono" />
        </div>
      </div>
    </ScrollArea>
  );
}

// ── Preview iframe ──────────────────────────────────────
function LivePreview({ html, css, selectedId, onSelect, previewWidth }: { 
  html: string; css?: string; selectedId: string | null; onSelect: (id: string | null) => void; previewWidth: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const fullHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a2e; }
img { max-width: 100%; height: auto; }
.el-selected { outline: 2px solid #6366f1 !important; outline-offset: 2px; position: relative; }
.el-hover { outline: 1px dashed #a5b4fc !important; outline-offset: 1px; cursor: pointer; }
[data-el-id] { transition: outline 0.15s ease; }
${css || ""}
</style>
</head>
<body>
${html}
<script>
document.addEventListener('click', function(e) {
  e.preventDefault();
  e.stopPropagation();
  const el = e.target.closest('[data-el-id]');
  if (el) {
    window.parent.postMessage({ type: 'el-select', id: el.dataset.elId }, '*');
  } else {
    window.parent.postMessage({ type: 'el-select', id: null }, '*');
  }
}, true);
document.addEventListener('mouseover', function(e) {
  document.querySelectorAll('.el-hover').forEach(el => el.classList.remove('el-hover'));
  const el = e.target.closest('[data-el-id]');
  if (el && !el.classList.contains('el-selected')) el.classList.add('el-hover');
});
document.addEventListener('mouseout', function(e) {
  const el = e.target.closest('[data-el-id]');
  if (el) el.classList.remove('el-hover');
});
window.addEventListener('message', function(e) {
  if (e.data?.type === 'el-highlight') {
    document.querySelectorAll('.el-selected').forEach(el => el.classList.remove('el-selected'));
    if (e.data.id) {
      const target = document.querySelector('[data-el-id="' + e.data.id + '"]');
      if (target) { target.classList.add('el-selected'); target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }
  }
});
</script>
</body>
</html>`;
  }, [html, css]);
  
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = fullHtml;
    }
  }, [fullHtml]);
  
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "el-highlight", id: selectedId }, "*");
  }, [selectedId]);
  
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "el-select") onSelect(e.data.id);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSelect]);

  return (
    <div className="flex-1 bg-muted/30 rounded-xl border border-border overflow-hidden flex items-start justify-center p-4">
      <div className={`transition-all duration-300 bg-background rounded-lg shadow-lg border border-border overflow-hidden ${
        previewWidth === "mobile" ? "w-[375px]" : previewWidth === "tablet" ? "w-[768px]" : "w-full"
      }`}>
        <iframe
          ref={iframeRef}
          className="w-full border-0"
          style={{ minHeight: 500, height: "70vh" }}
          sandbox="allow-scripts"
          title="Live Preview"
        />
      </div>
    </div>
  );
}

// ── Add data-el-id attributes to HTML for selection ──────
function addElIds(nodes: ElementorNode[], html: string): string {
  // We add data-el-id to top-level tags to make them selectable in the iframe
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");
  
  function tagNodes(elements: NodeListOf<ChildNode> | HTMLCollection, nodeList: ElementorNode[]) {
    let nodeIdx = 0;
    for (const el of Array.from(elements)) {
      if (el.nodeType !== 1) continue; // skip text nodes
      if (nodeIdx < nodeList.length) {
        const node = nodeList[nodeIdx];
        (el as Element).setAttribute("data-el-id", node.id);
        if (node.type === "section" && node.children) {
          // Tag children recursively
          for (const col of node.children) {
            if (col.children) {
              tagNodes((el as Element).children, col.children);
            }
          }
        }
        nodeIdx++;
      }
    }
  }
  
  tagNodes(doc.body.children, nodes);
  return doc.body.innerHTML;
}

// ── Main Editor Component ──────────────────────────────
export function ElementorEditor({ html, css, onChange, onCssChange, customVars = [], preserveOriginalStyles, elementorJson }: ElementorEditorProps) {
  // Extract embedded styles from HTML (<!-- STYLES --> blocks)
  const extractedStyles = useMemo(() => {
    const styleMatch = html.match(/<!-- STYLES -->\n?([\s\S]*?)\n?<!-- \/STYLES -->/);
    return styleMatch ? styleMatch[1] : "";
  }, []);
  
  const cleanHtml = useMemo(() => {
    return html.replace(/<!-- STYLES -->\n?[\s\S]*?\n?<!-- \/STYLES -->\n?/, "").trim();
  }, []);
  
  // Use Elementor JSON if provided, otherwise parse HTML
  const [nodes, setNodes] = useState<ElementorNode[]>(() => {
    if (elementorJson) {
      const parsed = parseElementorJson(elementorJson);
      if (parsed.length > 0) return parsed;
    }
    return parseHtmlToNodes(cleanHtml);
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"widgets" | "variables" | "navigator" | "dynamic">("widgets");
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [history, setHistory] = useState<ElementorNode[][]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [customCss, setCustomCss] = useState(css || extractedStyles);
  
  // Find selected node
  const findNode = useCallback((nodeList: ElementorNode[], id: string): ElementorNode | null => {
    for (const n of nodeList) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNode(n.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);
  
  const selectedNode = selectedId ? findNode(nodes, selectedId) : null;
  
  // Update node in tree
  const updateNode = useCallback((nodeList: ElementorNode[], id: string, updated: ElementorNode): ElementorNode[] => {
    return nodeList.map(n => {
      if (n.id === id) return updated;
      if (n.children) return { ...n, children: updateNode(n.children, id, updated) };
      return n;
    });
  }, []);
  
  // Delete node from tree
  const deleteNode = useCallback((nodeList: ElementorNode[], id: string): ElementorNode[] => {
    return nodeList.filter(n => {
      if (n.id === id) return false;
      if (n.children) n.children = deleteNode(n.children, id);
      return true;
    });
  }, []);
  
  // Push to history
  const pushHistory = useCallback((newNodes: ElementorNode[]) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), newNodes].slice(-30));
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);
  
  // Sync nodes → html
  const syncToHtml = useCallback((newNodes: ElementorNode[]) => {
    setNodes(newNodes);
    pushHistory(newNodes);
    const rawHtml = nodesToHtml(newNodes);
    // Re-wrap with styles block if present
    const output = customCss
      ? `<!-- STYLES -->\n${customCss}\n<!-- /STYLES -->\n${rawHtml}`
      : rawHtml;
    onChange(output);
  }, [onChange, pushHistory, customCss]);
  
  // Generate preview HTML with data-el-id attributes
  const previewHtml = useMemo(() => {
    const rawHtml = nodesToHtml(nodes);
    return addElIds(nodes, rawHtml);
  }, [nodes]);
  
  const handleSelectNode = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);
  
  const handleUpdateNode = useCallback((updated: ElementorNode) => {
    const newNodes = updateNode(nodes, updated.id, updated);
    syncToHtml(newNodes);
  }, [nodes, updateNode, syncToHtml]);
  
  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const newNodes = deleteNode([...nodes], selectedId);
    setSelectedId(null);
    syncToHtml(newNodes);
  }, [selectedId, nodes, deleteNode, syncToHtml]);
  
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedNode) return;
    const cloneNode = (n: ElementorNode): ElementorNode => ({
      ...n, id: genNodeId(), children: n.children?.map(cloneNode),
      settings: { ...n.settings, items: n.settings.items ? [...n.settings.items] : undefined },
    });
    const clone = cloneNode(selectedNode);
    // Add after selected in parent
    const addAfter = (list: ElementorNode[], id: string, newNode: ElementorNode): ElementorNode[] => {
      const result: ElementorNode[] = [];
      for (const n of list) {
        result.push(n);
        if (n.id === id) result.push(newNode);
        if (n.children) {
          const updated = addAfter(n.children, id, newNode);
          if (updated !== n.children) result[result.length - (n.id === id ? 2 : 1)] = { ...n, children: updated };
        }
      }
      return result;
    };
    syncToHtml(addAfter(nodes, selectedId!, clone));
  }, [selectedNode, selectedId, nodes, syncToHtml]);
  
  const handleAddWidget = useCallback((widgetType: string) => {
    const widget = createWidget(widgetType);
    // If a section or column is selected, add inside it
    if (selectedNode && (selectedNode.type === "section" || selectedNode.type === "column")) {
      const target = selectedNode.type === "section" ? selectedNode.children?.[0] || selectedNode : selectedNode;
      const updated = { ...target, children: [...(target.children || []), widget] };
      syncToHtml(updateNode(nodes, target.id, updated));
    } else {
      // Wrap in a section
      const section = createSection();
      section.children![0].children = [widget];
      syncToHtml([...nodes, section]);
    }
    setSelectedId(widget.id);
  }, [selectedNode, nodes, updateNode, syncToHtml]);
  
  const handleAddSection = useCallback(() => {
    const section = createSection();
    syncToHtml([...nodes, section]);
    setSelectedId(section.id);
  }, [nodes, syncToHtml]);
  
  const handleAddShortcode = useCallback((sc: typeof SHORTCODES[number]) => {
    const widget = createWidget("shortcode");
    widget.settings.shortcode = sc.template;
    const section = createSection();
    section.children![0].children = [widget];
    syncToHtml([...nodes, section]);
    setSelectedId(widget.id);
  }, [nodes, syncToHtml]);
  
  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      const prev = history[historyIdx - 1];
      setNodes(prev);
      onChange(nodesToHtml(prev));
    }
  }, [historyIdx, history, onChange]);
  
  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      const next = history[historyIdx + 1];
      setNodes(next);
      onChange(nodesToHtml(next));
    }
  }, [historyIdx, history, onChange]);
  
  // Detect all variables
  const detectedVars = useMemo(() => {
    const vars = new Set<string>();
    const scan = (nList: ElementorNode[]) => {
      for (const n of nList) {
        const text = [n.settings.text, n.settings.src, n.settings.alt, n.settings.url, n.settings.html, n.settings.shortcode, ...(n.settings.items || [])].filter(Boolean).join(" ");
        const matches = text.match(/\{([a-z_][a-z0-9_]*)\}/gi);
        if (matches) matches.forEach(m => vars.add(m.replace(/[{}]/g, "")));
        if (n.children) scan(n.children);
      }
    };
    scan(nodes);
    return vars;
  }, [nodes]);

  return (
    <div className="flex flex-col h-[calc(100dvh-200px)] min-h-[500px] sm:h-[75vh] border border-border rounded-xl overflow-hidden bg-background">
      {/* Top Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={historyIdx <= 0}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={historyIdx >= history.length - 1}>
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="h-5" />
        
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={handleAddSection}>
          <Plus className="h-3 w-3" /> Section
        </Button>
        
        {selectedNode && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {selectedNode.widgetType || selectedNode.type}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDuplicateSelected}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteSelected}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
        
        <div className="flex-1" />
        
        {/* Responsive toggles */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {([
            { key: "desktop" as const, icon: Monitor },
            { key: "tablet" as const, icon: Tablet },
            { key: "mobile" as const, icon: Smartphone },
          ]).map(({ key, icon: Icon }) => (
            <button key={key} onClick={() => setPreviewWidth(key)}
              className={`p-1.5 rounded-md transition-colors ${previewWidth === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        
        {/* Variable count */}
        {detectedVars.size > 0 && (
          <Badge variant="outline" className="text-[10px]">
            <Variable className="h-3 w-3 mr-1" /> {detectedVars.size} vars
          </Badge>
        )}
      </div>
      
      {/* Main Area: Sidebar + Preview + Properties */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar: Widgets/Variables/Navigator */}
        <div className="w-56 border-r border-border bg-card shrink-0 flex flex-col">
          <div className="flex bg-muted/30 border-b border-border p-1 gap-0.5">
            {([
              { key: "widgets" as const, label: "Widgets", icon: LayoutGrid },
              { key: "variables" as const, label: "Terms", icon: Variable },
              { key: "dynamic" as const, label: "Dynamic", icon: Wand2 },
              { key: "navigator" as const, label: "Layers", icon: Layers },
            ]).map(({ key, label, icon: Icon }) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button onClick={() => setSidebarTab(key)}
                    className={`flex-1 flex items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-medium rounded-md transition-colors ${
                      sidebarTab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    <Icon className="h-3 w-3" />
                    <span className="hidden xl:inline">{label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          
          <ScrollArea className="flex-1">
            {sidebarTab === "widgets" && (
              <div className="p-2 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">Layout</p>
                <button onClick={handleAddSection}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <SplitSquareVertical className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">Section</p>
                    <p className="text-[10px] text-muted-foreground">Full-width container</p>
                  </div>
                </button>
                
                <Separator className="my-2" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">Widgets</p>
                {WIDGET_PALETTE.map(wp => (
                  <button key={wp.type} onClick={() => handleAddWidget(wp.type)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors group">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                      <wp.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{wp.label}</p>
                      <p className="text-[10px] text-muted-foreground">{wp.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {sidebarTab === "variables" && (
              <div className="p-2 space-y-3">
                <p className="text-[10px] text-muted-foreground px-1">Click to copy variable to clipboard</p>
                {VAR_CATEGORIES.map(cat => (
                  <div key={cat.label} className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{cat.label}</p>
                    <div className="flex flex-wrap gap-1 px-1">
                      {cat.vars.map(v => (
                        <button key={v} onClick={() => navigator.clipboard.writeText(`{${v}}`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                          <Hash className="h-2.5 w-2.5" /> {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {customVars.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">From CSV</p>
                    <div className="flex flex-wrap gap-1 px-1">
                      {customVars.map(v => (
                        <button key={v} onClick={() => navigator.clipboard.writeText(`{${v}}`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-md bg-accent text-accent-foreground border border-border hover:bg-accent/80 transition-colors">
                          <Hash className="h-2.5 w-2.5" /> {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <Separator />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Transforms</p>
                {TRANSFORMS.map(t => (
                  <div key={t.name} className="px-2 py-1 rounded-lg bg-muted/30">
                    <p className="text-[10px] font-mono font-medium">{t.name}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{t.ex}</p>
                  </div>
                ))}
              </div>
            )}
            
            {sidebarTab === "dynamic" && (
              <div className="p-2 space-y-1">
                <p className="text-[10px] text-muted-foreground px-1 mb-1">Add dynamic content blocks</p>
                {SHORTCODES.map(sc => (
                  <button key={sc.type} onClick={() => handleAddShortcode(sc)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-accent transition-colors">
                    <sc.icon className={`h-4 w-4 ${sc.color} shrink-0`} />
                    <div>
                      <p className="text-xs font-medium">{sc.label}</p>
                      <p className="text-[9px] text-muted-foreground font-mono truncate">{sc.template}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {sidebarTab === "navigator" && (
              <div className="p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Element Tree</p>
                {nodes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground px-1">No elements yet. Add a section to start.</p>
                ) : (
                  nodes.map(n => (
                    <NavigatorItem key={n.id} node={n} depth={0} selectedId={selectedId} onSelect={setSelectedId} />
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Center: Live Preview */}
        <LivePreview html={previewHtml} css={customCss} selectedId={selectedId} onSelect={handleSelectNode} previewWidth={previewWidth} />
        
        {/* Right: Properties Panel */}
        <div className="w-64 border-l border-border bg-card shrink-0 flex flex-col">
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedNode ? (selectedNode.widgetType || selectedNode.type) : "Properties"}
            </span>
          </div>
          
          {selectedNode ? (
            <Tabs defaultValue="content" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 m-2 h-8">
                <TabsTrigger value="content" className="text-[10px]">Content</TabsTrigger>
                <TabsTrigger value="style" className="text-[10px]">Style</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="flex-1 m-0">
                <StylePanel node={selectedNode} onChange={handleUpdateNode} />
              </TabsContent>
              <TabsContent value="style" className="flex-1 m-0">
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[200px]">
                  <div className="p-3 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Custom CSS</Label>
                      <textarea value={customCss} onChange={(e) => { setCustomCss(e.target.value); onCssChange?.(e.target.value); }}
                        rows={10} className="w-full text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                        placeholder=".my-class { color: red; }" />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <MousePointerClick className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Select an element</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Click any element in the preview to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { parseHtmlToNodes, nodesToHtml, type ElementorNode };
