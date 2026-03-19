import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Moon, Sun, Monitor, Webhook, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const AI_PLAN_LIMITS: Record<string, number> = {
  free: 0,
  starter: 50,
  pro: 500,
  agency: 5000,
};

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "marketing", label: "Marketing" },
  { value: "formal", label: "Formal" },
  { value: "friendly", label: "Friendly" },
];

const LENGTH_OPTIONS = [
  { value: "short", label: "Short (1-2 sentences)" },
  { value: "medium", label: "Medium (3-5 sentences)" },
  { value: "long", label: "Long (2-3 paragraphs)" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [aiLength, setAiLength] = useState("medium");
  const [aiLanguage, setAiLanguage] = useState("en");
  const [initialized, setInitialized] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Fetch profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["settings-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && !initialized) {
        setFullName(data.full_name || "");
        setCompany(data.company || "");
        setAiTone(data.ai_tone || "professional");
        setAiLength(data.ai_content_length || "medium");
        setAiLanguage(data.ai_language || "en");
        setInitialized(true);
      }
      return data;
    },
  });

  // Fetch subscription for AI usage
  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ["settings-subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, ai_generations_used, ai_generations_limit")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  // Save profile + AI settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          company,
          ai_tone: aiTone,
          ai_content_length: aiLength,
          ai_language: aiLanguage,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      toast({ title: "Settings saved", description: "Your profile and AI settings have been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const aiUsed = subscription?.ai_generations_used || 0;
  const aiLimit = subscription?.ai_generations_limit || 50;
  const aiPercent = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-display">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, preferences, and AI content settings.</p>
      </div>

      {/* Profile */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingProfile ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input id="full-name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" disabled />
                </div>
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Acme Inc." value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose your preferred theme for the application.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? "default" : "outline"}
                className="flex items-center gap-2 h-12"
                onClick={() => setTheme(value)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Content Settings */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Usage tracking */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">AI Generations</p>
              <Badge variant="outline" className="capitalize">{subscription?.plan || "free"} plan</Badge>
            </div>
            {loadingSub ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <>
                <Progress value={aiPercent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{aiUsed} used</span>
                  <span className={aiPercent >= 90 ? "text-destructive font-medium" : ""}>
                    {aiLimit - aiUsed} remaining
                  </span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* AI Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Content Tone</Label>
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Sets the writing style for AI-generated content in your templates.</p>
            </div>

            <div className="space-y-2">
              <Label>Content Length</Label>
              <Select value={aiLength} onValueChange={setAiLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LENGTH_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Controls how much content is generated for each AI block.</p>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={aiLanguage} onValueChange={setAiLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">The language AI content will be written in.</p>
            </div>
          </div>

          <Separator />

          {/* Template syntax reference */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">AI Template Syntax</p>
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 py-0.5 rounded text-primary font-mono">{"{{AI:your prompt here}}"}</code> in your templates to generate dynamic AI content.
            </p>
            <div className="font-mono text-xs bg-background border border-border rounded-md p-3 space-y-1 text-muted-foreground">
              <p className="text-foreground">{"<h1>{title}</h1>"}</p>
              <p className="text-primary">{"<p>{{AI:Write a professional introduction about {service} in {location}.}}</p>"}</p>
              <p className="text-foreground">{"<h2>Why Choose {company}</h2>"}</p>
              <p className="text-primary">{"<p>{{AI:Write why customers should choose {company} for {service}.}}</p>"}</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Variables like <code className="font-mono">{"{service}"}</code> inside AI prompts are replaced with CSV values before AI generation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
      >
        {saveMutation.isPending ? "Saving..." : "Save Changes"}
      </Button>

      <Separator />

      {/* API Keys */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use API keys to integrate with external tools and automate page generation.
          </p>
          <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
            pgp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
          </div>
          <Button variant="outline" size="sm">Regenerate Key</Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-surface border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data.
          </p>
          <Button variant="destructive" className="transition-all duration-150 active:scale-[0.97]">
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
