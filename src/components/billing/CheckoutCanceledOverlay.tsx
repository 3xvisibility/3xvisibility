import { useState } from "react";
import { XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CheckoutCanceledOverlayProps {
  onDismiss: () => void;
}

export function CheckoutCanceledOverlay({ onDismiss }: CheckoutCanceledOverlayProps) {
  const [visible, setVisible] = useState(true);

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
        <div className="h-1.5 bg-gradient-to-r from-warning via-destructive to-warning" />
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-9 w-9 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Checkout Canceled</h2>
            <p className="text-muted-foreground text-sm">
              Your payment was not completed. No charges were made. You can try again whenever you're ready.
            </p>
          </div>
          <Button
            className="w-full rounded-xl h-11 font-semibold"
            variant="outline"
            onClick={handleDismiss}
          >
            Back to Plans <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
