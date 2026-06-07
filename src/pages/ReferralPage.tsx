import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportDataFile } from "@/lib/export-csv";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Link2,
  Copy,
  Check,
  Share2,
  Users,
  MousePointerClick,
  Gift,
  Mail,
  MessageCircle,
  Twitter,
  Linkedin,
  Facebook,
  ClipboardCopy,
  Award,
  ArrowRight,
  RefreshCw,
  Pencil,
  Coins,
  CheckCircle2,
  Clock,
  FileDown,
  Settings,
  Search,
  X,
} from "lucide-react";


interface ReferralStats {
  totalClicks: number;
  totalSignups: number;
  totalEarned: number;
}

interface ReferredUser {
  id: string;
  status: string;
  commission_amount: number;
  credit_reward: number;
  subscription_plan: string | null;
  converted_at: string | null;
  created_at: string;
}

// Yearly total price per plan (must match the check-subscription edge function)
const YEARLY_TOTAL: Record<string, number> = {
  starter: 192,
  pro: 588,
  agency: 1488,
};
const COMMISSION_RATE = 0.05; // 5%

interface RewardSetting {
  id: string;
  plan: string;
  reward_credits: number;
  monthly_limit: number | null;
  min_threshold: number;
  is_active: boolean;
}

export default function ReferralPage() {
  const { t } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({ totalClicks: 0, totalSignups: 0, totalEarned: 0 });
  const [referrals, setReferrals] = useState<ReferredUser[]>([]);
  const [credits, setCredits] = useState<{ remaining: number; total: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [customCode, setCustomCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Admin reward settings
  const [isAdmin, setIsAdmin] = useState(false);
  const [rewardSettings, setRewardSettings] = useState<RewardSetting[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters / search for referred users
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const AFFILIATE_BASE_URL = "https://www.3xvisibility.com";

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: links } = await supabase
      .from("affiliate_links")
      .select("id,code,total_clicks,total_conversions,total_earned")
      .eq("user_id", user.id)
      .limit(1);

    if (links && links.length > 0) {
      const l = links[0];
      setReferralCode(l.code);
      setLinkId(l.id);
      setStats({
        totalClicks: Number(l.total_clicks || 0),
        totalSignups: Number(l.total_conversions || 0),
        totalEarned: Number(l.total_earned || 0),
      });

      const { data: refs } = await supabase
        .from("affiliate_referrals")
        .select("id,status,commission_amount,credit_reward,subscription_plan,converted_at,created_at")
        .eq("affiliate_link_id", l.id)
        .order("created_at", { ascending: false });
      setReferrals((refs as ReferredUser[]) || []);
    }

    const { data: cr } = await supabase
      .from("ai_credits")
      .select("remaining_credits,total_credits")
      .eq("user_id", user.id)
      .maybeSingle();
    if (cr) setCredits({ remaining: Number(cr.remaining_credits || 0), total: Number(cr.total_credits || 0) });

    // Reward settings (visible to everyone; editable only by admins)
    const { data: settings } = await supabase
      .from("referral_reward_settings")
      .select("id,plan,reward_credits,monthly_limit,min_threshold,is_active")
      .order("plan", { ascending: true });
    if (settings) setRewardSettings(settings as RewardSetting[]);

    const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!adminCheck);

    setLoading(false);
  }

  async function saveRewardSettings() {
    setSavingSettings(true);
    const updates = rewardSettings.map((s) =>
      supabase
        .from("referral_reward_settings")
        .update({
          reward_credits: Math.max(0, Number(s.reward_credits) || 0),
          monthly_limit: s.monthly_limit === null || s.monthly_limit === undefined ? null : Math.max(0, Number(s.monthly_limit)),
          min_threshold: Math.max(0, Number(s.min_threshold) || 0),
          is_active: s.is_active,
        })
        .eq("id", s.id),
    );
    const results = await Promise.all(updates);
    const failed = results.some((r) => r.error);
    if (failed) {
      toast.error(t("referral.settingsSaveFailed"));
    } else {
      toast.success(t("referral.settingsSaved"));
      setSettingsOpen(false);
    }
    setSavingSettings(false);
  }

  function updateSetting(id: string, patch: Partial<RewardSetting>) {
    setRewardSettings((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function regenerateLink() {
    setRegenerating(true);
    const { data, error } = await supabase.functions.invoke("affiliate-track", {
      body: { action: "regenerate" },
    });
    if (error || !data?.success) {
      toast.error(t("referral.updateFailed"));
    } else {
      setReferralCode(data.code);
      toast.success(t("referral.linkUpdated"));
    }
    setRegenerating(false);
  }

  async function saveCustomCode() {
    if (customCode.trim().length < 3) {
      toast.error(t("referral.codeTooShort"));
      return;
    }
    setSavingCode(true);
    const { data, error } = await supabase.functions.invoke("affiliate-track", {
      body: { action: "set_code", code: customCode },
    });
    if (error || !data?.success) {
      toast.error(data?.error === "code_taken" ? t("referral.codeTaken") : t("referral.updateFailed"));
    } else {
      setReferralCode(data.code);
      setEditOpen(false);
      setCustomCode("");
      toast.success(t("referral.linkUpdated"));
    }
    setSavingCode(false);
  }


  async function createReferralCode() {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = `ref_${user.id.substring(0, 8)}_${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from("affiliate_links")
      .insert({
        user_id: user.id,
        workspace_id: currentWorkspace?.id || null,
        code,
        commission_rate: 5,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error(t("referral.createFailed"));
    } else {
      setReferralCode((data as any).code);
      toast.success(t("referral.created"));
    }
    setCreating(false);
  }

  function copyLink() {
    if (!referralCode) return;
    const url = `${AFFILIATE_BASE_URL}/?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("referral.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  function share(platform: string) {
    if (!referralCode) return;
    const url = `${AFFILIATE_BASE_URL}/?ref=${referralCode}`;
    const text = encodeURIComponent(t("referral.shareText"));
    const encodedUrl = encodeURIComponent(url);

    switch (platform) {
      case "twitter":
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`, "_blank");
        break;
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank");
        break;
      case "linkedin":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, "_blank");
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(t("referral.emailSubject"))}&body=${text}%0A%0A${encodedUrl}`;
        break;
      default:
        if (navigator.share) {
          navigator.share({ title: "3XVISIBILITY", text: t("referral.shareText"), url });
        } else {
          copyLink();
        }
    }
  }

  function isVerified(r: ReferredUser) {
    return r.status === "verified" || r.status === "converted" || !!r.converted_at;
  }

  // Apply search + filters to the referred users list
  const filteredReferrals = referrals.filter((r) => {
    const verified = isVerified(r);
    if (statusFilter === "verified" && !verified) return false;
    if (statusFilter === "pending" && verified) return false;
    if (planFilter !== "all" && (r.subscription_plan || "—") !== planFilter) return false;
    const created = new Date(r.created_at);
    if (fromDate && created < new Date(fromDate + "T00:00:00")) return false;
    if (toDate && created > new Date(toDate + "T23:59:59")) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const hay = `${r.subscription_plan || ""} ${r.status} ${verified ? "verified" : "pending"} ${new Date(r.created_at).toLocaleDateString()}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const planOptions = Array.from(new Set(referrals.map((r) => r.subscription_plan || "—")));
  const filtersActive = !!searchTerm.trim() || statusFilter !== "all" || planFilter !== "all" || !!fromDate || !!toDate;

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setPlanFilter("all");
    setFromDate("");
    setToDate("");
  }

  function exportReferralsCsv() {
    try {
      if (filteredReferrals.length === 0) {
        toast.error(t("referral.exportEmpty"));
        return;
      }
      const rows = filteredReferrals.map((r) => ({
        Date: new Date(r.created_at).toLocaleDateString(),
        Status: isVerified(r) ? "Verified" : "Pending",
        Plan: r.subscription_plan || "—",
        "Credit Reward": isVerified(r) ? String(r.credit_reward ?? 0) : "0",
      }));
      exportDataFile(rows, "csv", "referred-users.csv");
      toast.success(t("referral.exportSuccess").replace("{count}", String(rows.length)));
    } catch {
      toast.error(t("referral.exportFailed"));
    }
  }

  const referralUrl = referralCode ? `${AFFILIATE_BASE_URL}/?ref=${referralCode}` : "";


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!referralCode) {
    return (
      <div className="p-4 md:p-6 space-y-8 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">{t("referral.title")}</h1>
          <p className="text-muted-foreground">{t("referral.subtitle")}</p>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <CardContent className="relative pt-12 pb-10 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
              <Gift className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-bold">{t("referral.joinTitle")}</h2>
              <p className="text-muted-foreground text-sm">{t("referral.joinDesc")}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-2xl font-bold text-primary">50</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("referral.creditsEach")}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("referral.minPayout")}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-2xl font-bold text-primary">∞</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("referral.noLimit")}</p>
              </div>
            </div>
            <Button onClick={createReferralCode} disabled={creating} size="lg" className="min-w-[200px]">
              <Link2 className="mr-2 h-4 w-4" />
              {creating ? t("referral.creating") : t("referral.getLink")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">{t("referral.title")}</h1>
        <p className="text-muted-foreground">{t("referral.subtitle")}</p>
      </div>

      {/* Referral Link Card */}
      <Card className="relative overflow-hidden border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <CardHeader className="relative pb-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t("referral.yourLink")}</CardTitle>
          </div>
          <CardDescription>{t("referral.shareDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-5">
          {/* URL Input + Copy */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                value={referralUrl}
                readOnly
                className="font-mono text-sm pr-4 h-11 bg-muted/30"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copyLink}
                className="h-11 px-5 min-w-[140px]"
                variant={copied ? "default" : "outline"}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("referral.copied")}
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    {t("referral.copy")}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => share("native")}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Customize / Regenerate */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-primary"
              onClick={() => { setCustomCode(referralCode || ""); setEditOpen(true); }}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("referral.customize")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-primary"
              onClick={regenerateLink}
              disabled={regenerating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
              {t("referral.regenerate")}
            </Button>
          </div>

          <Separator />

          {/* Social Share */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">{t("referral.shareOn")}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => share("twitter")} className="gap-2">
                <Twitter className="h-4 w-4" />
                <span className="hidden sm:inline">Twitter</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => share("facebook")} className="gap-2">
                <Facebook className="h-4 w-4" />
                <span className="hidden sm:inline">Facebook</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => share("linkedin")} className="gap-2">
                <Linkedin className="h-4 w-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => share("email")} className="gap-2">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
                <ClipboardCopy className="h-4 w-4" />
                <span className="hidden sm:inline">{t("referral.copy")}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <MousePointerClick className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalClicks}</p>
                <p className="text-xs text-muted-foreground">{t("referral.clicks")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10">
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSignups}</p>
                <p className="text-xs text-muted-foreground">{t("referral.signups")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-500/10">
                <Gift className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.totalEarned.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{t("referral.earned")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Coins className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{credits ? credits.remaining : 0}</p>
                <p className="text-xs text-muted-foreground">{t("referral.creditsBalance")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referred Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("referral.referredUsers")}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} className="gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  {t("referral.rewardSettings")}
                </Button>
              )}
              {referrals.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportReferralsCsv} className="gap-2">
                  <FileDown className="h-3.5 w-3.5" />
                  {t("referral.exportCsv")}
                </Button>
              )}
            </div>
          </div>
          <CardDescription>{t("referral.referredUsersDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referrals.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("referral.noReferrals")}
            </div>
          ) : (
            <>
              {/* Filters & search */}
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t("referral.searchPlaceholder")}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full lg:w-[150px]">
                    <SelectValue placeholder={t("referral.colStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("referral.filterAllStatus")}</SelectItem>
                    <SelectItem value="verified">{t("referral.statusVerified")}</SelectItem>
                    <SelectItem value="pending">{t("referral.statusPending")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="h-9 w-full lg:w-[150px]">
                    <SelectValue placeholder={t("referral.colPlan")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("referral.filterAllPlans")}</SelectItem>
                    {planOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-[140px]" aria-label={t("referral.filterFrom")} />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-[140px]" aria-label={t("referral.filterTo")} />
                </div>
                {filtersActive && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-9">
                    <X className="h-3.5 w-3.5" />
                    {t("referral.clearFilters")}
                  </Button>
                )}
              </div>

              {filteredReferrals.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {t("referral.noMatches")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("referral.colDate")}</TableHead>
                        <TableHead>{t("referral.colStatus")}</TableHead>
                        <TableHead>{t("referral.colPlan")}</TableHead>
                        <TableHead className="text-right">{t("referral.colCreditReward")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReferrals.map((r) => {
                        const verified = isVerified(r);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">
                              {new Date(r.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={verified ? "default" : "secondary"}
                                className="gap-1"
                                title={verified ? t("referral.statusActivatedHint") : t("referral.statusPendingHint")}
                              >
                                {verified ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {verified ? t("referral.statusVerified") : t("referral.statusPending")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {r.subscription_plan || "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {verified ? (
                                <span className="inline-flex items-center gap-1 text-primary">
                                  <Coins className="h-3.5 w-3.5" />
                                  {Number(r.credit_reward ?? 0)}
                                </span>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground mt-3">
                    {t("referral.showingCount").replace("{shown}", String(filteredReferrals.length)).replace("{total}", String(referrals.length))}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payout / Threshold Note */}
      <Card className="border-primary/10 bg-primary/[0.03]">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{t("referral.rewardNoteTitle")}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("referral.rewardNoteDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("referral.howItWorks")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: Link2,
                title: t("referral.step1Title"),
                desc: t("referral.step1Desc"),
              },
              {
                step: "2",
                icon: Users,
                title: t("referral.step2Title"),
                desc: t("referral.step2Desc"),
              },
              {
                step: "3",
                icon: Gift,
                title: t("referral.step3Title"),
                desc: t("referral.step3Desc"),
                reward: "+50 AI credits",
              },
            ].map((item) => (
              <div key={item.step} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary ring-1 ring-primary/20">
                    {item.step}
                  </div>
                  {item.step !== "3" && (
                    <div className="hidden md:block w-px h-full bg-border mt-2" />
                  )}
                </div>
                <div className="space-y-1 pb-2 flex-1">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    {item.reward && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-green-500/10 text-green-600 hover:bg-green-500/10">
                        {item.reward}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center">
        <Button variant="link" onClick={() => window.open(`${AFFILIATE_BASE_URL}/affiliate`, "_blank")} className="text-muted-foreground hover:text-primary">
          {t("referral.fullDashboard")}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {/* Customize code dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("referral.customizeTitle")}</DialogTitle>
            <DialogDescription>{t("referral.customizeDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center rounded-md border bg-muted/30 overflow-hidden">
              <span className="px-3 text-xs text-muted-foreground whitespace-nowrap border-r">
                {AFFILIATE_BASE_URL.replace("https://", "")}/?ref=
              </span>
              <Input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                placeholder="my-name"
                className="border-0 font-mono text-sm focus-visible:ring-0"
                maxLength={40}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("referral.customizeHint")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("referral.cancel")}</Button>
            <Button onClick={saveCustomCode} disabled={savingCode}>
              {savingCode ? t("referral.saving") : t("referral.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin reward settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("referral.rewardSettingsTitle")}</DialogTitle>
            <DialogDescription>{t("referral.rewardSettingsDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {rewardSettings.map((s) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm capitalize">{s.plan}</p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${s.id}`} className="text-xs text-muted-foreground">{t("referral.settingActive")}</Label>
                    <Switch
                      id={`active-${s.id}`}
                      checked={s.is_active}
                      onCheckedChange={(v) => updateSetting(s.id, { is_active: v })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("referral.settingRewardCredits")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={s.reward_credits}
                      onChange={(e) => updateSetting(s.id, { reward_credits: Number(e.target.value) })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("referral.settingMinThreshold")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={s.min_threshold}
                      onChange={(e) => updateSetting(s.id, { min_threshold: Number(e.target.value) })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("referral.settingMonthlyLimit")}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={s.monthly_limit ?? ""}
                      placeholder={t("referral.settingNoLimit")}
                      onChange={(e) => updateSetting(s.id, { monthly_limit: e.target.value === "" ? null : Number(e.target.value) })}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>{t("referral.cancel")}</Button>
            <Button onClick={saveRewardSettings} disabled={savingSettings}>
              {savingSettings ? t("referral.saving") : t("referral.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

