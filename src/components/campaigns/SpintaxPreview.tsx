import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shuffle, Copy, Hash, Eye, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Pre-process block spinning: [spin]block1||block2[/spin]
 * Expands into all block-level variations.
 */
function expandBlockSpinning(text: string): string[] {
  const regex = /\[spin\]([\s\S]*?)\[\/spin\]/i;
  const match = text.match(regex);
  if (!match) return [text];

  const before = text.slice(0, match.index!);
  const after = text.slice(match.index! + match[0].length);
  const blocks = match[1].split("||").map(b => b.trim());

  const results: string[] = [];
  for (const block of blocks) {
    const expanded = expandBlockSpinning(before + block + after);
    results.push(...expanded);
  }
  return results;
}

/**
 * Recursively resolve all spintax variations from a string like:
 * "Hello {world|earth}, {good|great} day"
 */
function expandSpintax(text: string): string[] {
  // First expand block spinning
  const blockVariants = expandBlockSpinning(text);
  const results: string[] = [];
  for (const variant of blockVariants) {
    results.push(...expandInlineSpintax(variant));
  }
  return results;
}

function expandInlineSpintax(text: string): string[] {
  const regex = /\{([^{}]+)\}/;
  const match = text.match(regex);
  if (!match) return [text];

  const before = text.slice(0, match.index!);
  const after = text.slice(match.index! + match[0].length);
  const options = match[1].split("|");

  const results: string[] = [];
  for (const option of options) {
    const expanded = expandInlineSpintax(before + option + after);
    results.push(...expanded);
  }
  return results;
}

/** Pick one random variation */
function randomSpintax(text: string): string {
  const regex = /\{([^{}]+)\}/g;
  return text.replace(regex, (_, group) => {
    const options = group.split("|");
    return options[Math.floor(Math.random() * options.length)];
  });
}

/** Highlight spintax blocks in text */
function highlightSpintax(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\{[^{}]+\})/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    }
    const options = match[1].slice(1, -1).split("|");
    parts.push(
      <span
        key={match.index}
        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px] border border-primary/20"
        title={`${options.length} variations`}
      >
        <Shuffle className="h-2.5 w-2.5 shrink-0 opacity-60" />
        {match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }
  return parts;
}

interface SpintaxPreviewProps {
  /** Optional initial content. If not provided, a textarea is shown. */
  initialContent?: string;
  /** Compact mode for embedding in other dialogs */
  compact?: boolean;
}

export function SpintaxPreview({ initialContent, compact = false }: SpintaxPreviewProps) {
  const [content, setContent] = useState(initialContent || "");
  const [showAll, setShowAll] = useState(false);
  const [randomResult, setRandomResult] = useState<string | null>(null);

  const spintaxCount = useMemo(() => {
    const regex = /\{([^{}]+)\}/g;
    let count = 0;
    let m;
    while ((m = regex.exec(content)) !== null) {
      count++;
    }
    return count;
  }, [content]);

  const allVariations = useMemo(() => {
    if (!showAll || !content.trim()) return [];
    try {
      const expanded = expandSpintax(content);
      // Cap at 500 to prevent browser freezing
      return expanded.slice(0, 500);
    } catch {
      return [];
    }
  }, [content, showAll]);

  const totalVariations = useMemo(() => {
    if (!content.trim()) return 0;
    const regex = /\{([^{}]+)\}/g;
    let total = 1;
    let m;
    while ((m = regex.exec(content)) !== null) {
      total *= m[1].split("|").length;
    }
    return total;
  }, [content]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">Spintax</span>
            {spintaxCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                <Hash className="h-2.5 w-2.5 mr-0.5" />{totalVariations} variations
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2"
              onClick={() => setRandomResult(randomSpintax(content))}
              disabled={spintaxCount === 0}
            >
              <Shuffle className="h-2.5 w-2.5 mr-1" /> Random
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2"
              onClick={() => setShowAll(!showAll)}
              disabled={spintaxCount === 0}
            >
              <Eye className="h-2.5 w-2.5 mr-1" /> {showAll ? "Hide" : "Show"} All
            </Button>
          </div>
        </div>

        {randomResult && (
          <div className="rounded-lg bg-muted/50 border border-border p-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <span>{randomResult}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => copyToClipboard(randomResult)}>
                <Copy className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        )}

        {showAll && allVariations.length > 0 && (
          <ScrollArea className="max-h-[200px] rounded-lg border border-border">
            <div className="p-2 space-y-1">
              {allVariations.map((v, i) => (
                <div key={i} className="flex items-start justify-between gap-2 px-2 py-1 rounded hover:bg-muted/50 text-[11px]">
                  <span className="flex-1">
                    <span className="text-muted-foreground font-mono mr-1.5">{i + 1}.</span>
                    {v}
                  </span>
                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => copyToClipboard(v)}>
                    <Copy className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
              {totalVariations > 500 && (
                <p className="text-[10px] text-muted-foreground text-center py-1">
                  Showing 500 of {totalVariations.toLocaleString()} variations
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-surface">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-primary" /> Spintax Preview Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Enter content with spintax syntax like <code className="bg-muted px-1 rounded text-[11px]">{"{option1|option2|option3}"}</code> to preview all possible variations.
        </p>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Content with Spintax</Label>
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setRandomResult(null);
              setShowAll(false);
            }}
            placeholder={`Example: {Best|Top|Professional} {plumber|plumbing service} in {city}`}
            rows={4}
            className="font-mono text-xs"
          />
        </div>

        {/* Highlighted preview */}
        {content.trim() && (
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <Label className="text-xs font-medium">Highlighted Preview</Label>
            <div className="text-xs leading-relaxed whitespace-pre-wrap">
              {highlightSpintax(content)}
            </div>
          </div>
        )}

        {/* Stats & Actions */}
        {spintaxCount > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                <Hash className="h-3 w-3 mr-1" /> {spintaxCount} spin{spintaxCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {totalVariations.toLocaleString()} total variation{totalVariations !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-xl"
                onClick={() => setRandomResult(randomSpintax(content))}
              >
                <Shuffle className="h-3 w-3 mr-1.5" /> Random Pick
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs rounded-xl"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? <ChevronUp className="h-3 w-3 mr-1.5" /> : <ChevronDown className="h-3 w-3 mr-1.5" />}
                {showAll ? "Hide All" : "Show All"}
              </Button>
            </div>
          </div>
        )}

        {/* Random result */}
        {randomResult && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-primary">Random Variation</Label>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(randomResult)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs">{randomResult}</p>
          </div>
        )}

        {/* All variations */}
        {showAll && allVariations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              All Variations ({Math.min(allVariations.length, totalVariations).toLocaleString()}
              {totalVariations > 500 ? ` of ${totalVariations.toLocaleString()}` : ""})
            </Label>
            <ScrollArea className="max-h-[300px] rounded-xl border border-border">
              <div className="p-2 space-y-0.5">
                {allVariations.map((variation, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 text-xs">
                      <span className="text-muted-foreground font-mono text-[10px] mr-2 tabular-nums">{i + 1}.</span>
                      {variation}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(variation)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
