import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MapPin, Youtube, BookOpen, Cloud, ImageIcon, Star, Plug,
} from "lucide-react";

interface DynamicElementsInserterProps {
  onInsert: (shortcode: string) => void;
}

const ELEMENTS = [
  { id: "MAP", icon: MapPin, label: "Google Map", placeholder: "{city}, {state}", color: "text-emerald-600", desc: "Embed a Google Map for a location" },
  { id: "OSM", icon: MapPin, label: "OpenStreetMap", placeholder: "{city}", color: "text-blue-600", desc: "Embed an OpenStreetMap" },
  { id: "YOUTUBE", icon: Youtube, label: "YouTube Video", placeholder: "{service} in {city}", color: "text-red-500", desc: "Embed a YouTube search result" },
  { id: "WIKIPEDIA", icon: BookOpen, label: "Wikipedia", placeholder: "{city}", color: "text-amber-600", desc: "Embed Wikipedia summary" },
  { id: "WEATHER", icon: Cloud, label: "Weather (OpenWeatherMap)", placeholder: "{city}, {state}", color: "text-sky-500", desc: "Show current weather via OpenWeatherMap" },
  { id: "PEXELS", icon: ImageIcon, label: "Pexels Image", placeholder: "{service}", color: "text-green-600", desc: "Insert a Pexels stock photo" },
  { id: "PIXABAY", icon: ImageIcon, label: "Pixabay Image", placeholder: "{keyword}", color: "text-purple-500", desc: "Insert a Pixabay photo" },
  { id: "CREATIVE_COMMONS", icon: ImageIcon, label: "Creative Commons", placeholder: "{keyword}", color: "text-teal-600", desc: "Insert a Creative Commons image" },
  { id: "MEDIA_LIBRARY", icon: ImageIcon, label: "Media Library", placeholder: "{keyword}", color: "text-orange-500", desc: "Insert from connected media library" },
  { id: "OPENAI_IMAGE", icon: Star, label: "OpenAI Image", placeholder: "{service} in {city}", color: "text-slate-600", desc: "AI-generated image via OpenAI DALL·E" },
  { id: "GEMINI_IMAGE", icon: Star, label: "Gemini AI Image", placeholder: "{service} {city}", color: "text-blue-500", desc: "AI-generated image via Google Gemini" },
  { id: "YELP", icon: Star, label: "Yelp Reviews", placeholder: "{service} {city}", color: "text-red-600", desc: "Show Yelp business results" },
  { id: "RELATED_LINKS", icon: Plug, label: "Related Links", placeholder: "{service}", color: "text-violet-500", desc: "Auto internal linking / interlinking" },
  { id: "IMAGE", icon: ImageIcon, label: "Dynamic Image", placeholder: "{keyword}", color: "text-indigo-500", desc: "Insert an image by keyword" },
] as const;

export function DynamicElementsInserter({ onInsert }: DynamicElementsInserterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedEl, setSelectedEl] = useState<typeof ELEMENTS[number] | null>(null);
  const [param, setParam] = useState("");

  const filtered = ELEMENTS.filter(e =>
    !query || e.label.toLowerCase().includes(query.toLowerCase()) || e.id.toLowerCase().includes(query.toLowerCase())
  );

  const handleInsert = () => {
    if (!selectedEl) return;
    const shortcode = `{{${selectedEl.id}:${param || selectedEl.placeholder}}}`;
    onInsert(shortcode);
    setSelectedEl(null);
    setParam("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5">
          <Plug className="h-3 w-3" /> Dynamic Elements
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {!selectedEl ? (
          <div className="p-2 space-y-1">
            <Input
              placeholder="Search elements..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 text-xs mb-1"
            />
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {filtered.map(el => (
                <button
                  key={el.id}
                  onClick={() => { setSelectedEl(el); setParam(el.placeholder); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-accent transition-colors"
                >
                  <el.icon className={`h-4 w-4 shrink-0 ${el.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{el.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{el.desc}</p>
                  </div>
                  <code className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded shrink-0">{`{{${el.id}:...}}`}</code>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <selectedEl.icon className={`h-4 w-4 ${selectedEl.color}`} />
              <span className="text-sm font-semibold">{selectedEl.label}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">{selectedEl.desc}</p>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Parameter (use {"{variables}"} from your keywords)</Label>
              <Input
                value={param}
                onChange={(e) => setParam(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder={selectedEl.placeholder}
              />
            </div>
            <div className="bg-muted rounded-md p-2">
              <p className="text-[10px] text-muted-foreground mb-0.5">Preview:</p>
              <code className="text-xs font-mono text-foreground">{`{{${selectedEl.id}:${param || selectedEl.placeholder}}}`}</code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => setSelectedEl(null)}>Back</Button>
              <Button size="sm" className="flex-1 h-8" onClick={handleInsert}>Insert</Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
