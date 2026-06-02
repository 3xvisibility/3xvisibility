import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Clock, FileText, Globe, CalendarClock, AlertTriangle, RotateCcw, Languages, Zap } from "lucide-react";
import { SITE_LANGUAGE_OPTIONS } from "@/components/websites/WebsiteLanguageSelect";
import { detectTextLanguage, compareWithSiteLanguage } from "@/lib/detect-text-language";
import { ShopifyTemplateSuffixPicker } from "@/components/campaigns/ShopifyTemplateSuffixPicker";
import { useSubscription } from "@/hooks/use-subscription";

interface StartGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalRows: number;
  failedRowsCount: number;
  onStart: (options: GenerationOptions) => void;
  isPending: boolean;
  /** Currently locked site language (from connected website). Shown as the default. */
  siteLanguage?: string | null;
  /** When true, the connected website language is locked and per-run overrides are disabled. */
  siteLanguageLocked?: boolean;
  /**
   * Combined sample text (template + a few CSV rows) used to warn the user when
   * the source content language doesn't match the connected site language.
   */
  languageSampleText?: string;
  /** Connected website ID — used to fetch Shopify templates if applicable. */
  websiteId?: string | null;
  /** Website type (shopify | wordpress | etc.) — controls Shopify-only UI. */
  websiteType?: string | null;
  /** Persisted Shopify page template suffix from the campaign. */
  initialPageTemplateSuffix?: string | null;
  /** Persisted Shopify product template suffix from the campaign. */
  initialProductTemplateSuffix?: string | null;
}

export interface GenerationOptions {
  publish_mode: "draft" | "publish";
  max_rows?: number;
  scheduled_at?: string;
  retry_failed_only?: boolean;
  /** One-time override for this run only — does NOT persist to the website settings. */
  language_override?: string;
  /** Shopify alternate page template suffix (templates/page.<suffix>). */
  shopify_page_template_suffix?: string;
  /** Shopify alternate product template suffix (templates/product.<suffix>). */
  shopify_product_template_suffix?: string;
}

