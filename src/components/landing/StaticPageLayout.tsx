import { ReactNode } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function StaticPageLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col landing-page">
      <LandingNav />
      <main className="flex-1">
        <section className="py-16 md:py-24 border-b border-[hsl(262,83%,58%,0.08)]">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-4 text-base md:text-lg text-[hsl(250,15%,55%)] max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </section>
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl prose prose-invert prose-headings:font-semibold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-p:text-[hsl(250,15%,65%)] prose-li:text-[hsl(250,15%,65%)] prose-a:text-primary">
            {children}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
