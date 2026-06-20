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
    <div className="min-h-screen flex flex-col landing-page" data-auto-translate>
      <LandingNav />
      <main className="flex-1">
        <section className="py-20 md:py-28 border-b border-[hsl(96,90%,45%,0.08)]">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-5 text-lg md:text-xl text-[hsl(250,15%,55%)] max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </section>
        <section className="py-14 md:py-24">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl prose prose-lg md:prose-xl prose-invert prose-headings:font-semibold prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4 prose-p:text-[hsl(250,15%,68%)] prose-p:leading-relaxed prose-li:text-[hsl(250,15%,68%)] prose-a:text-primary">
            {children}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
