import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TrendingUp, Link2, KeyRound, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Seo } from "@/components/Seo";

interface Overview {
  domain: string;
  organic_keywords: number;
  organic_traffic: number;
  authority_score: number;
  backlinks: number;
  referring_domains: number;
  top_keywords: {
    keyword: string;
    position: number;
    previous_position: number;
    search_volume: number;
    cpc: number;
    url: string;
  }[];
  competitors: {
    domain: string;
    competitor_relevance: number;
    common_keywords: number;
    organic_keywords: number;
    organic_traffic: number;
  }[];
}

const DATABASES = ["us", "uk", "de", "fr", "es", "it", "nl", "ca", "au"];

export default function DomainAnalysisPage() {
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [database, setDatabase] = useState("us");
  const [result, setResult] = useState<Overview | null>(null);

  const analyze = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("semrush-seo", {
        body: { action: "domain_overview", domain, database },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as Overview;
    },
    onSuccess: (data) => setResult(data),
    onError: (e: Error) =>
      toast({ title: "Could not load SEO data", description: e.message, variant: "destructive" }),
  });

  const stats = result
    ? [
        { label: "Authority score", value: result.authority_score, icon: TrendingUp },
        { label: "Organic keywords", value: result.organic_keywords.toLocaleString(), icon: KeyRound },
        { label: "Monthly organic traffic", value: result.organic_traffic.toLocaleString(), icon: Users },
        { label: "Backlinks", value: result.backlinks.toLocaleString(), icon: Link2 },
      ]
    : [];

  return (
    <>
      <Seo
        title="Domain Analysis — Live SEO data | 3XVISIBILITY"
        path="/domain-analysis"
        description="Check any domain's authority, organic keywords, estimated traffic, backlinks and top competitors with live search data."
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Domain Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Live search data for any domain — authority, keywords, traffic, backlinks and rivals.
          </p>
        </div>

        <Card className="shadow-surface">
          <CardContent className="p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Label className="text-xs">Domain</Label>
              <Input
                value={domain}
                placeholder="example.com"
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && domain.trim() && analyze.mutate()}
              />
            </div>
            <div className="w-full sm:w-32">
              <Label className="text-xs">Market</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              >
                {DATABASES.map((d) => (
                  <option key={d} value={d}>
                    {d.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <Button disabled={!domain.trim() || analyze.isPending} onClick={() => analyze.mutate()}>
              <Search className="h-4 w-4 mr-1" />
              {analyze.isPending ? "Checking…" : "Analyze"}
            </Button>
          </CardContent>
        </Card>

        {analyze.isPending && <Skeleton className="h-40 w-full" />}

        {result && !analyze.isPending && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <Card key={s.label} className="shadow-surface">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <s.icon className="h-3.5 w-3.5 text-primary" />
                      {s.label}
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-1">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-3">
                <h2 className="text-sm font-semibold">Top ranking keywords</h2>
                {result.top_keywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ranking keywords found for this domain yet.</p>
                ) : (
                  <div className="overflow-x-auto" data-no-autotranslate>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Keyword</TableHead>
                          <TableHead className="text-xs text-right">Position</TableHead>
                          <TableHead className="text-xs text-right">Volume</TableHead>
                          <TableHead className="text-xs text-right">CPC</TableHead>
                          <TableHead className="text-xs">Page</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.top_keywords.map((k) => (
                          <TableRow key={k.keyword}>
                            <TableCell className="text-xs font-medium">{k.keyword}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{k.position}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              {k.search_volume.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{k.cpc.toFixed(2)}</TableCell>
                            <TableCell className="text-xs truncate max-w-[220px]">{k.url}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-3">
                <h2 className="text-sm font-semibold">Main competitors</h2>
                {result.competitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No competing domains found yet.</p>
                ) : (
                  <div className="overflow-x-auto" data-no-autotranslate>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Domain</TableHead>
                          <TableHead className="text-xs text-right">Shared keywords</TableHead>
                          <TableHead className="text-xs text-right">Keywords</TableHead>
                          <TableHead className="text-xs text-right">Traffic</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.competitors.map((c) => (
                          <TableRow key={c.domain}>
                            <TableCell className="text-xs font-medium">{c.domain}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              {c.common_keywords.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              {c.organic_keywords.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-right tabular-nums">
                              {c.organic_traffic.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <Badge variant="outline" className="text-[10px]">Source: Semrush</Badge>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
