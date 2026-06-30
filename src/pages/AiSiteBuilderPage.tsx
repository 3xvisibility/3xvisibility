import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Sparkles, Send, Loader2, Rocket, Wand2, MessageSquare, Globe, CheckCircle2, XCircle, AlertTriangle, CircleDot } from "lucide-react";

interface PublishStep {
  label: string;
  status: "running" | "ok" | "warn" | "error";
  detail?: string;
  at?: string;
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
}

export default function AiSiteBuilderPage() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>("");
  const [page, setPage] = useState<GeneratedPage | null>(null);
  const [building, setBuilding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSteps, setPublishSteps] = useState<PublishStep[]>([]);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"wordpress" | "shopify">("wordpress");

  // Wizard fields
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [niche, setNiche] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [freeText, setFreeText] = useState("");

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
      .select("id, name, url, type")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data as WebsiteRow[]) || [];
        setWebsites(rows);
        if (rows.length && !selectedWebsite) setSelectedWebsite(rows[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleBuild = async () => {
    setBuilding(true);
    setPage(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-site-builder", {
        body: { action: "build", input: { brand, category, niche, referenceUrl, freeText, platform } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPage(data.page);
      toast({ title: "Preview ready", description: "Review it, then publish to your site." });
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
        body: { action: "chat", messages: next, platform },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.reply || "..." }]);
      if (data.result?.page) {
        setPage(data.result.page);
        toast({ title: "Preview ready", description: "Scroll down to review and publish." });
      }
    } catch (err: any) {
      setMessages([...next, { role: "assistant", content: `⚠️ ${err.message || String(err)}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!page || !selectedWebsite) {
      toast({ title: "Select a website", description: "Choose where to publish first.", variant: "destructive" });
      return;
    }
    setPublishing(true);
    setPublishedUrl(null);
    setPublishSteps([{ label: "Sending page to publisher", status: "running" }]);
    try {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: {
          website_id: selectedWebsite,
          workspace_id: currentWorkspace?.id,
          pages: [
            {
              title: page.title,
              content: page.content,
              slug: page.slug,
              seo_title: page.seo_title,
              seo_description: page.seo_description,
              elementor_data: page.elementor_data,
              elementor_css: page.elementor_css,
              elementor_mode: page.elementor_mode,
            },
          ],
        },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (Array.isArray(result?.steps) && result.steps.length) {
        setPublishSteps(result.steps);
      }
      if (result?.status === "published") {
        const url = result.external_url || result.url || null;
        setPublishedUrl(url);
        if (!Array.isArray(result?.steps) || !result.steps.length) {
          setPublishSteps([{ label: "Published", status: "ok", detail: url || undefined }]);
        }
        toast({ title: "Published!", description: url ? `Live at ${url}` : "Page is live." });
      } else {
        throw new Error(result?.error || "Publish did not complete.");
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
                <div className="rounded-lg border overflow-hidden bg-white h-[380px] overflow-y-auto">
                  <iframe title="preview" srcDoc={page.content} className="w-full h-[1400px] border-0" />
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="font-semibold">SEO title:</span> {page.seo_title}</p>
                  <p className="text-muted-foreground">{page.seo_description}</p>
                  {page.elementor_data && (
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
                      {websites.length === 0 ? (
                        <SelectItem value="__none__" disabled>No connected websites</SelectItem>
                      ) : (
                        websites.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name} ({w.type})</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handlePublish} disabled={publishing || !selectedWebsite} className="gap-2">
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                    {publishing ? "Publishing…" : "Publish"}
                  </Button>
                </div>

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
