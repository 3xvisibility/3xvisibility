import { useCallback, useEffect, useRef } from "react";

interface TemplatePreviewProps {
  html: string;
  className?: string;
}

/**
 * Renders an HTML template string inside a sandboxed iframe.
 * Variable placeholders like {variable} are highlighted with styled badges.
 * AI blocks like {{AI:...}} are highlighted differently.
 */
export function TemplatePreview({ html, className = "" }: TemplatePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getStyledHtml = useCallback((raw: string) => {
    // Highlight {{AI:...}} blocks
    let styled = raw.replace(
      /\{\{AI:(.*?)\}\}/g,
      '<span style="background:hsl(280 60% 92%);color:hsl(280 60% 35%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(280 40% 80%)">🤖 AI: $1</span>'
    );

    // Highlight {{MAP:...}}, {{YOUTUBE:...}}, {{IMAGE:...}}, {{WEATHER:...}} dynamic elements
    styled = styled.replace(
      /\{\{(MAP|YOUTUBE|IMAGE|WEATHER):(.*?)\}\}/gi,
      '<span style="background:hsl(150 60% 90%);color:hsl(150 60% 30%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(150 40% 78%)">🔌 $1: $2</span>'
    );

    // Highlight spintax {option1|option2|option3}
    styled = styled.replace(
      /\{([^{}]*?\|[^{}]*?)\}/g,
      '<span style="background:hsl(35 90% 90%);color:hsl(35 80% 30%);padding:2px 6px;border-radius:4px;font-size:0.8em;font-family:monospace;border:1px solid hsl(35 70% 78%)">🔀 {$1}</span>'
    );

    // Highlight {variable} placeholders (but not the ones inside AI blocks already handled)
    styled = styled.replace(
      /\{([a-z_]+)\}/gi,
      '<span style="background:hsl(210 80% 92%);color:hsl(210 80% 35%);padding:1px 5px;border-radius:3px;font-size:0.85em;font-family:monospace;border:1px solid hsl(210 60% 82%)">$&</span>'
    );

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

    // Auto-resize iframe to content height
    const resize = () => {
      if (doc.body) {
        iframe.style.height = doc.body.scrollHeight + 24 + "px";
      }
    };
    resize();
    // Observe for layout shifts
    const observer = new MutationObserver(resize);
    if (doc.body) observer.observe(doc.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [html, getStyledHtml]);

  if (!html) return null;

  return (
    <iframe
      ref={iframeRef}
      className={`w-full border border-border rounded-md bg-background ${className}`}
      sandbox="allow-same-origin"
      title="Template Preview"
      style={{ minHeight: 120, maxHeight: 500 }}
    />
  );
}
