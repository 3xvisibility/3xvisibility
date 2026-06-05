import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User as UserIcon,
  Mail,
  CreditCard,
  Rocket,
  FileText,
  Globe,
  Zap,
  Receipt,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface UserDetailDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-success/10 text-success border-success/20",
    published: "bg-success/10 text-success border-success/20",
    paid: "bg-success/10 text-success border-success/20",
    processing: "bg-primary/10 text-primary border-primary/20",
    queued: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    draft: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={map[status] || ""}>{status}</Badge>;
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function UserDetailDialog({ userId, open, onOpenChange }: UserDetailDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "get-user-detail", target_user_id: userId },
      });
      if (error) throw error;
      return data as any;
    },
  });

  const u = data?.user;
  const profile = data?.profile;
  const sub = data?.subscription;
  const credits = data?.credits;
  const totals = data?.totals || {};
  const campaigns = data?.campaigns || [];
  const pages = data?.pages || [];
  const websites = data?.websites || [];
  const payments = data?.payments || [];
  const stripeCustomer = data?.stripe_customer;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] lg:w-[90vw] max-w-[1600px] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            {isLoading ? "Loading user…" : profile?.full_name || u?.email || "User details"}
          </DialogTitle>
          <DialogDescription>
            Complete 360° view of this user — profile, subscription, payments, campaigns and activity.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-5 space-y-5">
              {/* Identity */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{profile?.full_name || "—"}</span>
                    <Badge variant="outline" className="capitalize border-primary/40 text-primary">{data?.role}</Badge>
                    {profile?.is_banned && <Badge variant="destructive">Banned</Badge>}
                  </div>
                  <button onClick={() => copy(u?.email || "")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" /> {u?.email} <Copy className="h-3 w-3" />
                  </button>
                  <button onClick={() => copy(u?.id || "")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono">
                    ID: {u?.id} <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5 sm:text-right">
                  <p>Joined {fmtDate(u?.created_at)}</p>
                  <p>Last active {fmtDate(u?.last_sign_in_at)}</p>
                  {profile?.company && <p>Company: {profile.company}</p>}
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniStat label="Campaigns" value={totals.campaigns ?? 0} icon={Rocket} />
                <MiniStat label="Pages" value={totals.pages ?? 0} icon={FileText} />
                <MiniStat label="Websites" value={totals.websites ?? 0} icon={Globe} />
                <MiniStat label="Credits left" value={credits?.remaining_credits ?? "—"} icon={Zap} />
              </div>

              {/* Subscription & billing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Subscription
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Plan</span>
                      <Badge variant="outline" className="capitalize">{sub?.plan || "free"}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pages used</span>
                      <span className="tabular-nums">{sub?.pages_used ?? 0} / {sub?.pages_limit || "∞"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Period ends</span>
                      <span>{fmtDate(sub?.current_period_end || null)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">AI credits</span>
                      <span className="tabular-nums">{credits ? `${credits.remaining_credits} / ${credits.total_credits}` : "—"}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" /> Billing (Stripe)
                    </p>
                    {stripeCustomer ? (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Customer</span>
                          <span className="font-mono text-xs">{stripeCustomer.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Invoices</span>
                          <span className="tabular-nums">{payments.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total paid</span>
                          <span className="tabular-nums">
                            {payments.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.amount || 0), 0).toFixed(2)}{" "}
                            {payments[0]?.currency || "USD"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No Stripe customer / payment records found.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detail tabs */}
              <Tabs defaultValue="campaigns">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="campaigns" className="text-xs">Campaigns ({campaigns.length})</TabsTrigger>
                  <TabsTrigger value="pages" className="text-xs">Pages ({pages.length})</TabsTrigger>
                  <TabsTrigger value="websites" className="text-xs">Websites ({websites.length})</TabsTrigger>
                  <TabsTrigger value="payments" className="text-xs">Payments ({payments.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="campaigns" className="mt-3">
                  <div className="rounded-lg border overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Progress</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No campaigns</TableCell></TableRow>
                        ) : campaigns.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm font-medium">{c.name}</TableCell>
                            <TableCell>{statusBadge(c.status)}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{c.processed_rows ?? 0} / {c.total_rows ?? 0}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="pages" className="mt-3">
                  <div className="rounded-lg border overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pages.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No pages</TableCell></TableRow>
                        ) : pages.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-medium max-w-xs truncate">{p.title}</TableCell>
                            <TableCell>{statusBadge(p.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="websites" className="mt-3">
                  <div className="rounded-lg border overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name / URL</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {websites.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No websites</TableCell></TableRow>
                        ) : websites.map((w: any) => (
                          <TableRow key={w.id}>
                            <TableCell className="text-sm font-medium max-w-xs truncate">{w.name || w.url || w.domain || "—"}</TableCell>
                            <TableCell className="text-sm">{w.type || "—"}</TableCell>
                            <TableCell>{statusBadge(w.status || "—")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-3">
                  <div className="rounded-lg border overflow-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No payment records</TableCell></TableRow>
                        ) : payments.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm font-mono">{p.number || p.id}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{p.amount?.toFixed(2)} {p.currency}</TableCell>
                            <TableCell>{statusBadge(p.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(p.created)}</TableCell>
                            <TableCell>
                              {p.hosted_invoice_url && (
                                <a href={p.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
