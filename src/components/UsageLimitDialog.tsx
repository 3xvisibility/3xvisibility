import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type LimitType = "pages" | "ai" | "sites";

interface UsageLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: LimitType;
  used: number;
  limit: number;
}

const LABELS: Record<LimitType, { title: string; noun: string; icon: React.ReactNode }> = {
  pages: {
    title: "Page Generation Limit Reached",
    noun: "page generations",
    icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
  },
  ai: {
    title: "AI Generation Limit Reached",
    noun: "AI generations",
    icon: <Sparkles className="h-5 w-5 text-destructive" />,
  },
  sites: {
    title: "Website Limit Reached",
    noun: "connected websites",
    icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
  },
};

export function UsageLimitDialog({ open, onOpenChange, type, used, limit }: UsageLimitDialogProps) {
  const navigate = useNavigate();
  const { basePath } = useWorkspace();
  const { title, noun, icon } = LABELS[type];
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
            {icon}
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            You've used <span className="font-semibold text-foreground">{used}</span> of{" "}
            <span className="font-semibold text-foreground">{limit}</span> {noun} included in your current plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Usage</span>
            <span className="tabular-nums font-medium">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2.5" />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              navigate(`${basePath}/billing`);
            }}
          >
            Upgrade Plan <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
