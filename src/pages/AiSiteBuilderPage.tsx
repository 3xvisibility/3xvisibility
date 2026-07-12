import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recordVersionForLatest } from "@/lib/template-version-history";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Send, Loader2, Rocket, Wand2, MessageSquare, Globe, CheckCircle2, XCircle, AlertTriangle, CircleDot, Palette } from "lucide-react";

interface PublishStep {
  label: string;
  status: "running" | "ok" | "warn" | "error";
  detail?: string;
  at?: string;
}

// Live per-page status while a "Publish all" job runs.
interface PagePublishState {
  status: "pending" | "publishing" | "published" | "failed";
  url?: string;
  error?: string;
}


interface GeneratedPage {
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  content: string;
  elementor_data?: string;
  elementor_css?: string;
  elementor_mode?: string;
  publish_format?: string;
  platform?: "wordpress" | "shopify";
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface WebsiteRow {
  id: string;
  name: string;
  url: string;
  type: string;
  last_sync?: string | null;
  updated_at?: string | null;
}

function detectPlatform(type?: string | null): "wordpress" | "shopify" | "unknown" {
  const t = (type || "").toLowerCase();
  if (t === "wordpress") return "wordpress";
  if (t === "shopify") return "shopify";
  return "unknown";
}

function formatChecked(ts?: string | null): string {
  if (!ts) return "Not checked yet";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "Not checked yet";
  return `Last checked ${d.toLocaleString()}`;
}

export default function AiSiteBuilderPage() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [pages, setPages] = useState<GeneratedPage[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const page = pages[activeIdx] || null;
  const [building, setBuilding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSteps, setPublishSteps] = useState<PublishStep[]>([]);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [platform, setPlatform] = useState<"wordpress" | "shopify">("wordpress");
  // Manual per-website platform overrides (id -> platform).
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, "wordpress" | "shopify">>({});

  const effectivePlatform = (w: WebsiteRow): "wordpress" | "shopify" | "unknown" =>
    platformOverrides[w.id] || detectPlatform(w.type);

  // Wizard fields
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [niche, setNiche] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [freeText, setFreeText] = useState("");

  // Which pages to build (comma-separated), how faithfully to follow the
  // reference site, and the WordPress output format (Elementor vs Gutenberg).
  const [pagesInput, setPagesInput] = useState("Home");
  const [designMode, setDesignMode] = useState<"replicate" | "fresh">("fresh");
  const [wpFormat, setWpFormat] = useState<"elementor" | "gutenberg">("elementor");

  const parsedPages = () =>
    pagesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

  const buildFormat = (): "elementor" | "gutenberg" | "shopify" =>
    platform === "shopify" ? "shopify" : wpFormat;


  // Brand theme control (colors, typography, gradient style).
  const [themeOn, setThemeOn] = useState(false);
  const [themePrimary, setThemePrimary] = useState("#6d28d9");
  const [themeAccent, setThemeAccent] = useState("#f59e0b");
  const [themeBg, setThemeBg] = useState("#ffffff");
  const [themeText, setThemeText] = useState("#0f172a");
  const [themeFont, setThemeFont] = useState("plus-jakarta");
  const [themeGradient, setThemeGradient] = useState("diagonal");

  const brandThemePayload = () =>
    themeOn
      ? {
          primary: themePrimary,
          accent: themeAccent,
          bg: themeBg,
          text: themeText,
          font: themeFont,
          gradientStyle: themeGradient,
        }
      : undefined;

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi! Tell me about the site you want — brand, what it's about (niche), and a category. Or paste a reference website link, and I'll build a page for you." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    supabase
      .from("websites")
      .select("id, name, url, type, last_sync, updated_at")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data as WebsiteRow[]) || [];
        setWebsites(rows);
        if (rows.length && !selectedWebsite) {
          setSelectedWebsite(rows[0].id);
          // Auto-detect platform from the connected website's type.
          const detected = (rows[0].type || "").toLowerCase();
          if (detected === "shopify" || detected === "wordpress") {
            setPlatform(detected);
          }
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Before a page is built, keep the platform in sync with the selected website
  // (manual override wins over auto-detected type).
  useEffect(() => {
    if (page) return;
    const site = websites.find((w) => w.id === selectedWebsite);
    if (!site) return;
    const resolved = effectivePlatform(site);
    if (resolved === "shopify" || resolved === "wordpress") {
      setPlatform(resolved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWebsite, websites, page, platformOverrides]);

  // Keep the publish target in sync with the page's platform.
  useEffect(() => {
    if (!page) return;
    const target = page.platform || platform;
    const matches = websites.filter((w) => (w.type || "").toLowerCase() === target);
    if (!matches.some((w) => w.id === selectedWebsite)) {
      setSelectedWebsite(matches[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, websites]);



  const handleBuild = async () => {
    setBuilding(true);
    setPages([]);
    setActiveIdx(0);
    try {
      const { data, error } = await supabase.functions.invoke("ai-site-builder", {
        body: {
          action: "build",
          input: {
            brand, category, niche, referenceUrl, freeText, platform,
            brandTheme: brandThemePayload(),
            pages: parsedPages(),
            designMode,
            buildFormat: buildFormat(),
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const built: GeneratedPage[] = Array.isArray(data.pages) && data.pages.length ? data.pages : data.page ? [data.page] : [];
      setPages(built);
      setActiveIdx(0);
      toast({ title: "Preview ready", description: `${built.length} page${built.length > 1 ? "s" : ""} built — review, then publish.` });
    } catch (err: any) {
      toast({ title: "Build failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setBuilding(false);
    }
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setChatInput("");
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-site-builder", {
        body: { action: "chat", messages: next, platform, brandTheme: brandThemePayload(), designMode, buildFormat: buildFormat() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.reply || "..." }]);
      if (data.result?.page) {
        setPages([data.result.page]);
        setActiveIdx(0);
        toast({ title: "Preview ready", description: "Scroll down to review and publish." });
      }
    } catch (err: any) {
      setMessages([...next, { role: "assistant", content: `⚠️ ${err.message || String(err)}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePublish = async (all = false) => {
    if (!page || !selectedWebsite) {
      toast({ title: "Select a website", description: "Choose where to publish first.", variant: "destructive" });
      return;
    }
    const toPublish = all ? pages : [page];
    setPublishing(true);
    setPublishedUrl(null);
    setPublishSteps([{ label: `Sending ${toPublish.length} page${toPublish.length > 1 ? "s" : ""} to publisher`, status: "running" }]);
    try {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: {
          website_id: selectedWebsite,
          workspace_id: currentWorkspace?.id,
          pages: toPublish.map((p) => ({
            title: p.title,
            content: p.content,
            slug: p.slug,
            seo_title: p.seo_title,
            seo_description: p.seo_description,
            elementor_data: p.elementor_data,
            elementor_css: p.elementor_css,
            elementor_mode: p.elementor_mode,
            publish_format: p.publish_format,
          })),
        },
      });
      if (error) throw error;
      const results = Array.isArray(data?.results) ? data.results : [];
      const publishedCount = results.filter((r: any) => r?.status === "published").length;
      const lastSteps = results.find((r: any) => Array.isArray(r?.steps) && r.steps.length)?.steps;
      if (lastSteps) setPublishSteps(lastSteps);
      if (publishedCount > 0) {
        const url = results.find((r: any) => r?.status === "published")?.external_url || results.find((r: any) => r?.status === "published")?.url || null;
        setPublishedUrl(url);
        if (!lastSteps) setPublishSteps([{ label: `Published ${publishedCount} page${publishedCount > 1 ? "s" : ""}`, status: "ok", detail: url || undefined }]);
        toast({ title: "Published!", description: `${publishedCount} of ${toPublish.length} page(s) live.` });
      } else {
        throw new Error(results[0]?.error || "Publish did not complete.");
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      setPublishSteps((prev) => {
        const next = prev.map((s) => (s.status === "running" ? { ...s, status: "error" as const, detail: msg } : s));
        if (!next.some((s) => s.status === "error")) next.push({ label: "Publish failed", status: "error", detail: msg });
        return next;
      });
      toast({ title: "Publish failed", description: msg, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!page) return;
    setSavingTemplate(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) throw new Error("You must be signed in.");
      if (!currentWorkspace?.id) throw new Error("No workspace selected.");

      let parsedElementor: unknown = null;
      if (page.elementor_data) {
        try {
          parsedElementor =
            typeof page.elementor_data === "string"
              ? JSON.parse(page.elementor_data)
              : page.elementor_data;
        } catch {
          parsedElementor = null;
        }
      }

      const isElementor = !!parsedElementor && page.platform !== "shopify";

      const { error } = await supabase.from("templates").insert({
        user_id: uid,
        workspace_id: currentWorkspace.id,
        name: page.title || "AI Generated Template",
        content: page.content,
        variables: [],
        seo_title_pattern: page.seo_title || "",
        seo_description_pattern: page.seo_description || "",
        template_kind: isElementor ? "elementor" : "html",
        elementor_data: (parsedElementor ?? null) as any,
        schema_config: {},
      });
      if (error) throw error;
      // Record the first version snapshot for the new template.
      await recordVersionForLatest(
        currentWorkspace.id,
        page.title || "AI Generated Template",
        "Saved from AI Site Builder",
      );
      toast({
        title: "Saved as template",
        description: "Find it under Templates to run a campaign and generate pages.",
      });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const stepIcon = (status: PublishStep["status"]) => {
    if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    if (status === "error") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    if (status === "warn") return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
    return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <Seo title="AI Site Builder" description="Describe your brand and let AI build and publish a full page to WordPress or Shopify." path="/ai-site-builder" />

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Site Builder</h1>
          <p className="text-sm text-muted-foreground">Give a brand, niche, link or description — AI designs and publishes the page.</p>
        </div>
      </div>

      {/* Platform choice — decides which template system the AI builds into. */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">Build for which platform?</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPlatform("wordpress")}
              className={`rounded-lg border p-3 text-left transition ${platform === "wordpress" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}
            >
              <p className="text-sm font-semibold">WordPress</p>
              <p className="text-xs text-muted-foreground">Builds into the native Elementor template system.</p>
            </button>
            <button
              type="button"
              onClick={() => setPlatform("shopify")}
              className={`rounded-lg border p-3 text-left transition ${platform === "shopify" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}
            >
              <p className="text-sm font-semibold">Shopify</p>
              <p className="text-xs text-muted-foreground">Builds into the Shopify-style page template.</p>
            </button>
          </div>

          {/* WordPress build format: Elementor (native JSON) vs Gutenberg (blocks). */}
          {platform === "wordpress" && (
            <div className="space-y-2 pt-1">
              <Label className="text-xs text-muted-foreground">Build format</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWpFormat("elementor")}
                  className={`rounded-lg border p-3 text-left transition ${wpFormat === "elementor" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}
                >
                  <p className="text-sm font-semibold">Elementor</p>
                  <p className="text-xs text-muted-foreground">Editable native Elementor widgets.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setWpFormat("gutenberg")}
                  className={`rounded-lg border p-3 text-left transition ${wpFormat === "gutenberg" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}
                >
                  <p className="text-sm font-semibold">Gutenberg</p>
                  <p className="text-xs text-muted-foreground">Native WordPress block editor.</p>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand theme control — colors, typography, gradient style. */}
      <Card>
        <CardContent className="py-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Brand theme</Label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{themeOn ? "Using my colors" : "AI picks colors"}</span>
              <Switch checked={themeOn} onCheckedChange={setThemeOn} />
            </div>
          </div>

          {themeOn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Primary", value: themePrimary, set: setThemePrimary },
                  { label: "Accent", value: themeAccent, set: setThemeAccent },
                  { label: "Background", value: themeBg, set: setThemeBg },
                  { label: "Text", value: themeText, set: setThemeText },
                ].map((c) => (
                  <div key={c.label} className="space-y-1.5">
                    <Label className="text-xs">{c.label}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={c.value}
                        onChange={(e) => c.set(e.target.value)}
                        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
                        aria-label={`${c.label} color`}
                      />
                      <Input value={c.value} onChange={(e) => c.set(e.target.value)} className="h-9 font-mono text-xs" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Typography</Label>
                  <Select value={themeFont} onValueChange={setThemeFont}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plus-jakarta">Plus Jakarta Sans (modern)</SelectItem>
                      <SelectItem value="inter">Inter (clean)</SelectItem>
                      <SelectItem value="poppins">Poppins (friendly)</SelectItem>
                      <SelectItem value="space-grotesk">Space Grotesk (techy)</SelectItem>
                      <SelectItem value="sora">Sora (geometric)</SelectItem>
                      <SelectItem value="playfair">Playfair Display (elegant serif)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gradient style</Label>
                  <Select value={themeGradient} onValueChange={setThemeGradient}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagonal">Diagonal</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="radial">Radial glow</SelectItem>
                      <SelectItem value="conic">Conic</SelectItem>
                      <SelectItem value="solid">Solid (no gradient)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                className="h-16 rounded-lg border flex items-center justify-center text-sm font-semibold text-white"
                style={{
                  background:
                    themeGradient === "vertical"
                      ? `linear-gradient(180deg, ${themePrimary}, ${themeAccent})`
                      : themeGradient === "radial"
                        ? `radial-gradient(circle at 30% 20%, ${themePrimary}, ${themeAccent})`
                        : themeGradient === "conic"
                          ? `conic-gradient(from 210deg at 50% 50%, ${themePrimary}, ${themeAccent}, ${themePrimary})`
                          : themeGradient === "solid"
                            ? themePrimary
                            : `linear-gradient(135deg, ${themePrimary}, ${themeAccent})`,
                }}
              >
                Theme preview
              </div>
              <p className="text-xs text-muted-foreground">
                These values override the AI palette. Adjust and click <span className="font-medium">Build with AI</span> to regenerate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Connected websites with auto-detected platform badge + last-checked time. */}
      {websites.length > 0 && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold">Connected websites</Label>
            </div>
            <ul className="space-y-2">
              {websites.map((w) => {
                const resolved = effectivePlatform(w);
                const overridden = !!platformOverrides[w.id];
                return (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.name || w.url}</p>
                      <p className="text-xs text-muted-foreground truncate">{formatChecked(w.last_sync || w.updated_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          resolved === "wordpress"
                            ? "bg-blue-500/10 text-blue-600"
                            : resolved === "shopify"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {resolved === "wordpress" ? "🟦 WordPress" : resolved === "shopify" ? "🛍️ Shopify" : "❓ Unknown"}
                        {overridden && <span className="opacity-70">(manual)</span>}
                      </span>
                      {/* Manual platform override toggle. */}
                      <div className="inline-flex overflow-hidden rounded-md border text-xs">
                        <button
                          type="button"
                          onClick={() => setPlatformOverrides((p) => ({ ...p, [w.id]: "wordpress" }))}
                          className={`px-2 py-1 transition ${resolved === "wordpress" ? "bg-blue-500/10 text-blue-600 font-semibold" : "hover:bg-muted/50"}`}
                        >
                          WP
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlatformOverrides((p) => ({ ...p, [w.id]: "shopify" }))}
                          className={`px-2 py-1 border-l transition ${resolved === "shopify" ? "bg-emerald-500/10 text-emerald-600 font-semibold" : "hover:bg-muted/50"}`}
                        >
                          Shopify
                        </button>
                        {overridden && (
                          <button
                            type="button"
                            onClick={() =>
                              setPlatformOverrides((p) => {
                                const next = { ...p };
                                delete next[w.id];
                                return next;
                              })
                            }
                            title="Reset to auto-detected"
                            className="px-2 py-1 border-l text-muted-foreground hover:bg-muted/50"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}




      <div className="grid lg:grid-cols-2 gap-6">
        <Tabs defaultValue="wizard">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wizard" className="gap-2"><Wand2 className="h-4 w-4" /> Wizard</TabsTrigger>
            <TabsTrigger value="chat" className="gap-2"><MessageSquare className="h-4 w-4" /> Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="wizard">
            <Card>
              <CardHeader><CardTitle className="text-base">Describe your site</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Brand name</Label>
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. BrightSmile Dental" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Healthcare / Clinic" />
                </div>
                <div className="space-y-1.5">
                  <Label>Niche / industry</Label>
                  <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Cosmetic dentistry in Austin" />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference website (optional)</Label>
                  <Input value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} placeholder="https://example.com" />
                </div>

                {/* Design fidelity — only meaningful when a reference is given. */}
                {referenceUrl.trim() && (
                  <div className="space-y-1.5">
                    <Label>Match the reference site?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDesignMode("replicate")}
                        className={`rounded-lg border p-3 text-left transition ${designMode === "replicate" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}
                      >
                        <p className="text-sm font-semibold">Same design</p>
                        <p className="text-xs text-muted-foreground">Replicate the reference layout &amp; colors 1:1.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDesignMode("fresh")}
                        className={`rounded-lg border p-3 text-left transition ${designMode === "fresh" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}
                      >
                        <p className="text-sm font-semibold">Best fresh design</p>
                        <p className="text-xs text-muted-foreground">Use it as inspiration, design something better.</p>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Pages to build</Label>
                  <Input value={pagesInput} onChange={(e) => setPagesInput(e.target.value)} placeholder="Home, About, Services, Contact" />
                  <p className="text-xs text-muted-foreground">Comma-separated. AI builds a distinct page for each (up to 8).</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Extra instructions (optional)</Label>
                  <Textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Tone, key services, offers, colors…" rows={3} />
                </div>
                <Button onClick={handleBuild} disabled={building} className="w-full gap-2">
                  {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {building ? "Building…" : "Build with AI"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="flex flex-col h-[560px]">
              <CardContent className="flex-1 overflow-y-auto space-y-3 p-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </CardContent>
              <div className="border-t p-3 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                  placeholder="Describe your site…"
                  disabled={chatLoading}
                />
                <Button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview + Publish */}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Preview</CardTitle>
            {page && <span className="text-xs text-muted-foreground truncate max-w-[200px]">/{page.slug}</span>}
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {!page ? (
              <div className="h-[420px] flex items-center justify-center text-center text-muted-foreground border border-dashed rounded-lg">
                <div>
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Your generated page preview will appear here.</p>
                </div>
              </div>
            ) : (
              <>
                {pages.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pages.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveIdx(i)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${i === activeIdx ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
                      >
                        {p.title || `Page ${i + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="rounded-lg border overflow-hidden bg-white h-[380px] overflow-y-auto">
                  <iframe title="preview" srcDoc={page.content} className="w-full h-[1400px] border-0" />
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="font-semibold">SEO title:</span> {page.seo_title}</p>
                  <p className="text-muted-foreground">{page.seo_description}</p>
                  {page.platform === "shopify" ? (
                    <p className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 font-medium">
                      <Sparkles className="h-3 w-3" /> Shopify-style template ready
                    </p>
                  ) : page.publish_format === "gutenberg" ? (
                    <p className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 font-medium">
                      <Sparkles className="h-3 w-3" /> Gutenberg blocks ready
                    </p>
                  ) : page.elementor_data && (
                    <p className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 font-medium">
                      <Sparkles className="h-3 w-3" /> Native Elementor JSON ready
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                    <SelectTrigger className="flex-1">
                      <Globe className="h-4 w-4 mr-1 shrink-0" />
                      <SelectValue placeholder="Choose a website" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const target = page.platform || platform;
                        const matches = websites.filter((w) => (w.type || "").toLowerCase() === target);
                        if (!matches.length) {
                          return <SelectItem value="__none__" disabled>No connected {target} sites</SelectItem>;
                        }
                        return matches.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name} ({w.type})</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>

                  <Button onClick={() => handlePublish(false)} disabled={publishing || !selectedWebsite} className="gap-2">
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                    {publishing ? "Publishing…" : pages.length > 1 ? "Publish this page" : "Publish"}
                  </Button>
                </div>

                {pages.length > 1 && (
                  <Button onClick={() => handlePublish(true)} disabled={publishing || !selectedWebsite} variant="secondary" className="w-full gap-2">
                    <Rocket className="h-4 w-4" /> Publish all {pages.length} pages
                  </Button>
                )}


                <Button
                  variant="outline"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="w-full gap-2"
                >
                  {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {savingTemplate ? "Saving…" : "Save as template"}
                </Button>

                {publishSteps.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <CircleDot className="h-3.5 w-3.5" /> Publish status
                    </div>
                    <ol className="space-y-1.5">
                      {publishSteps.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          {stepIcon(s.status)}
                          <div className="min-w-0">
                            <p className="font-medium leading-tight">{s.label}</p>
                            {s.detail && <p className="text-muted-foreground break-words leading-tight">{s.detail}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                    {publishedUrl && (
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" /> View live page
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
