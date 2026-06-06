import { Link } from "react-router-dom";
import { useRef } from "react";
import { motion } from "framer-motion";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Sparkles,
  Target,
  ScanSearch,
  Wand2,
  Globe,
  ShieldCheck,
  ArrowRight,
  Quote,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BackToTop } from "@/components/BackToTop";
import { Button } from "@/components/ui/button";

interface BuildItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const buildItems: BuildItem[] = [
  {
    icon: ScanSearch,
    title: "AI template scanning",
    desc: "Automatically extract design systems from any CMS or page builder and turn them into reusable templates.",
  },
  {
    icon: Wand2,
    title: "Spintax + variable engine",
    desc: "Generate unique, high-quality content at scale with multi-language support and smart variable mapping.",
  },
  {
    icon: Globe,
    title: "Native publishing",
    desc: "Push pages directly to WordPress, Shopify, WooCommerce and PrestaShop with one click.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in SEO scoring",
    desc: "Audits, content quality checks and SEO scoring baked into every page you create.",
  },
];

const stats = [
  { value: "40h", label: "Saved per site" },
  { value: "4", label: "Platforms supported" },
  { value: "10k+", label: "Pages per campaign" },
  { value: "8", label: "Languages" },
];

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Head of SEO",
    company: "BrightLeaf Agency",
    quote:
      "We went from manually building 20 landing pages a week to generating over 800 localized pages in a single campaign. 3XVISIBILITY cut our production time by 90%.",
    stars: 5,
  },
  {
    name: "James Okoro",
    role: "Ecommerce Director",
    company: "UrbanCart",
    quote:
      "Publishing directly to Shopify with SEO scoring built-in changed how we launch product collections. What used to take weeks now happens in days.",
    stars: 5,
  },
  {
    name: "Elena Voss",
    role: "Founder",
    company: "Voss Digital",
    quote:
      "The AI template scanner pulled our exact Elementor design system and turned it into a reusable template. Our clients think we have a 10-person dev team.",
    stars: 5,
  },
  {
    name: "Marcus Chen",
    role: "Performance Marketing Lead",
    company: "NexGen Media",
    quote:
      "Multilingual content at scale used to be a pipe dream. With 3XVISIBILITY we run GEO campaigns across 8 languages without hiring translators.",
    stars: 5,
  },
];

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AboutPage() {
  const autoplayRef = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  return (
    <div className="min-h-screen flex flex-col landing-page">
      <Seo
        title="About us"
        description="3XVISIBILITY helps marketers, agencies and ecommerce teams turn structured data into thousands of high-quality, SEO-optimized pages published to WordPress, Shopify, WooCommerce and PrestaShop."
        path="/about"
      />
      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_0%,hsl(96,90%,45%,0.08),transparent)] pointer-events-none" />
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <motion.div
              className="text-center max-w-3xl mx-auto"
              initial="hidden"
              animate="visible"
              variants={sectionReveal}
            >
              <span className="section-badge mb-6">
                <Sparkles className="h-3 w-3" />
                Our story
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-tight">
                About{" "}
                <span className="text-gradient-primary">3XVISIBILITY</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-[hsl(250,15%,65%)] max-w-2xl mx-auto leading-relaxed">
                We help marketers, agencies, and ecommerce teams turn structured data into
                thousands of high-quality, SEO-optimized pages — published directly to
                WordPress, Shopify, WooCommerce and PrestaShop.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-8 relative">
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  className="rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)] p-6 text-center"
                  variants={sectionReveal}
                >
                  <div className="text-3xl md:text-4xl font-extrabold text-gradient-primary tracking-tight">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs md:text-sm text-[hsl(220,10%,70%)]">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 md:py-24 relative">
          <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={sectionReveal}
              className="rounded-3xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(220,40%,8%)] p-8 md:p-12"
            >
              <div className="h-12 w-12 rounded-xl bg-[hsl(96,90%,45%,0.1)] border border-[hsl(96,90%,45%,0.15)] flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-[hsl(96,80%,52%)]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.02em]">Our mission</h2>
              <p className="mt-4 text-[hsl(250,15%,65%)] leading-relaxed">
                3XVISIBILITY exists to remove the manual grind from programmatic SEO. We combine
                AI-powered content generation, theme-aware publishing and a robust template
                engine so teams can scale local landing pages, product pages and content hubs
                in days instead of months.
              </p>
            </motion.div>
          </div>
        </section>

        {/* What we build */}
        <section className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,hsl(96,90%,45%,0.06),transparent)] pointer-events-none" />
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionReveal}>
                <span className="section-badge mb-6">
                  <Sparkles className="h-3 w-3" />
                  What we build
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] leading-tight">
                  Everything you need to{" "}
                  <span className="text-gradient-primary">scale content</span>
                </h2>
              </motion.div>
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {buildItems.map((item) => (
                <motion.div
                  key={item.title}
                  className="group relative rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)] p-6 hover:border-[hsl(96,90%,45%,0.25)] transition-all duration-500 hover:bg-[hsl(220,40%,9%)]"
                  variants={sectionReveal}
                  whileHover={{ y: -4 }}
                >
                  <div className="h-11 w-11 rounded-xl bg-[hsl(96,90%,45%,0.1)] border border-[hsl(96,90%,45%,0.15)] flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300">
                    <item.icon className="h-5 w-5 text-[hsl(96,80%,52%)]" />
                  </div>
                  <h3 className="font-bold text-base mb-2 text-foreground">{item.title}</h3>
                  <p className="text-sm text-[hsl(220,10%,70%)] leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_100%,hsl(96,90%,45%,0.06),transparent)] pointer-events-none" />
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionReveal}>
                <span className="section-badge mb-6">
                  <Sparkles className="h-3 w-3" />
                  Loved by teams
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] leading-tight">
                  Results that{" "}
                  <span className="text-gradient-primary">speak for themselves</span>
                </h2>
              </motion.div>
            </div>

            <motion.div
              className="max-w-4xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={sectionReveal}
            >
              <Carousel
                opts={{ loop: true, align: "start" }}
                plugins={[autoplayRef.current]}
                onMouseEnter={() => autoplayRef.current.stop()}
                onMouseLeave={() => autoplayRef.current.play()}
                className="px-2"
              >
                <CarouselContent className="-ml-4">
                  {testimonials.map((t) => (
                    <CarouselItem key={t.name} className="pl-4 md:basis-1/2">
                      <div className="group relative h-full rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)] p-6 hover:border-[hsl(96,90%,45%,0.25)] transition-all duration-500 hover:bg-[hsl(220,40%,9%)]">
                        <div className="flex items-center gap-1 mb-4">
                          {Array.from({ length: t.stars }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-[hsl(96,80%,52%)] text-[hsl(96,80%,52%)]" />
                          ))}
                        </div>
                        <Quote className="h-6 w-6 text-[hsl(96,90%,45%,0.25)] mb-3" />
                        <p className="text-sm text-[hsl(220,10%,70%)] leading-relaxed mb-6">
                          {t.quote}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[hsl(96,90%,45%,0.12)] border border-[hsl(96,90%,45%,0.2)] flex items-center justify-center text-sm font-bold text-[hsl(96,80%,52%)]">
                            {t.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{t.name}</div>
                            <div className="text-xs text-[hsl(220,10%,70%)]">
                              {t.role} · {t.company}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
              </Carousel>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 lg:px-8 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={sectionReveal}
              className="relative rounded-3xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-[hsl(220,45%,7%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(96,90%,45%,0.2),transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(96,92%,62%,0.15),transparent_60%)]" />
              <div className="absolute inset-0 rounded-3xl border border-[hsl(96,90%,45%,0.15)]" />
              <div className="relative z-10 py-16 md:py-20 px-8 md:px-16 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] leading-tight max-w-lg mx-auto">
                  Built for scale
                </h2>
                <p className="mt-4 text-[hsl(220,10%,70%)] max-w-md mx-auto text-sm leading-relaxed">
                  From solo founders to enterprise SEO teams — 3XVISIBILITY scales from a handful of
                  pages to tens of thousands without breaking your design system.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-[0.97] text-sm px-8 h-12 rounded-xl font-semibold shadow-xl shadow-primary/25"
                    asChild
                  >
                    <Link to="/auth">
                      Get started <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-[hsl(96,90%,45%,0.2)] bg-transparent text-[hsl(220,10%,85%)] hover:text-foreground hover:bg-[hsl(96,90%,45%,0.08)] h-12 rounded-xl text-sm font-medium"
                    asChild
                  >
                    <Link to="/contact">Contact us</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <LandingFooter />
      <BackToTop />
    </div>
  );
}
