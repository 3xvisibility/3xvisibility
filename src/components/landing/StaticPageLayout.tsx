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
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl prose prose-base md:prose-lg prose-invert tracking-normal prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-[hsl(250,15%,68%)] prose-p:leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ul:space-y-2 prose-li:text-[hsl(250,15%,68%)] prose-li:leading-relaxed prose-li:my-1 prose-a:text-primary">
            {children}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
