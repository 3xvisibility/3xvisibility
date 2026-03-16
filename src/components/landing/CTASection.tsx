import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Ready to deploy content at scale?
        </h2>
        <p className="mt-3 text-primary-foreground/80 max-w-lg mx-auto">
          Join SEO teams and agencies already generating thousands of pages with PGP.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="mt-8 transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
          asChild
        >
          <Link to="/auth">
            Get started for free <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
