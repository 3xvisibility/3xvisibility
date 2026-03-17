import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Type,
  Image,
  List,
  MousePointerClick,
  LayoutPanelTop,
  GripVertical,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Variable,
  Copy,
} from "lucide-react";

// ── Block Types ──────────────────────────────────────────────

export interface TemplateBlock {
  id: string;
  type: "text" | "image" | "list" | "button" | "section";
  content: string;
  // type-specific
  tag?: "h1" | "h2" | "h3" | "p"; // for text blocks
  src?: string; // for image
  alt?: string;
  items?: string[]; // for list
  listStyle?: "ul" | "ol";
  buttonText?: string;
  buttonUrl?: string;
  children?: TemplateBlock[]; // for section
  cssClass?: string;
}

let blockCounter = 0;
const genId = () => `block-${Date.now()}-${++blockCounter}`;

const COMMON_VARIABLES = [
  "city", "country", "region", "keyword", "company",
  "title", "name", "description", "address", "phone",
  "email", "price", "url", "slug", "postcode",
  "service", "category", "brand", "rating", "date",
];

// ── Block → HTML serializer ─────────────────────────────────

export function blocksToHtml(blocks: TemplateBlock[]): string {
  return blocks.map(blockToHtml).join("\n");
}

function blockToHtml(block: TemplateBlock): string {
  switch (block.type) {
    case "text": {
      const tag = block.tag || "p";
      const cls = block.cssClass ? ` class="${block.cssClass}"` : "";
      return `<${tag}${cls}>${block.content}</${tag}>`;
    }
    case "image": {
      const alt = block.alt || "";
      const cls = block.cssClass ? ` class="${block.cssClass}"` : "";
      return `<img src="${block.src || block.content}" alt="${alt}"${cls} style="max-width:100%;height:auto;" />`;
    }
    case "list": {
      const tag = block.listStyle || "ul";
      const items = (block.items || []).map((item) => `  <li>${item}</li>`).join("\n");
      const cls = block.cssClass ? ` class="${block.cssClass}"` : "";
      return `<${tag}${cls}>\n${items}\n</${tag}>`;
    }
    case "button": {
      const cls = block.cssClass ? ` class="${block.cssClass}"` : "";
      return `<a href="${block.buttonUrl || "#"}"${cls} style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${block.buttonText || block.content}</a>`;
    }
    case "section": {
      const cls = block.cssClass ? ` class="${block.cssClass}"` : "";
      const inner = (block.children || []).map(blockToHtml).join("\n");
      return `<section${cls}>\n${inner}\n</section>`;
    }
    default:
      return `<div>${block.content}</div>`;
  }
}

// ── HTML → Blocks parser (basic) ────────────────────────────

export function htmlToBlocks(html: string): TemplateBlock[] {
  if (!html.trim()) return [];
  // Simple regex-based parser for common patterns
  const blocks: TemplateBlock[] = [];
  const tagRegex = /<(h[1-3]|p|ul|ol|section|img|a)([^>]*)>([\s\S]*?)<\/\1>|<img([^>]*?)\/?\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = (match[1] || "img").toLowerCase();
    const attrs = match[2] || match[4] || "";
    const inner = match[3] || "";

    if (tag === "img") {
      const srcMatch = attrs.match(/src="([^"]*)"/);
      const altMatch = attrs.match(/alt="([^"]*)"/);
      blocks.push({
        id: genId(),
        type: "image",
        content: srcMatch?.[1] || "",
        src: srcMatch?.[1] || "",
        alt: altMatch?.[1] || "",
      });
    } else if (tag === "ul" || tag === "ol") {
      const items: string[] = [];
      const liRegex = /<li>([\s\S]*?)<\/li>/gi;
      let li: RegExpExecArray | null;
      while ((li = liRegex.exec(inner)) !== null) {
        items.push(li[1].trim());
      }
      blocks.push({
        id: genId(),
        type: "list",
        content: "",
        items,
        listStyle: tag as "ul" | "ol",
      });
    } else if (tag === "a" && /padding|button|btn/i.test(attrs)) {
      const hrefMatch = attrs.match(/href="([^"]*)"/);
      blocks.push({
        id: genId(),
        type: "button",
        content: inner.trim(),
        buttonText: inner.trim(),
        buttonUrl: hrefMatch?.[1] || "#",
      });
    } else if (tag === "section") {
      blocks.push({
        id: genId(),
        type: "section",
        content: "",
        children: htmlToBlocks(inner),
      });
    } else if (/^h[1-3]$/.test(tag)) {
      blocks.push({
        id: genId(),
        type: "text",
        content: inner.trim(),
        tag: tag as "h1" | "h2" | "h3",
      });
    } else {
      blocks.push({
        id: genId(),
        type: "text",
        content: inner.trim(),
        tag: "p",
      });
    }
  }

  // If no blocks parsed, treat entire HTML as a single text block
  if (blocks.length === 0 && html.trim()) {
    blocks.push({ id: genId(), type: "text", content: html.trim(), tag: "p" });
  }

  return blocks;
}

