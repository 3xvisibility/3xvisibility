import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, FileText, Search, BarChart3, ChevronRight, ChevronLeft, X, Sparkles, Globe, KeyRound, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
  target: string; // CSS selector
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "bottom" | "right" | "left" | "top";
}

const steps: OnboardingStep[] = [
  {
    target: '[data-onboarding="search"]',
    title: "Welcome — quick search",
    description: "Press Cmd/Ctrl + K anywhere to jump to any page, campaign, or template. This is your fastest way to navigate.",
    icon: <Search className="h-5 w-5" />,
    position: "bottom",
  },
  {
    target: '[data-onboarding="websites"]',
    title: "Step 1 — Connect a website",
    description: "Start by connecting the site you want to publish to: WordPress, Shopify, or PrestaShop. Only takes a minute and it's a one-time setup.",
    icon: <Globe className="h-5 w-5" />,
    position: "right",
  },
  {
    target: '[data-onboarding="templates"]',
    title: "Step 2 — Build a template",
    description: "Design a reusable page layout with dynamic {variables} like {city} or {service}. Use AI Site Builder, marketplace, URL import, or write your own HTML.",
    icon: <FileText className="h-5 w-5" />,
    position: "right",
  },
  {
    target: '[data-onboarding="keywords"]',
    title: "Step 3 — Add keyword groups",
    description: "For each {variable} in your template, create a keyword group with the terms to use. Tip: open a template here and click 'Create all missing' to bulk-add every group at once.",
    icon: <KeyRound className="h-5 w-5" />,
    position: "right",
  },
  {
    target: '[data-onboarding="campaigns"]',
    title: "Step 4 — Create a campaign",
    description: "This is where everything comes together: pick a template, pick a data source (AI/CSV/website), attach locations, and preview the SEO score for every page before generation.",
    icon: <Rocket className="h-5 w-5" />,
    position: "right",
  },
  {
    target: '[data-onboarding="generated-pages"]',
    title: "Step 5 — Review & publish",
    description: "Once pages are generated, preview them, run SEO Optimize to rewrite title/content, then publish directly to your connected site. Live progress and logs are shown in real time.",
    icon: <Layers className="h-5 w-5" />,
    position: "right",
  },
  {
    target: '[data-onboarding="analytics"]',
    title: "Step 6 — Track performance",
    description: "Monitor generation success, publish status, SEO scores, and page performance across all your campaigns. That's the full loop — you're ready to go.",
    icon: <BarChart3 className="h-5 w-5" />,
    position: "right",
  },
];

const STORAGE_KEY = "onboarding-completed";

export function OnboardingTour() {
  const { pathname } = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    // Cross-context trigger: any component can dispatch this event to (re)start the tour.
    const handleRestart = () => {
      setCurrentStep(0);
      setIsActive(true);
    };
    window.addEventListener("onboarding:start", handleRestart);

    if (completed || !/\/dashboard(\/|$)/.test(pathname)) {
      setIsActive(false);
      return () => window.removeEventListener("onboarding:start", handleRestart);
    }

    const timer = setTimeout(() => setIsActive(true), 1200);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("onboarding:start", handleRestart);
    };
  }, [pathname]);


  const measureTarget = useCallback(() => {
    if (!isActive) return;
    const step = steps[currentStep];
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isActive]);

  useEffect(() => {
    measureTarget();
    const handleScroll = () => measureTarget();
    const handleResize = () => measureTarget();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [measureTarget]);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const skip = () => {
    finish();
  };

  if (!isActive) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const getTooltipPosition = (): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;
    const tooltipWidth = Math.min(340, vw - pad * 2);

    if (!targetRect) return { top: "50%", left: pad, right: pad, transform: "translateY(-50%)" };

    const gap = 12;
    const centerX = Math.max(pad, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, vw - tooltipWidth - pad));
    const spaceBelow = vh - targetRect.bottom - gap;

    if (vw < 480) {
      if (spaceBelow >= 180) {
        return { top: targetRect.bottom + gap, left: pad, right: pad };
      }
      return { bottom: vh - targetRect.top + gap, left: pad, right: pad };
    }

    switch (step.position) {
      case "bottom":
        return { top: targetRect.bottom + gap, left: centerX, width: tooltipWidth };
      case "top":
        return { bottom: vh - targetRect.top + gap, left: centerX, width: tooltipWidth };
      case "right": {
        const rightSpace = vw - targetRect.right - gap;
        if (rightSpace >= tooltipWidth + pad) {
          return { top: Math.max(pad, targetRect.top + targetRect.height / 2 - 60), left: targetRect.right + gap, width: tooltipWidth };
        }
        return spaceBelow >= 180
          ? { top: targetRect.bottom + gap, left: centerX, width: tooltipWidth }
          : { bottom: vh - targetRect.top + gap, left: centerX, width: tooltipWidth };
      }
      case "left": {
        const leftSpace = targetRect.left - gap;
        if (leftSpace >= tooltipWidth + pad) {
          return { top: Math.max(pad, targetRect.top + targetRect.height / 2 - 60), right: vw - targetRect.left + gap, width: tooltipWidth };
        }
        return spaceBelow >= 180
          ? { top: targetRect.bottom + gap, left: centerX, width: tooltipWidth }
          : { bottom: vh - targetRect.top + gap, left: centerX, width: tooltipWidth };
      }
    }
  };

  return createPortal(
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={skip}
          />

          {/* Spotlight cutout */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[9999] rounded-xl pointer-events-none"
              style={{
                top: targetRect.top - 6,
                left: targetRect.left - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px 4px rgba(var(--primary-rgb, 99,102,241), 0.3)",
                border: "2px solid hsl(var(--primary))",
              }}
            />
          )}

          {/* Tooltip */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[10000] max-w-[calc(100vw-16px)]"
            style={getTooltipPosition()}
          >
            <div className="rounded-xl border border-border bg-card shadow-xl p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); skip(); }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 -m-1 cursor-pointer active:opacity-70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Progress bar */}
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: `${((currentStep) / steps.length) * 100}%` }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); skip(); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-1 -ml-1 cursor-pointer active:opacity-70"
                >
                  Skip tour
                </button>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setCurrentStep((s) => Math.max(0, s - 1)); }}
                      className="h-8 px-3 text-xs gap-1.5"
                    >
                      <ChevronLeft className="h-3 w-3" /> Back
                    </Button>
                  )}
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); next(); }} className="h-8 px-4 text-xs gap-1.5">
                    {currentStep < steps.length - 1 ? (
                      <>
                        Next <ChevronRight className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" /> Get started
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
