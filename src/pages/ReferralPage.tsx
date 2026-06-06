import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  subscription_plan: string | null;
  converted_at: string | null;
  created_at: string;
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
        .select("id,status,commission_amount,subscription_plan,converted_at,created_at")
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

    setLoading(false);
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
                <p className="text-2xl font-bold text-primary">5%</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{t("referral.commission")}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                <p className="text-2xl font-bold text-primary">$25</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

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
                <div className="space-y-1 pb-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">{item.title}</h3>
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
    </div>
  );
}
