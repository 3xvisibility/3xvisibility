import { useCallback, useEffect, useRef } from "react";

interface TemplatePreviewProps {
  html: string;
  className?: string;
}

/**
 * Renders an HTML template string inside a sandboxed iframe.
 * Variable placeholders, transforms, shortcodes, spintax, and AI blocks
 * are all highlighted with distinct color-coded badges.
 * Extracts embedded <!-- STYLES --> blocks and injects them into the iframe
 * head for high-fidelity rendering of imported site pages.
 */
export function TemplatePreview({ html, className = "" }: TemplatePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getStyledHtml = useCallback((raw: string) => {
    // Extract embedded styles block (from site imports)
    let embeddedStyles = "";
    let contentHtml = raw;
    const stylesMatch = raw.match(/<!-- STYLES -->\n?([\s\S]*?)\n?<!-- \/STYLES -->/);
    if (stylesMatch) {
      embeddedStyles = stylesMatch[1];
      contentHtml = raw.replace(/<!-- STYLES -->\n?[\s\S]*?\n?<!-- \/STYLES -->\n?/, "").trim();
    }

    const hasExternalStyles = !!embeddedStyles;

    // Highlight {{AI:...}} blocks
    let styled = contentHtml.replace(
      /\{\{AI:(.*?)\}\}/g,
      '<span style="background:hsl(280 60% 92%);color:hsl(280 60% 35%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(280 40% 80%)">🤖 AI: $1</span>'
    );

    // Highlight {{AI_IMAGE:...}} blocks
    styled = styled.replace(
      /\{\{AI_IMAGE:(.*?)\}\}/g,
      '<span style="background:hsl(320 60% 92%);color:hsl(320 60% 35%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(320 40% 80%)">🎨 AI Image: $1</span>'
    );

    // Highlight {{MAP:...}}, {{OSM:...}}, {{YOUTUBE:...}}, {{IMAGE:...}}, {{WEATHER:...}} dynamic elements
    styled = styled.replace(
      /\{\{(MAP|OSM|YOUTUBE|IMAGE|PEXELS|PIXABAY|WEATHER):(.*?)\}\}/gi,
      '<span style="background:hsl(150 60% 90%);color:hsl(150 60% 30%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(150 40% 78%)">🔌 $1: $2</span>'
    );

    // Highlight {{WIKIPEDIA:...}} with book icon
    styled = styled.replace(
      /\{\{WIKIPEDIA:(.*?)\}\}/gi,
      '<span style="background:hsl(45 80% 92%);color:hsl(45 70% 30%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(45 60% 78%)">📖 Wikipedia: $1</span>'
    );

    // Highlight {{YELP:...}} with star icon
    styled = styled.replace(
      /\{\{YELP:(.*?)\}\}/gi,
      '<span style="background:hsl(0 70% 94%);color:hsl(0 60% 35%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(0 50% 82%)">⭐ Yelp: $1</span>'
    );

    // Highlight spintax {option1|option2|option3}
    styled = styled.replace(
      /\{([^{}]*?\|[^{}]*?)\}/g,
      '<span style="background:hsl(35 90% 90%);color:hsl(35 80% 30%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(35 70% 78%)">🔀 {$1}</span>'
    );

    // Highlight {variable:transform} patterns (with transforms)
    styled = styled.replace(
      /\{([a-z_][a-z0-9_]*):([a-z_]+(?:\([^)]*\))?(?::[a-z_]+(?:\([^)]*\))?)*)\}/gi,
      '<span style="background:hsl(270 70% 93%);color:hsl(270 60% 35%);padding:1px 5px;border-radius:3px;font-size:0.85em;font-family:monospace;border:1px solid hsl(270 50% 82%)">⚡ {$1:$2}</span>'
    );

    // Highlight {variable} placeholders (simple, no transforms)
    styled = styled.replace(
      /\{([a-z_][a-z0-9_]*)\}/gi,
      '<span style="background:hsl(210 80% 92%);color:hsl(210 80% 35%);padding:1px 5px;border-radius:3px;font-size:0.85em;font-family:monospace;border:1px solid hsl(210 60% 82%)">$&</span>'
    );

    // Highlight {{#if ...}}...{{/if}} conditionals
    styled = styled.replace(
      /\{\{#(if|else|each)\s*([^}]*)\}\}/gi,
      '<span style="background:hsl(180 50% 90%);color:hsl(180 60% 30%);padding:1px 5px;border-radius:3px;font-size:0.8em;font-family:monospace;border:1px solid hsl(180 40% 78%)">🔀 {{#$1 $2}}</span>'
    );
    styled = styled.replace(
      /\{\{\/(if|each)\}\}/gi,
      '<span style="background:hsl(180 50% 90%);color:hsl(180 60% 30%);padding:1px 5px;border-radius:3px;font-size:0.8em;font-family:monospace;border:1px solid hsl(180 40% 78%)">🔀 {{/$1}}</span>'
    );

    // If we have external styles (imported site), use them and skip default styles
    if (hasExternalStyles) {
      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${embeddedStyles}
<style>
  /* Minimal overrides for preview container */
  body { overflow-x: hidden; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>${styled}</body>
</html>`;
    }

    // Default simple styles for user-created templates
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 16px;
    line-height: 1.6;
    color: #1a1a2e;
    font-size: 14px;
  }
  h1 { font-size: 1.5em; margin-bottom: 0.5em; color: #0f172a; }
  h2 { font-size: 1.2em; margin-top: 1em; margin-bottom: 0.4em; color: #1e293b; }
  h3 { font-size: 1.05em; margin-top: 0.8em; margin-bottom: 0.3em; color: #334155; }
  p { margin-bottom: 0.6em; }
  ul, ol { margin: 0.5em 0 0.5em 1.5em; }
  li { margin-bottom: 0.3em; }
  section { margin-bottom: 1em; }
  a { color: hsl(210 80% 45%); }
</style>
</head>
<body>${styled}</body>
</html>`;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(getStyledHtml(html));
    doc.close();

    const resize = () => {
      if (doc.body) {
        iframe.style.height = doc.body.scrollHeight + 24 + "px";
      }
    };
    // Wait for external stylesheets to load before resizing
    const hasStyles = html.includes("<!-- STYLES -->");
    if (hasStyles) {
      setTimeout(resize, 1500);
      setTimeout(resize, 3000);
    }
    resize();
    const observer = new MutationObserver(resize);
    if (doc.body) observer.observe(doc.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [html, getStyledHtml]);

  if (!html) return null;

  return (
    <iframe
      ref={iframeRef}
      className={`w-full border border-border rounded-md bg-white ${className}`}
      sandbox="allow-same-origin"
      title="Template Preview"
      style={{ minHeight: 200, maxHeight: 800 }}
    />
  );
}
