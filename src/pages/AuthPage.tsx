import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, Sparkles, Eye, EyeOff } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";

const ease = [0.22, 1, 0.36, 1] as const;

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link." });
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
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
      toast({ title: "Password reset email sent", description: "Check your inbox." });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result?.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen relative flex overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[600px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/.12),transparent)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsl(var(--secondary)/.06)] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-[5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col w-full">
        {/* Breadcrumb header */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="px-6 py-4 md:px-10 md:py-6"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span className="font-medium">Home</span>
            <span className="text-border">/</span>
            <span className="text-foreground/70">{mode === "login" ? "Sign In" : "Sign Up"}</span>
          </Link>
        </motion.nav>

        {/* Center form */}
        <div className="flex-1 flex items-center justify-center px-4 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="w-full max-w-[420px]"
          >
            {/* Logo / Brand */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15, ease }}
                className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5"
              >
                <Sparkles className="h-6 w-6 text-primary" />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {mode === "login"
                  ? "Sign in to access your dashboard"
                  : "Start generating pages in minutes"}
              </p>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5 p-6 md:p-8">
              {/* Mode toggle */}
              <div className="flex rounded-xl bg-muted/60 p-1 mb-6">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 text-sm font-medium py-2.5 rounded-lg transition-all duration-200 ${
                      mode === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground/70"
                    }`}
                  >
                    {m === "login" ? "Sign In" : "Sign Up"}
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
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        <Input
                          id="signup-name"
                          placeholder="John Doe"
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
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        id="auth-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-11 bg-background/50 border-border/60 focus:border-primary/40 focus:ring-primary/20 rounded-xl transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="auth-pass" className="text-xs font-medium text-muted-foreground">
                      Password
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

                  {mode === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-sm transition-all duration-200 active:scale-[0.98] shadow-lg shadow-foreground/10"
                  >
                    {loading
                      ? mode === "login"
                        ? "Signing in..."
                        : "Creating account..."
                      : mode === "login"
                        ? "Sign In"
                        : "Create Account"}
                  </Button>
                </motion.form>
              </AnimatePresence>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-card/80 px-3 text-muted-foreground/50 font-medium">or</span>
                </div>
              </div>

              {/* Switch mode prompt */}
              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-primary font-semibold hover:text-primary/80 transition-colors"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>

            {/* Footer */}
            <p className="text-center text-[11px] text-muted-foreground/40 mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
