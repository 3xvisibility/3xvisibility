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
import { Sparkles, Moon, Sun, Monitor, Webhook, Plus, Trash2, CheckCircle2, XCircle, Shield, Lock, FileText, Globe } from "lucide-react";
import AiProviderSettings from "@/components/settings/AiProviderSettings";
import EnvironmentConfigSettings from "@/components/settings/EnvironmentConfigSettings";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";

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
  const { t } = useLanguage();
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
        <h1 className="text-display">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.description")}</p>
      </div>

      {/* Profile */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
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
                  <Label htmlFor="full-name">{t("settings.fullName")}</Label>
                  <Input id="full-name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">{t("settings.email")}</Label>
                  <Input id="email" type="email" placeholder="john@example.com" disabled />
                </div>
              </div>
              <div>
                <Label htmlFor="company">{t("settings.company")}</Label>
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
            {t("settings.appearance")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("settings.appearanceDesc")}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: t("settings.light"), icon: Sun },
              { value: "dark", label: t("settings.dark"), icon: Moon },
              { value: "system", label: t("settings.system"), icon: Monitor },
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

      {/* AI Provider Selection */}
      <AiProviderSettings />

      {/* Environment Configuration (dynamic overrides) */}
      <EnvironmentConfigSettings />

      {/* AI Content Settings */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("settings.aiContentGeneration")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Usage tracking */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t("settings.aiGenerations")}</p>
              <Badge variant="outline" className="capitalize">{subscription?.plan || "free"} plan</Badge>
            </div>
            {loadingSub ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <>
                <Progress value={aiPercent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("settings.used", { count: aiUsed })}</span>
                  <span className={aiPercent >= 90 ? "text-destructive font-medium" : ""}>
                    {t("settings.remaining", { count: aiLimit - aiUsed })}
                  </span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* AI Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("settings.contentTone")}</Label>
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t("settings.contentToneDesc")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("settings.contentLength")}</Label>
              <Select value={aiLength} onValueChange={setAiLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LENGTH_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t("settings.contentLengthDesc")}</p>
            </div>

            <div className="space-y-2">
              <Label>{t("settings.language")}</Label>
              <Select value={aiLanguage} onValueChange={setAiLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{t("settings.languageDesc")}</p>
            </div>
          </div>

          <Separator />

          {/* Template syntax reference */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">{t("settings.aiTemplateSyntax")}</p>
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

      {/* Notification Preferences */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("settings.notificationPreferences")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.notificationPreferencesDesc")}</p>
          <NotificationPrefsEditor />
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t("settings.changePassword")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
      >
        {saveMutation.isPending ? t("settings.saving") : t("common.saveChanges")}
      </Button>

      <Separator />

      {/* Security Status */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("settings.securityStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("settings.securityStatusDesc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: t("settings.httpsEverywhere"), description: t("settings.httpsDesc"), icon: Lock, active: true },
              { label: t("settings.encryptedTokens"), description: t("settings.encryptedTokensDesc"), icon: Shield, active: true },
              { label: t("settings.rowLevelSecurity"), description: t("settings.rowLevelSecurityDesc"), icon: Globe, active: true },
              { label: t("settings.auditLogging"), description: t("settings.auditLoggingDesc"), icon: FileText, active: true },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">{t("settings.active")}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Webhooks */}
      <WebhookSettings wsId={wsId} />

      <Separator />

      {/* API Keys */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle>{t("settings.apiKeys")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("settings.apiKeysDesc")}
          </p>
          <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
            pgp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
          </div>
          <Button variant="outline" size="sm">{t("settings.regenerateKey")}</Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-surface border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">{t("settings.dangerZone")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t("settings.deleteAccountDesc")}
          </p>
          <Button variant="destructive" className="transition-all duration-150 active:scale-[0.97]">
            {t("settings.deleteAccount")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Password Change Form ─────────────────────────────
function PasswordChangeForm() {
  const { toast } = useToast();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPw.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Mismatch", description: "Passwords don't match.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast({ title: "Password updated", description: "Your password has been changed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-pw">New Password</Label>
        <Input id="new-pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-pw">Confirm New Password</Label>
        <Input id="confirm-pw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
      </div>
      <Button onClick={handleChange} disabled={saving || !newPw} variant="outline">
        {saving ? "Updating..." : "Update Password"}
      </Button>
    </div>
  );
}

// ── Notification Preferences ─────────────────────────
function NotificationPrefsEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState({ job_completed: true, job_failed: true, usage_limit: true });
  const [loaded, setLoaded] = useState(false);

  useQuery({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && !loaded) {
        const p = (data as any).notification_preferences || {};
        setPrefs({
          job_completed: p.job_completed !== false,
          job_failed: p.job_failed !== false,
          usage_limit: p.usage_limit !== false,
        });
        setLoaded(true);
      }
      return data;
    },
  });

  const toggle = async (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ notification_preferences: newPrefs as any, updated_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
    toast({ title: "Preference saved" });
  };

  const items = [
    { key: "job_completed" as const, label: "Job Completed", desc: "Notify when a generation job finishes successfully." },
    { key: "job_failed" as const, label: "Job Failed / Errors", desc: "Notify on generation failures or publishing errors." },
    { key: "usage_limit" as const, label: "Usage Limit Warnings", desc: "Notify when approaching page or AI generation limits." },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </div>
          <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
        </div>
      ))}
    </div>
  );
}

interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
}

function WebhookSettings({ wsId }: { wsId: string | undefined }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState("");
  const [newSecret, setNewSecret] = useState("");

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ["webhooks", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as WebhookEndpoint[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("webhook_endpoints").insert({
        user_id: user.id,
        workspace_id: wsId!,
        url: newUrl,
        secret: newSecret || null,
        events: ["campaign.completed", "campaign.failed"],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setNewUrl("");
      setNewSecret("");
      toast({ title: "Webhook added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("webhook_endpoints").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast({ title: "Webhook deleted" });
    },
  });

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Webhooks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receive HTTP notifications when campaigns complete or fail. We&apos;ll POST a JSON payload to your URL.
        </p>

        {/* Add new webhook */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="https://your-server.com/webhook"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Secret (optional)"
            value={newSecret}
            onChange={(e) => setNewSecret(e.target.value)}
            className="sm:w-44"
          />
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!newUrl || addMutation.isPending}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : webhooks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No webhooks configured.</p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
                <Switch
                  checked={wh.is_active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: wh.id, is_active: checked })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{wh.url}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span>{wh.events.join(", ")}</span>
                    {wh.last_triggered_at && (
                      <>
                        <span>·</span>
                        {wh.last_status_code && wh.last_status_code >= 200 && wh.last_status_code < 300 ? (
                          <span className="flex items-center gap-0.5 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> {wh.last_status_code}
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-destructive">
                            <XCircle className="h-3 w-3" /> {wh.last_status_code || "Error"}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(wh.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
