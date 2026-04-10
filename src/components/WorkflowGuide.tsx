import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface WorkflowStep {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
  active?: boolean;
}

interface WorkflowGuideProps {
  title: string;
  subtitle?: string;
  steps: WorkflowStep[];
  /** When all steps are done, show this CTA */
  completedMessage?: string;
}

export function WorkflowGuide({ title, subtitle, steps, completedMessage }: WorkflowGuideProps) {
  const navigate = useNavigate();
  const { basePath } = useWorkspace();
  const allDone = steps.every((s) => s.completed);
  const currentStep = steps.findIndex((s) => !s.completed);

  return (
    <Card className="border border-primary/20 shadow-surface overflow-hidden">
      <div className="bg-gradient-to-r from-primary/5 via-primary/3 to-transparent px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className="text-[10px]">
            {steps.filter((s) => s.completed).length}/{steps.length} done
          </Badge>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <CardContent className="p-0">
        {allDone && completedMessage ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
            <p className="text-sm font-medium text-success">{completedMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const StepIcon = step.icon;
              return (
                <button
                  key={step.label}
                  onClick={() => navigate(`${basePath}/${step.href}`)}
                  className={`w-full flex items-center gap-3 px-4 sm:px-6 py-3.5 text-left transition-colors hover:bg-muted/50 ${
                    isActive ? "bg-primary/5" : ""
                  }`}
                >
                  {/* Step number/check */}
                  <div className="shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    ) : (
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      step.completed
                        ? "bg-success/10"
                        : isActive
                        ? "bg-primary/10"
                        : "bg-muted"
                    }`}
                  >
                    <StepIcon
                      className={`h-4 w-4 ${
                        step.completed
                          ? "text-success"
                          : isActive
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        step.completed ? "text-success line-through" : ""
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{step.description}</p>
                  </div>

                  {/* Action arrow */}
                  {!step.completed && (
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground/40"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Quick empty state with action CTA */
export function EmptyStateGuide({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tips,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  tips?: string[];
}) {
  return (
    <Card className="shadow-surface">
      <CardContent className="p-8 sm:p-12 text-center">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary/60" />
        </div>
        <h3 className="font-semibold text-base mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
        <Button onClick={onAction} className="mb-4">
          {actionLabel}
        </Button>
        {tips && tips.length > 0 && (
          <div className="mt-4 text-left max-w-sm mx-auto space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              💡 Quick tips
            </p>
            {tips.map((tip, i) => (
              <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
