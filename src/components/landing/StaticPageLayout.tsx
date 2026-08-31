import { ReactNode, useRef } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { usePageAutoTranslate } from "@/i18n/usePageAutoTranslate";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function StaticPageLayout({ title, subtitle, children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  usePageAutoTranslate(contentRef);

  return (
    <div className="min-h-screen flex flex-col landing-page" ref={contentRef}>
      <LandingNav />
      <main className="flex-1">
        <section className="pt-24 pb-8 sm:pt-28 sm:pb-10 md:pt-32 md:pb-12 border-b border-[hsl(96,67%,48%,0.08)]">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-tight">{title}</h1>
            {subtitle && (
              <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-[hsl(250,10%,27%)] max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </section>
        <section className="py-8 sm:py-10 md:py-14">

          <div className="container mx-auto px-4 lg:px-8 max-w-4xl prose prose-sm sm:prose-base md:prose-lg tracking-normal prose-headings:text-[hsl(250,20%,12%)] prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-lg sm:prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-7 sm:prose-h2:mt-9 md:prose-h2:mt-12 prose-h2:mb-3 md:prose-h2:mb-4 prose-p:text-[hsl(250,10%,32%)] prose-p:leading-relaxed prose-p:my-4 md:prose-p:my-5 prose-ul:my-4 md:prose-ul:my-5 prose-ul:space-y-2 prose-li:text-[hsl(250,10%,32%)] prose-li:leading-relaxed prose-li:my-1 prose-strong:text-[hsl(250,20%,14%)] prose-a:text-primary prose-a:font-medium prose-a:underline-offset-2 hover:prose-a:underline prose-th:text-[hsl(250,20%,14%)] prose-td:text-[hsl(250,10%,32%)]">

            {children}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
