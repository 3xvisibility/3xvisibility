import { useState, useEffect, useMemo } from "react";
import heroDashboard from "@/assets/hero-dashboard.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, Sparkles, Eye, EyeOff, Sun, Moon, Globe, Check, X, Building2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const ease = [0.22, 1, 0.36, 1] as const;

const SIGNUP_PW_RULES = [
  { key: "minLength", test: (p: string) => p.length >= 8, label: "auth.pwRuleMinLength" },
  { key: "uppercase", test: (p: string) => /[A-Z]/.test(p), label: "auth.pwRuleUppercase" },
  { key: "lowercase", test: (p: string) => /[a-z]/.test(p), label: "auth.pwRuleLowercase" },
  { key: "number", test: (p: string) => /[0-9]/.test(p), label: "auth.pwRuleNumber" },
  { key: "special", test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "auth.pwRuleSpecial" },
];

const AI_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Português" },
  { value: "it", label: "Italiano" },
  { value: "nl", label: "Nederlands" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
];

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem("rememberedEmail") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("rememberMe") === "true");
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [aiLanguage, setAiLanguage] = useState("en");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const signupRuleResults = useMemo(
    () => SIGNUP_PW_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const signupPassedCount = signupRuleResults.filter((r) => r.passed).length;
  const allSignupRulesPassed = signupRuleResults.every((r) => r.passed);
  const signupPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showEmailError = mode === "signup" && email.length > 0 && !isValidEmail;
  const canSignup = allSignupRulesPassed && signupPasswordsMatch && isValidEmail;
  const signupStrength: "none" | "weak" | "medium" | "strong" =
    password.length === 0 ? "none" : signupPassedCount <= 2 ? "weak" : signupPassedCount <= 4 ? "medium" : "strong";
  const signupStrengthConfig = {
    none: { width: "0%", color: "bg-muted", label: "" },
    weak: { width: "33%", color: "bg-destructive", label: t("auth.strengthWeak") },
    medium: { width: "66%", color: "bg-yellow-500", label: t("auth.strengthMedium") },
    strong: { width: "100%", color: "bg-green-500", label: t("auth.strengthStrong") },
  };

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const mapAuthError = (errorMessage: string): { title: string; description: string } => {
    const msg = errorMessage.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
      return { title: t("auth.loginFailed"), description: t("auth.errorInvalidCredentials") };
    }
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return { title: t("auth.loginFailed"), description: t("auth.errorEmailNotVerified") };
    }
    if (msg.includes("too many requests") || msg.includes("rate limit")) {
      return { title: t("auth.loginFailed"), description: t("auth.errorTooManyAttempts") };
    }
    if (msg.includes("user not found")) {
      return { title: t("auth.loginFailed"), description: t("auth.errorInvalidCredentials") };
    }
    return { title: t("auth.loginFailed"), description: errorMessage };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Persist remember-me preference
    localStorage.setItem("rememberMe", String(rememberMe));
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const mapped = mapAuthError(error.message);
      toast({ title: mapped.title, description: mapped.description, variant: "destructive" });
    } else {
      // When "Remember me" is unchecked, sign out on tab/browser close
      if (!rememberMe) {
        localStorage.setItem("sessionEphemeral", "true");
      } else {
        localStorage.removeItem("sessionEphemeral");
      }
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSignup) {
      toast({ title: t("auth.signupFailed"), description: !allSignupRulesPassed ? t("auth.passwordTooWeak") : t("auth.passwordsMismatch"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, ai_language: aiLanguage },
      },
    });
    if (error) {
      setLoading(false);
      toast({ title: t("auth.signupFailed"), description: error.message, variant: "destructive" });
      return;
    }
    // Save AI language preference to profile
    if (data.user) {
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        full_name: fullName,
        ai_language: aiLanguage,
      }, { onConflict: "user_id" });
    }
    setLoading(false);
    toast({ title: t("auth.checkEmail"), description: t("auth.confirmationSent") });
  };

  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setTimeout(() => setResetCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resetCooldown]);

  const handleResetPassword = async () => {
    if (!email) {
      toast({ title: t("auth.enterEmail"), description: t("auth.enterEmailDesc"), variant: "destructive" });
      return;
    }
    if (resetCooldown > 0) {
      toast({
        title: t("auth.rateLimited"),
        description: t("auth.rateLimitedDesc").replace("{seconds}", String(resetCooldown)),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setResetCooldown(60);
      toast({ title: t("auth.resetSent"), description: t("auth.resetSentDesc") });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result?.error) {
      toast({ title: t("auth.googleFailed"), description: String(result.error), variant: "destructive" });
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result?.error) {
      toast({ title: t("auth.appleFailed"), description: String(result.error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen relative flex overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[600px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/.12),transparent)] pointer-events-none" />
      
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Main content - two column layout */}
      <div className="relative z-10 flex flex-col w-full">
        {/* Header */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="px-6 py-4 md:px-10 md:py-6 flex items-center justify-between"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="font-medium">{t("auth.home")}</span>
            <span className="text-border">/</span>
            <span className="text-foreground/70">{mode === "login" ? t("auth.signIn") : t("auth.signUp")}</span>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher variant="ghost" size="icon" />
            <button
              onClick={toggleDarkMode}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </motion.nav>

        {/* Two-column content */}
        <div className="flex-1 flex items-center px-4 pb-12">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* LEFT: Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease }}
              className="w-full max-w-[420px] mx-auto lg:mx-0"
            >
              {/* Logo / Brand */}
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.15, ease }}
                  className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5"
                >
                  <Sparkles className="h-6 w-6 text-primary" />
                </motion.div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">
                  {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {mode === "login" ? t("auth.signInDesc") : t("auth.signUpDesc")}
                </p>
              </div>

              {/* Card */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5 p-6 md:p-8">
                {/* Mode toggle */}
                <div className="flex rounded-xl bg-muted/60 p-1 mb-6">
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setConfirmPassword(""); }}
                      className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-all duration-200 ${
                        mode === m
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground/70"
                      }`}
                    >
                      {m === "login" ? t("auth.signIn") : t("auth.signUp")}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.form
                    key={mode}
                    initial={{ opacity: 0, x: mode === "login" ? -10 : 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: mode === "login" ? 10 : -10 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={mode === "login" ? handleLogin : handleSignup}
                    className="space-y-4"
                  >
                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-name" className="text-xs font-medium text-muted-foreground">
                          {t("auth.fullName")}
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            id="signup-name"
                            placeholder={t("auth.fullNamePlaceholder")}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="pl-10 h-11 bg-background/50 border-border/60 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="auth-email" className="text-xs font-medium text-muted-foreground">
                        {t("auth.email")}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          id="auth-email"
                          type="email"
                          placeholder={t("auth.emailPlaceholder")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10 h-11 bg-background/50 border-border/60 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all"
                        />
                      </div>
                      {showEmailError && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {t("auth.invalidEmail")}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auth-pass" className="text-xs font-medium text-muted-foreground">
                        {t("auth.password")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          id="auth-pass"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="pl-10 pr-10 h-11 bg-background/50 border-border/60 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password strength meter - signup only */}
                    {mode === "signup" && password.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">{t("auth.passwordStrength")}</span>
                            <span className={`text-[11px] font-medium ${
                              signupStrength === "weak" ? "text-destructive" :
                              signupStrength === "medium" ? "text-yellow-500" :
                              "text-green-500"
                            }`}>
                              {signupStrengthConfig[signupStrength].label}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${signupStrengthConfig[signupStrength].color}`}
                              style={{ width: signupStrengthConfig[signupStrength].width }}
                            />
                          </div>
                        </div>
                        <ul className="space-y-0.5 text-[11px]">
                          {signupRuleResults.map((r) => (
                            <li key={r.key} className="flex items-center gap-1.5">
                              {r.passed ? (
                                <Check className="h-3 w-3 text-green-500 shrink-0" />
                              ) : (
                                <X className="h-3 w-3 text-destructive shrink-0" />
                              )}
                              <span className={r.passed ? "text-muted-foreground" : "text-foreground"}>
                                {t(r.label)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Confirm password - signup only */}
                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="auth-confirm-pass" className="text-xs font-medium text-muted-foreground">
                          {t("auth.confirmPassword")}
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                          <Input
                            id="auth-confirm-pass"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="pl-10 pr-10 h-11 bg-background/50 border-border/60 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPassword.length > 0 && !signupPasswordsMatch && (
                          <p className="text-[11px] text-destructive flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {t("auth.passwordsMismatch")}
                          </p>
                        )}
                        {signupPasswordsMatch && (
                          <p className="text-[11px] text-green-500 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {t("auth.passwordsMatch")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* AI Content Language preference - signup only */}
                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5" />
                          {t("auth.contentLanguage")}
                        </Label>
                        <Select value={aiLanguage} onValueChange={setAiLanguage}>
                          <SelectTrigger className="h-11 bg-background/50 border-border/60 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AI_LANGUAGE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground/60">{t("auth.contentLanguageDesc")}</p>
                      </div>
                    )}

                    {mode === "login" && (
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-border/60 text-primary focus:ring-primary/20 accent-primary"
                          />
                          <span className="text-xs text-muted-foreground">{t("auth.rememberMe")}</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          {t("auth.forgotPassword")}
                        </button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || (mode === "signup" && !canSignup)}
                      className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm transition-all duration-200 active:scale-[0.98] shadow-lg shadow-foreground/10"
                    >
                      {loading
                        ? mode === "login"
                          ? t("auth.signingIn")
                          : t("auth.creatingAccount")
                        : mode === "login"
                          ? t("auth.signIn")
                          : t("auth.createAccount")}
                    </Button>
                  </motion.form>
                </AnimatePresence>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/40" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-card/80 px-3 text-muted-foreground/50 font-medium">{t("auth.orContinueWith")}</span>
                  </div>
                </div>

                {/* Social OAuth buttons */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="flex-1 h-11 rounded-xl border-border/60 bg-background/50 hover:bg-accent/50 font-medium text-sm transition-all duration-200 active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAppleSignIn}
                    disabled={loading}
                    className="flex-1 h-11 rounded-xl border-border/60 bg-background/50 hover:bg-accent/50 font-medium text-sm transition-all duration-200 active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                    Apple
                  </Button>
                </div>

                {/* Switch mode prompt */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                  {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
                  <button
                    onClick={() => { setMode(mode === "login" ? "signup" : "login"); setConfirmPassword(""); }}
                    className="text-primary font-semibold hover:text-primary/80 transition-colors"
                  >
                    {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
                  </button>
                </p>
              </div>

              {/* Footer */}
              <p className="text-center text-[11px] text-muted-foreground/40 mt-6">
                {t("auth.terms")}
              </p>
            </motion.div>

            {/* RIGHT: Illustration / Platform preview */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease }}
              className="hidden lg:flex flex-col items-center justify-center"
            >
              <div className="relative w-full max-w-[520px]">
                {/* Decorative glow */}
                <div className="absolute -inset-8 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 rounded-3xl blur-2xl" />
                
                {/* Screenshot card */}
                <div className="relative rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm shadow-2xl shadow-primary/10 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/30 bg-muted/30">
                    <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                    <span className="text-[10px] text-muted-foreground/50 ml-2 font-mono">pagegen.app/dashboard</span>
                  </div>
                  <img
                    src={heroDashboard}
                    alt="Platform dashboard preview"
                    className="w-full"
                    loading="lazy"
                  />
                </div>

                {/* Floating feature badges */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7, ease }}
                  className="absolute -bottom-4 -left-4 rounded-xl border border-border/50 bg-card/90 backdrop-blur-sm shadow-lg px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-success/15 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">AI-Powered</p>
                      <p className="text-[10px] text-muted-foreground">Smart content generation</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9, ease }}
                  className="absolute -top-3 -right-3 rounded-xl border border-border/50 bg-card/90 backdrop-blur-sm shadow-lg px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Multi-Platform</p>
                      <p className="text-[10px] text-muted-foreground">WP, Shopify, PrestaShop</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
