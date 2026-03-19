import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { MousePointer, Tag, Eye, Code, Sparkles, ChevronRight, X, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "bottom" | "top" | "right" | "left";
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="template-preview"]',
    title: "Visual Preview",
    description:
      "This shows your page exactly as it looks on the web. Select any text you want to make dynamic — like a city name, price, or service — and it becomes a variable.",
    icon: <MousePointer className="h-5 w-5" />,
    position: "top",
  },
  {
    target: '[data-tour="template-ai-edit"]',
    title: "AI Editor",
    description:
      'Describe changes in plain text (e.g. "Add a FAQ section" or "Make the title bigger") and AI will update the template for you.',
    icon: <Wand2 className="h-5 w-5" />,
    position: "bottom",
  },
  {
    target: '[data-tour="template-code-toggle"]',
    title: "Code View",
    description:
      "Switch to raw HTML to make precise edits. Variables appear as {variable_name} placeholders that you can add or modify directly.",
    icon: <Code className="h-5 w-5" />,
    position: "bottom",
  },
  {
    target: '[data-tour="template-var-badges"]',
    title: "Variable Badges",
    description:
      "All your variables are listed here. Each one maps to a column in your data — when pages are generated, the variable text is swapped with real values.",
    icon: <Tag className="h-5 w-5" />,
    position: "top",
  },
];

const STORAGE_KEY = "template-editor-tour-completed";

export function TemplateEditorTour({ active, restartKey }: { active: boolean; restartKey?: number }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) return;
    if (restartKey && restartKey > 0) {
      setCurrentStep(0);
      setIsActive(true);
      return;
    }
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [active, restartKey]);

  const measureTarget = useCallback(() => {
    if (!isActive) return;
    const step = tourSteps[currentStep];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isActive]);

  useEffect(() => {
    measureTarget();
    const interval = setInterval(measureTarget, 300);
    return () => clearInterval(interval);
  }, [measureTarget]);

  const next = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const getTooltipPosition = (): React.CSSProperties => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const gap = 12;
    const tooltipWidth = Math.min(300, window.innerWidth - 24);

    switch (step.position) {
      case "bottom":
        return {
          top: targetRect.bottom + gap,
          left: Math.max(12, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 12)),
        };
      case "top":
        return {
          bottom: window.innerHeight - targetRect.top + gap,
          left: Math.max(12, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 12)),
        };
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          left: targetRect.right + gap,
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - 60,
          right: window.innerWidth - targetRect.left + gap,
        };
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
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            onClick={finish}
          />

          {/* Spotlight */}
          {targetRect && (
            <motion.div
              key={`spot-${currentStep}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed z-[9999] rounded-xl pointer-events-none"
              style={{
                top: targetRect.top - 4,
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow:
                  "0 0 0 9999px rgba(0,0,0,0.45), 0 0 16px 2px rgba(99,102,241,0.35)",
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
            className="fixed z-[10000]"
            style={{ ...getTooltipPosition(), width: Math.min(300, window.innerWidth - 24) }}
          >
            <div className="rounded-xl border border-border bg-card shadow-xl p-4 space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      Step {currentStep + 1} of {tourSteps.length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={finish}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: `${((currentStep) / tourSteps.length) * 100}%` }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <button
                  onClick={finish}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip tour
                </button>
                <Button size="sm" onClick={next} className="h-7 px-3 text-xs gap-1">
                  {currentStep < tourSteps.length - 1 ? (
                    <>Next <ChevronRight className="h-3 w-3" /></>
                  ) : (
                    <><Sparkles className="h-3 w-3" /> Got it!</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
