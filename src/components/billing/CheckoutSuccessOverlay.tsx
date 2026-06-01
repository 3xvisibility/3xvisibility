import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CheckoutSuccessOverlayProps {
  planName?: string;
  onDismiss: () => void;
}

export function CheckoutSuccessOverlay({ planName, onDismiss }: CheckoutSuccessOverlayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["hsl(96,90%,45%)", "hsl(96,92%,62%)", "hsl(96,80%,38%)"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["hsl(96,90%,45%)", "hsl(96,92%,62%)", "hsl(96,80%,38%)"],
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Big burst
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.5 },
      colors: ["hsl(96,90%,45%)", "hsl(96,92%,62%)", "hsl(48,96%,53%)", "hsl(142,76%,36%)"],
    });
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in"
      onClick={handleDismiss}
    >
      <Card
        className="max-w-md w-full mx-4 shadow-2xl border-0 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-primary via-[hsl(var(--primary-glow))] to-success" />
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Payment Successful!</h2>
            <p className="text-muted-foreground text-sm">
              {planName
                ? `Your ${planName} plan is now active. Enjoy all the premium features!`
                : "Your subscription is now active. Enjoy all the premium features!"}
            </p>
          </div>
          <Button
            className="w-full rounded-xl h-11 font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:brightness-110 shadow-lg shadow-primary/20"
            onClick={handleDismiss}
          >
            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
