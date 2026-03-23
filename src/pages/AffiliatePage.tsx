import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Link2, Copy, DollarSign, Users, MousePointerClick, TrendingUp,
  ArrowUpRight, Gift, CreditCard, Clock, CheckCircle2, XCircle,
  BarChart3, Share2
} from "lucide-react";
import { format } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

interface AffiliateLink {
  id: string;
  code: string;
  commission_rate: number;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
  total_credited: number;
  pending_balance: number;
  is_active: boolean;
  created_at: string;
}

interface Referral {
  id: string;
  status: string;
  commission_amount: number;
  subscription_plan: string | null;
  converted_at: string | null;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  type: string;
  status: string;
  processed_at: string | null;
  created_at: string;
}

export default function AffiliatePage() {
  const { t } = useLanguage();
  const { currentWorkspace } = useWorkspace();
  const [link, setLink] = useState<AffiliateLink | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const PAYOUT_THRESHOLD = 25;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load affiliate link
    const { data: links } = await supabase
      .from("affiliate_links")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (links && links.length > 0) {
      const l = links[0] as unknown as AffiliateLink;
      setLink(l);

      // Load referrals
      const { data: refs } = await supabase
        .from("affiliate_referrals")
        .select("*")
        .eq("affiliate_link_id", l.id)
        .order("created_at", { ascending: false });
      setReferrals((refs || []) as unknown as Referral[]);

      // Load payouts
      const { data: pays } = await supabase
        .from("affiliate_payouts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setPayouts((pays || []) as unknown as Payout[]);
    }
    setLoading(false);
  }

  async function createAffiliateLink() {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = `ref_${user.id.substring(0, 8)}_${Date.now().toString(36)}`;
    const { data, error } = await supabase
      .from("affiliate_links")
      .insert({
        user_id: user.id,
        workspace_id: workspace?.id || null,
        code,
        commission_rate: 20,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to create affiliate link");
    } else {
      setLink(data as unknown as AffiliateLink);
      toast.success("Affiliate link created!");
    }
    setCreating(false);
  }

  async function requestPayout() {
    if (!link || link.pending_balance < PAYOUT_THRESHOLD) return;
    setRequestingPayout(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_link_id: link.id,
      user_id: user.id,
      workspace_id: workspace?.id || null,
      amount: link.pending_balance,
      type: "credit",
      status: "pending",
    } as any);

    if (error) {
      toast.error("Failed to request payout");
    } else {
      toast.success(`Credit of $${link.pending_balance.toFixed(2)} requested!`);
      loadData();
    }
    setRequestingPayout(false);
  }

  function copyLink() {
    if (!link) return;
    const url = `${window.location.origin}/?ref=${link.code}`;
    navigator.clipboard.writeText(url);
    toast.success("Affiliate link copied!");
  }

  const affiliateUrl = link ? `${window.location.origin}/?ref=${link.code}` : "";
  const conversionRate = link && link.total_clicks > 0 ? ((link.total_conversions / link.total_clicks) * 100).toFixed(1) : "0";

  // Generate chart data from referrals
  const chartData = useMemo(() => {
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return {
        date: format(d, "MMM dd"),
        earnings: 0,
        conversions: 0,
      };
    });
    referrals.forEach((r) => {
      const day = format(new Date(r.created_at), "MMM dd");
      const entry = last30.find((d) => d.date === day);
      if (entry) {
        entry.earnings += Number(r.commission_amount);
        entry.conversions += 1;
      }
    });
    return last30;
  }, [referrals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("affiliate.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("affiliate.subtitle")}</p>
        </div>
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">{t("affiliate.joinProgram")}</h2>
              <p className="text-muted-foreground max-w-md mx-auto">{t("affiliate.joinDesc")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold text-primary">20%</p>
                <p className="text-xs text-muted-foreground">{t("affiliate.commission")}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold text-primary">${PAYOUT_THRESHOLD}</p>
                <p className="text-xs text-muted-foreground">{t("affiliate.minPayout")}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold text-primary">∞</p>
                <p className="text-xs text-muted-foreground">{t("affiliate.noLimit")}</p>
              </div>
            </div>
            <Button onClick={createAffiliateLink} disabled={creating} size="lg">
              <Link2 className="mr-2 h-4 w-4" />
              {creating ? "Creating..." : t("affiliate.createLink")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("affiliate.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("affiliate.subtitle")}</p>
        </div>
        <Button onClick={requestPayout} disabled={requestingPayout || link.pending_balance < PAYOUT_THRESHOLD} variant="outline">
          <CreditCard className="mr-2 h-4 w-4" />
          {t("affiliate.requestPayout")}
        </Button>
      </div>

      {/* Affiliate Link Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("affiliate.yourLink")}</label>
              <div className="flex gap-2">
                <Input value={affiliateUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: "Join PageGen", url: affiliateUrl });
                  } else {
                    copyLink();
                  }
                }}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-end">
              <Badge variant={link.is_active ? "default" : "secondary"} className="h-8">
                {link.is_active ? t("affiliate.active") : t("affiliate.inactive")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MousePointerClick className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{link.total_clicks}</p>
                <p className="text-xs text-muted-foreground">{t("affiliate.totalClicks")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{link.total_conversions}</p>
                <p className="text-xs text-muted-foreground">{t("affiliate.conversions")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${Number(link.total_earned).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{t("affiliate.totalEarned")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">{t("affiliate.conversionRate")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Balance */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("affiliate.pendingBalance")}</p>
              <p className="text-3xl font-bold">${Number(link.pending_balance).toFixed(2)}</p>
            </div>
            <div className="space-y-1 w-full sm:w-64">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("affiliate.payoutProgress")}</span>
                <span>${Number(link.pending_balance).toFixed(2)} / ${PAYOUT_THRESHOLD}</span>
              </div>
              <Progress value={Math.min((Number(link.pending_balance) / PAYOUT_THRESHOLD) * 100, 100)} className="h-2" />
              {link.pending_balance < PAYOUT_THRESHOLD && (
                <p className="text-xs text-muted-foreground">
                  ${(PAYOUT_THRESHOLD - Number(link.pending_balance)).toFixed(2)} {t("affiliate.untilPayout")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("affiliate.earningsOverTime")}</CardTitle>
          <CardDescription>{t("affiliate.last30Days")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" fill="url(#colorEarnings)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Referrals & Payouts */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">{t("affiliate.referrals")} ({referrals.length})</TabsTrigger>
          <TabsTrigger value="payouts">{t("affiliate.payouts")} ({payouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals">
          <Card>
            <CardContent className="pt-6">
              {referrals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">{t("affiliate.noReferrals")}</p>
                  <p className="text-sm mt-1">{t("affiliate.shareLink")}</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">{t("common.date")}</TableHead>
                        <TableHead className="w-[25%]">{t("common.status")}</TableHead>
                        <TableHead className="w-[25%]">{t("affiliate.plan")}</TableHead>
                        <TableHead className="text-right w-[20%]">{t("affiliate.commission")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((ref) => (
                        <TableRow key={ref.id}>
                          <TableCell className="text-sm">{format(new Date(ref.created_at), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={ref.status === "converted" ? "default" : "secondary"} className="text-xs">
                              {ref.status === "converted" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                              {ref.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{ref.subscription_plan || "—"}</TableCell>
                          <TableCell className="text-right font-medium">${Number(ref.commission_amount).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardContent className="pt-6">
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">{t("affiliate.noPayouts")}</p>
                  <p className="text-sm mt-1">{t("affiliate.earnMore")}</p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">{t("common.date")}</TableHead>
                        <TableHead className="w-[25%]">{t("affiliate.amount")}</TableHead>
                        <TableHead className="w-[25%]">{t("affiliate.type")}</TableHead>
                        <TableHead className="text-right w-[20%]">{t("common.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{format(new Date(p.created_at), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{p.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.status === "completed" ? "default" : p.status === "pending" ? "secondary" : "destructive"} className="text-xs">
                              {p.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("affiliate.howItWorks")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">1</div>
              <div>
                <p className="font-medium text-sm">{t("affiliate.step1Title")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("affiliate.step1Desc")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">2</div>
              <div>
                <p className="font-medium text-sm">{t("affiliate.step2Title")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("affiliate.step2Desc")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">3</div>
              <div>
                <p className="font-medium text-sm">{t("affiliate.step3Title")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("affiliate.step3Desc")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