// ── Default block factories ─────────────────────────────────

function createBlock(type: TemplateBlock["type"]): TemplateBlock {
  switch (type) {
    case "text":
      return { id: genId(), type: "text", content: "Your text here", tag: "p" };
    case "image":
      return { id: genId(), type: "image", content: "", src: "{image_url}", alt: "{image_alt}" };
    case "list":
      return { id: genId(), type: "list", content: "", items: ["Item 1", "Item 2", "Item 3"], listStyle: "ul" };
    case "button":
      return { id: genId(), type: "button", content: "Click here", buttonText: "Click here", buttonUrl: "{url}" };
    case "section":
      return { id: genId(), type: "section", content: "", children: [
        { id: genId(), type: "text", content: "Section Title", tag: "h2" },
        { id: genId(), type: "text", content: "Section content goes here.", tag: "p" },
      ]};
  }
}

// ── Block palette items ─────────────────────────────────────

const BLOCK_PALETTE = [
  { type: "text" as const, label: "Text", icon: Type, desc: "Heading or paragraph" },
  { type: "image" as const, label: "Image", icon: Image, desc: "Dynamic image" },
  { type: "list" as const, label: "List", icon: List, desc: "Ordered or unordered" },
  { type: "button" as const, label: "Button", icon: MousePointerClick, desc: "Call-to-action link" },
  { type: "section" as const, label: "Section", icon: LayoutPanelTop, desc: "Container with blocks" },
];

// ── Variable Context Menu ───────────────────────────────────

interface VarMenuProps {
  x: number;
  y: number;
  onInsert: (variable: string) => void;
  onClose: () => void;
  customVars?: string[];
}

function VariableContextMenu({ x, y, onInsert, onClose, customVars = [] }: VarMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  const allVars = [...new Set([...customVars, ...COMMON_VARIABLES])];
  const filtered = search
    ? allVars.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : allVars;

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-popover border border-border rounded-xl shadow-xl p-2 w-56 animate-in fade-in-0 zoom-in-95"
      style={{ left: Math.min(x, window.innerWidth - 240), top: Math.min(y, window.innerHeight - 320) }}
    >
      <div className="flex items-center gap-1.5 px-2 pb-1.5 mb-1 border-b border-border">
        <Variable className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground">Insert Variable</span>
      </div>
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
        className="w-full text-xs px-2 py-1.5 mb-1 rounded-md bg-muted/50 border-0 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
      />
      <ScrollArea className="max-h-48">
        <div className="space-y-0.5">
          {filtered.map((v) => (
            <button
              key={v}
              onClick={() => { onInsert(v); onClose(); }}
              className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors font-mono"
            >
              {`{${v}}`}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No variables found</p>
          )}
        </div>
      </ScrollArea>
      <Separator className="my-1.5" />
      <div className="px-1">
        <button
          onClick={() => {
            const custom = search.trim().replace(/[{}]/g, "");
            if (custom) { onInsert(custom); onClose(); }
          }}
          className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Plus className="h-3 w-3 inline mr-1.5" />
          {search.trim() ? `Insert {${search.trim().replace(/[{}]/g, "")}}` : "Type to create custom"}
        </button>
      </div>
    </div>
  );
}

// ── Single Block Editor ─────────────────────────────────────

