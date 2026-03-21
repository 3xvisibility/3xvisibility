import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Check, X, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const PASSWORD_RULES = [
  { key: "minLength", test: (p: string) => p.length >= 8, label: "auth.pwRuleMinLength" },
  { key: "uppercase", test: (p: string) => /[A-Z]/.test(p), label: "auth.pwRuleUppercase" },
  { key: "lowercase", test: (p: string) => /[a-z]/.test(p), label: "auth.pwRuleLowercase" },
  { key: "number", test: (p: string) => /[0-9]/.test(p), label: "auth.pwRuleNumber" },
  { key: "special", test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "auth.pwRuleSpecial" },
];

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Detect recovery event from the URL hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setChecking(false);
      }
    });

    // Also check the URL hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    setChecking(false);

    return () => subscription.unsubscribe();
  }, []);

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );

  const passedCount = ruleResults.filter((r) => r.passed).length;
  const strength: "none" | "weak" | "medium" | "strong" =
    password.length === 0
      ? "none"
      : passedCount <= 2
        ? "weak"
        : passedCount <= 4
          ? "medium"
          : "strong";

  const strengthConfig = {
    none: { width: "0%", color: "bg-muted", label: "" },
    weak: { width: "33%", color: "bg-destructive", label: t("auth.strengthWeak") },
    medium: { width: "66%", color: "bg-yellow-500", label: t("auth.strengthMedium") },
    strong: { width: "100%", color: "bg-green-500", label: t("auth.strengthStrong") },
  };

  const allPassed = ruleResults.every((r) => r.passed);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allPassed && passwordsMatch && !loading;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: t("auth.resetFailed"), description: error.message, variant: "destructive" });
      return;
    }

    // Log the password reset in the audit log
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Find user's workspace for audit logging
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (membership) {
          await supabase.from("audit_logs").insert({
            workspace_id: membership.workspace_id,
            user_id: user.id,
            action: "password_reset",
            entity_type: "user",
            entity_id: user.id,
            details: { method: "email_link" },
          });
        }
      }
    } catch {
      // Audit logging is best-effort
    }

    toast({ title: t("auth.passwordUpdated"), description: t("auth.passwordUpdatedDesc") });
    navigate("/auth");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold text-foreground">{t("auth.invalidResetLink")}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {t("auth.invalidResetLinkDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              {t("auth.backToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[600px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/.10),transparent)] pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground">{t("auth.setNewPassword")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("auth.setNewPasswordDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-5">
            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="new-pass" className="text-foreground">{t("auth.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="new-pass"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Strength meter + rules */}
            {password.length > 0 && (
              <div className="space-y-3">
                {/* Strength bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t("auth.passwordStrength")}</span>
                    <span className={`text-xs font-medium ${
                      strength === "weak" ? "text-destructive" :
                      strength === "medium" ? "text-yellow-500" :
                      "text-green-500"
                    }`}>
                      {strengthConfig[strength].label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strengthConfig[strength].color}`}
                      style={{ width: strengthConfig[strength].width }}
                    />
                  </div>
                </div>

                {/* Rules checklist */}
                <ul className="space-y-1 text-xs">
                  {ruleResults.map((r) => (
                    <li key={r.key} className="flex items-center gap-1.5">
                      {r.passed ? (
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                      <span className={r.passed ? "text-muted-foreground" : "text-foreground"}>
                        {t(r.label)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pass" className="text-foreground">{t("auth.confirmPassword")}</Label>
              <div className="relative">
                <Input
                  id="confirm-pass"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <X className="h-3.5 w-3.5" />
                  {t("auth.passwordsMismatch")}
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <Check className="h-3.5 w-3.5" />
                  {t("auth.passwordsMatch")}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {loading ? t("auth.updating") : t("auth.updatePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