export function StartGenerationDialog({
  open,
  onOpenChange,
  totalRows,
  failedRowsCount,
  onStart,
  isPending,
  siteLanguage,
  siteLanguageLocked = false,
  languageSampleText,
  websiteId,
  websiteType,
  initialPageTemplateSuffix,
  initialProductTemplateSuffix,
}: StartGenerationDialogProps) {
  const [publishMode, setPublishMode] = useState<"draft" | "publish">("draft");
  const [maxRowsEnabled, setMaxRowsEnabled] = useState(false);
  const [maxRows, setMaxRows] = useState(totalRows);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [retryFailedOnly, setRetryFailedOnly] = useState(false);
  const [languageOverrideEnabled, setLanguageOverrideEnabled] = useState(false);
  const [languageOverride, setLanguageOverride] = useState<string>("English");
  const [shopifyPageSuffix, setShopifyPageSuffix] = useState<string>(initialPageTemplateSuffix || "");
  const [shopifyProductSuffix, setShopifyProductSuffix] = useState<string>(initialProductTemplateSuffix || "");

  const effectiveRows = retryFailedOnly
    ? failedRowsCount
    : maxRowsEnabled
    ? Math.min(maxRows, totalRows)
    : totalRows;

  const siteLangLabel = siteLanguage && siteLanguage.trim().length > 0 ? siteLanguage : "Auto-detect";

  // Detect language of template + CSV sample and compare against the
  // language we'll actually generate in (override if set, else site lang).
  const effectiveTargetLang = (languageOverrideEnabled && !siteLanguageLocked) ? languageOverride : siteLanguage;
  const detection = languageSampleText ? detectTextLanguage(languageSampleText) : null;
  const mismatchInfo = detection?.language
    ? compareWithSiteLanguage(detection.language, effectiveTargetLang)
    : null;
  const showMismatch = !!mismatchInfo?.mismatch && (detection?.confidence ?? 0) >= 0.4;

  const handleStart = () => {
    const options: GenerationOptions = {
      publish_mode: publishMode,
    };
    if (maxRowsEnabled && maxRows > 0 && maxRows < totalRows) {
      options.max_rows = maxRows;
    }
    if (scheduleMode === "later" && scheduledAt) {
      options.scheduled_at = new Date(scheduledAt).toISOString();
    }
    if (retryFailedOnly) {
      options.retry_failed_only = true;
    }
    if (languageOverrideEnabled && languageOverride && !siteLanguageLocked) {
      options.language_override = languageOverride;
    }
    if (websiteType === "shopify") {
      const p = (shopifyPageSuffix || "").trim();
      const pr = (shopifyProductSuffix || "").trim();
      if (p) options.shopify_page_template_suffix = p;
      if (pr) options.shopify_product_template_suffix = pr;
    }
    onStart(options);
  };

  const isScheduledValid = scheduleMode === "now" || (scheduleMode === "later" && scheduledAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Start Generation
          </DialogTitle>
          <DialogDescription>
            Configure generation options before launching. {totalRows} rows available to process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Language mismatch warning — fires when template/CSV are obviously
              in a different language than the locked site / run language. */}
          {showMismatch && mismatchInfo && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-warning/30 bg-warning/10 dark:bg-warning/5">
              <Languages className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">Language mismatch detected</p>
                <p className="text-xs text-muted-foreground">
                  Your template and CSV look like{" "}
                  <span className="font-medium text-foreground">{mismatchInfo.detected}</span>, but
                  pages will be generated in{" "}
                  <span className="font-medium text-foreground">{mismatchInfo.siteLanguage}</span>
                  {languageOverrideEnabled ? " (run override)" : " (site language)"}.
                  AI will translate the source content — review the first few pages to confirm.
                </p>
              </div>
            </div>
          )}

          {/* Retry failed rows toggle */}
          {failedRowsCount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-destructive/20 bg-destructive/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Retry failed rows only</p>
                  <p className="text-xs text-muted-foreground">{failedRowsCount} failed row{failedRowsCount !== 1 ? "s" : ""} from previous run</p>
                </div>
              </div>
              <Switch checked={retryFailedOnly} onCheckedChange={setRetryFailedOnly} />
            </div>
          )}

          <Separator />

          {/* Publish Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Page Status</Label>
            <RadioGroup value={publishMode} onValueChange={(v) => setPublishMode(v as "draft" | "publish")} className="grid grid-cols-2 gap-3">
              <Label
                htmlFor="mode-draft"
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  publishMode === "draft" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <RadioGroupItem value="draft" id="mode-draft" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">Draft</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pages saved as drafts, review before publishing</p>
                </div>
              </Label>
              <Label
                htmlFor="mode-publish"
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  publishMode === "publish" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <RadioGroupItem value="publish" id="mode-publish" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium">Published</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pages published immediately to CMS</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <Separator />

          {/* Max Rows */}
          {!retryFailedOnly && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Limit rows to process</Label>
                <Switch checked={maxRowsEnabled} onCheckedChange={setMaxRowsEnabled} />
              </div>
              {maxRowsEnabled && (
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={totalRows}
                    value={maxRows}
                    onChange={(e) => setMaxRows(parseInt(e.target.value) || 1)}
                    className="w-32 tabular-nums"
                  />
                  <span className="text-xs text-muted-foreground">of {totalRows} total rows</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Language Override (this run only) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-semibold">Override site language</Label>
                  <p className="text-[11px] text-muted-foreground">
                    {siteLanguageLocked ? (
                      <>Locked to <span className="font-medium text-foreground">{siteLangLabel}</span> — unlock in website settings to override.</>
                    ) : (
                      <>This run only — site stays locked to <span className="font-medium text-foreground">{siteLangLabel}</span></>
                    )}
                  </p>
                </div>
              </div>
              <Switch
                checked={languageOverrideEnabled && !siteLanguageLocked}
                onCheckedChange={setLanguageOverrideEnabled}
                disabled={siteLanguageLocked}
              />
            </div>
            {languageOverrideEnabled && !siteLanguageLocked && (
              <Select value={languageOverride} onValueChange={setLanguageOverride}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a language for this run" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {SITE_LANGUAGE_OPTIONS.filter((o) => o.value !== "__auto__").map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {websiteType === "shopify" && websiteId && (
            <>
              <Separator />
              <ShopifyTemplateSuffixPicker
                websiteId={websiteId}
                websiteType={websiteType}
                pageValue={shopifyPageSuffix}
                productValue={shopifyProductSuffix}
                onChange={({ page, product }) => {
                  setShopifyPageSuffix(page);
                  setShopifyProductSuffix(product);
                }}
              />
            </>
          )}

          <Separator />

          {/* Schedule */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Schedule</Label>
            <RadioGroup value={scheduleMode} onValueChange={(v) => setScheduleMode(v as "now" | "later")} className="space-y-2">
              <Label
                htmlFor="schedule-now"
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  scheduleMode === "now" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <RadioGroupItem value="now" id="schedule-now" />
                <div className="flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-medium">Run now</span>
                </div>
              </Label>
              <Label
                htmlFor="schedule-later"
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  scheduleMode === "later" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <RadioGroupItem value="later" id="schedule-later" />
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Schedule for later</span>
                </div>
              </Label>
            </RadioGroup>
            {scheduleMode === "later" && (
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full"
              />
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {retryFailedOnly ? (
              <>Will retry <span className="text-foreground font-medium">{failedRowsCount}</span> failed row{failedRowsCount !== 1 ? "s" : ""}</>
            ) : (
              <>Will process <span className="text-foreground font-medium">{effectiveRows}</span> row{effectiveRows !== 1 ? "s" : ""}</>
            )}
            {" "}as <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{publishMode}</Badge>
            {languageOverrideEnabled && (
              <> in <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1"><Languages className="h-2.5 w-2.5" />{languageOverride}</Badge></>
            )}
            {scheduleMode === "later" && scheduledAt && (
              <> — scheduled for {new Date(scheduledAt).toLocaleString()}</>
            )}
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleStart}
            disabled={isPending || !isScheduledValid}
            className="bg-gradient-primary hover:brightness-110 gap-2"
          >
            {retryFailedOnly ? (
              <><RotateCcw className="h-4 w-4" /> {isPending ? "Retrying..." : "Retry Failed Rows"}</>
            ) : scheduleMode === "later" ? (
              <><CalendarClock className="h-4 w-4" /> {isPending ? "Scheduling..." : "Schedule"}</>
            ) : (
              <><Play className="h-4 w-4" /> {isPending ? "Starting..." : "Start Generation"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