interface BlockEditorProps {
  block: TemplateBlock;
  onChange: (updated: TemplateBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps?: any;
  customVars?: string[];
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  isFirst,
  isLast,
  customVars = [],
}: BlockEditorProps) {
  const [varMenu, setVarMenu] = useState<{ x: number; y: number; field: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, field: string) => {
    e.preventDefault();
    setVarMenu({ x: e.clientX, y: e.clientY, field });
  }, []);

  const insertVariable = useCallback((variable: string) => {
    const tag = `{${variable}}`;
    if (!varMenu) return;

    if (varMenu.field === "content") {
      const el = inputRef.current;
      if (el) {
        const start = el.selectionStart || 0;
        const end = el.selectionEnd || 0;
        const val = block.content;
        onChange({ ...block, content: val.slice(0, start) + tag + val.slice(end) });
      } else {
        onChange({ ...block, content: block.content + tag });
      }
    } else if (varMenu.field === "src") {
      onChange({ ...block, src: tag });
    } else if (varMenu.field === "alt") {
      onChange({ ...block, alt: tag });
    } else if (varMenu.field === "buttonText") {
      onChange({ ...block, buttonText: (block.buttonText || "") + tag });
    } else if (varMenu.field === "buttonUrl") {
      onChange({ ...block, buttonUrl: tag });
    } else if (varMenu.field.startsWith("item-")) {
      const idx = parseInt(varMenu.field.split("-")[1]);
      const items = [...(block.items || [])];
      items[idx] = (items[idx] || "") + tag;
      onChange({ ...block, items });
    }
  }, [varMenu, block, onChange]);

  const blockIcon = BLOCK_PALETTE.find((b) => b.type === block.type);
  const IconComp = blockIcon?.icon || Type;

  return (
    <div className="group relative rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-all duration-150">
      {/* Block Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20 rounded-t-xl">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab shrink-0" />
        <IconComp className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          {block.type}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}>
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDuplicate}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Block Content */}
      <div className="p-3 space-y-2.5">
        {block.type === "text" && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground w-10 shrink-0">Tag</Label>
              <div className="flex gap-1">
                {(["h1", "h2", "h3", "p"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => onChange({ ...block, tag: t })}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                      block.tag === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={block.content}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              onContextMenu={(e) => handleContextMenu(e, "content")}
              rows={2}
              className="w-full text-sm bg-background border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              placeholder="Right-click to insert variables..."
            />
          </>
        )}

        {block.type === "image" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Image URL</Label>
              <Input
                value={block.src || ""}
                onChange={(e) => onChange({ ...block, src: e.target.value })}
                onContextMenu={(e) => handleContextMenu(e, "src")}
                placeholder="{image_url} or https://..."
                className="text-sm h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Alt Text</Label>
              <Input
                value={block.alt || ""}
                onChange={(e) => onChange({ ...block, alt: e.target.value })}
                onContextMenu={(e) => handleContextMenu(e, "alt")}
                placeholder="{image_alt} or Description..."
                className="text-sm h-9"
              />
            </div>
          </>
        )}

        {block.type === "list" && (
          <>
            <div className="flex items-center gap-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground w-10 shrink-0">Style</Label>
              <div className="flex gap-1">
                {(["ul", "ol"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onChange({ ...block, listStyle: s })}
                    className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                      (block.listStyle || "ul") === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {s === "ul" ? "Bullets" : "Numbers"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {(block.items || []).map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground w-5 text-right tabular-nums shrink-0">{i + 1}.</span>
                  <Input
                    value={item}
                    onChange={(e) => {
                      const items = [...(block.items || [])];
                      items[i] = e.target.value;
                      onChange({ ...block, items });
                    }}
                    onContextMenu={(e) => handleContextMenu(e, `item-${i}`)}
                    className="text-sm h-8 flex-1"
                    placeholder="Right-click to insert variable..."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      const items = (block.items || []).filter((_, j) => j !== i);
                      onChange({ ...block, items });
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => onChange({ ...block, items: [...(block.items || []), "New item"] })}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
          </>
        )}

        {block.type === "button" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Button Text</Label>
              <Input
                value={block.buttonText || ""}
                onChange={(e) => onChange({ ...block, buttonText: e.target.value, content: e.target.value })}
                onContextMenu={(e) => handleContextMenu(e, "buttonText")}
                placeholder="Click here"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Link URL</Label>
              <Input
                value={block.buttonUrl || ""}
                onChange={(e) => onChange({ ...block, buttonUrl: e.target.value })}
                onContextMenu={(e) => handleContextMenu(e, "buttonUrl")}
                placeholder="{url} or https://..."
                className="text-sm h-9 font-mono"
              />
            </div>
          </>
        )}

        {block.type === "section" && (
          <div className="space-y-2 pl-3 border-l-2 border-primary/20">
            <p className="text-[10px] text-muted-foreground">Nested blocks inside this section:</p>
            {(block.children || []).map((child, i) => (
              <BlockEditor
                key={child.id}
                block={child}
                onChange={(updated) => {
                  const children = [...(block.children || [])];
                  children[i] = updated;
                  onChange({ ...block, children });
                }}
                onDelete={() => {
                  const children = (block.children || []).filter((_, j) => j !== i);
                  onChange({ ...block, children });
                }}
                onMoveUp={() => {
                  if (i === 0) return;
                  const children = [...(block.children || [])];
                  [children[i - 1], children[i]] = [children[i], children[i - 1]];
                  onChange({ ...block, children });
                }}
                onMoveDown={() => {
                  const children = [...(block.children || [])];
                  if (i >= children.length - 1) return;
                  [children[i], children[i + 1]] = [children[i + 1], children[i]];
                  onChange({ ...block, children });
                }}
                onDuplicate={() => {
                  const children = [...(block.children || [])];
                  children.splice(i + 1, 0, { ...child, id: genId() });
                  onChange({ ...block, children });
                }}
                isFirst={i === 0}
                isLast={i === (block.children || []).length - 1}
                customVars={customVars}
              />
            ))}
            <div className="flex gap-1.5 flex-wrap pt-1">
              {BLOCK_PALETTE.filter((b) => b.type !== "section").map((bp) => (
                <Button
                  key={bp.type}
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-6 gap-1 px-2"
                  onClick={() => {
                    const children = [...(block.children || []), createBlock(bp.type)];
                    onChange({ ...block, children });
                  }}
                >
                  <bp.icon className="h-3 w-3" /> {bp.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variable Context Menu */}
      {varMenu && (
        <VariableContextMenu
          x={varMenu.x}
          y={varMenu.y}
          onInsert={insertVariable}
          onClose={() => setVarMenu(null)}
          customVars={customVars}
        />
      )}
    </div>
  );
}

// ── Main Visual Editor ──────────────────────────────────────

interface TemplateVisualEditorProps {
  blocks: TemplateBlock[];
  onChange: (blocks: TemplateBlock[]) => void;
  customVars?: string[];
}

export function TemplateVisualEditor({ blocks, onChange, customVars = [] }: TemplateVisualEditorProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const updateBlock = (index: number, updated: TemplateBlock) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  };

  const deleteBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const duplicateBlock = (index: number) => {
    const next = [...blocks];
    const deepClone = (b: TemplateBlock): TemplateBlock => ({
      ...b,
      id: genId(),
      children: b.children?.map(deepClone),
      items: b.items ? [...b.items] : undefined,
    });
    next.splice(index + 1, 0, deepClone(blocks[index]));
    onChange(next);
  };

  const addBlock = (type: TemplateBlock["type"]) => {
    onChange([...blocks, createBlock(type)]);
  };

  // Drag & drop handlers
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx !== null && dragIdx !== idx) {
      moveBlock(dragIdx, idx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Detect all variables used
  const detectedVars = new Set<string>();
  function scanBlocks(bList: TemplateBlock[]) {
    for (const b of bList) {
      const matches = [
        b.content, b.src, b.alt, b.buttonText, b.buttonUrl,
        ...(b.items || []),
      ]
        .filter(Boolean)
        .join(" ")
        .match(/\{([a-z_]+)\}/gi);
      if (matches) matches.forEach((m) => detectedVars.add(m.replace(/[{}]/g, "")));
      if (b.children) scanBlocks(b.children);
    }
  }
  scanBlocks(blocks);

  return (
    <div className="flex gap-4 min-h-[400px]">
      {/* Left: Block Palette */}
      <div className="w-48 shrink-0 space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Add Blocks</p>
          {BLOCK_PALETTE.map((bp) => (
            <button
              key={bp.type}
              onClick={() => addBlock(bp.type)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors group"
            >
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <bp.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium">{bp.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{bp.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <Separator />

        {/* Variables */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Variables Used</p>
          {detectedVars.size === 0 ? (
            <p className="text-[10px] text-muted-foreground/60 px-1">Right-click any text field to insert variables</p>
          ) : (
            <div className="flex flex-wrap gap-1 px-1">
              {[...detectedVars].map((v) => (
                <Badge key={v} variant="outline" className="text-[10px] font-mono rounded-md">
                  {`{${v}}`}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Canvas */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-[480px]">
          <div className="space-y-2 pr-2">
            {blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-xl text-center">
                <LayoutPanelTop className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No blocks yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Click a block type on the left to get started</p>
              </div>
            )}
            {blocks.map((block, i) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-150 ${
                  dragOverIdx === i && dragIdx !== i ? "ring-2 ring-primary/40 ring-offset-2 rounded-xl" : ""
                } ${dragIdx === i ? "opacity-40" : ""}`}
              >
                <BlockEditor
                  block={block}
                  onChange={(updated) => updateBlock(i, updated)}
                  onDelete={() => deleteBlock(i)}
                  onMoveUp={() => moveBlock(i, i - 1)}
                  onMoveDown={() => moveBlock(i, i + 1)}
                  onDuplicate={() => duplicateBlock(i)}
                  isFirst={i === 0}
                  isLast={i === blocks.length - 1}
                  customVars={[...detectedVars, ...customVars]}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
