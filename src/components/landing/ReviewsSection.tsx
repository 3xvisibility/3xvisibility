import { Star } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";

const reviews = [
  { name: "Sarah Chen", role: "SEO Director, GrowthHQ", avatar: "SC", text: "We generated 3,000 location pages in under 2 hours. Organic traffic increased 340% in 3 months." },
  { name: "Marcus Johnson", role: "Agency Owner, PixelForge", avatar: "MJ", text: "Finally a tool that actually works with WordPress REST API. 12 clients onboarded, insane ROI." },
  { name: "Emily Rodriguez", role: "Content Manager, TechScale", avatar: "ER", text: "Our team went from manually creating 10 pages/day to generating 500 in one click." },
  { name: "David Park", role: "Founder, LocalSEO Pro", avatar: "DP", text: "Best investment for our agency. Template variables are incredibly flexible. 50+ campaigns monthly." },
  { name: "Lisa Thompson", role: "Marketing Lead, ShopifyPlus", avatar: "LT", text: "Shopify integration works flawlessly. 800 product landing pages, 2x conversion increase." },
  { name: "James Mitchell", role: "Head of Growth, ContentFarm", avatar: "JM", text: "We evaluated 5 tools. 3XVISIBILITY was the only one handling 10,000 pages/month without breaking." },
  { name: "Anna Kowalski", role: "Digital Strategist, RankRise", avatar: "AK", text: "The field mapping UI is brilliant. Upload, map, generate. Cut workflow time by 90%." },
  { name: "Robert Kim", role: "CTO, PageStack", avatar: "RK", text: "Clean API, solid WordPress integration, campaign monitoring is top-notch." },
];

function ReviewCard({ review }: { review: typeof reviews[0] }) {
  return (
    <div className="flex-shrink-0 w-[300px] rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)] p-5 hover:border-[hsl(96,90%,45%,0.2)] transition-all duration-300">
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-[hsl(38,92%,60%)] text-[hsl(38,92%,60%)]" />
        ))}
      </div>
      <p className="text-[13px] text-[hsl(220,15%,65%)] leading-relaxed mb-4">"{review.text}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-[hsl(96,90%,45%,0.08)]">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(96,90%,45%,0.2)] to-[hsl(96,92%,62%,0.2)] flex items-center justify-center text-[10px] font-bold text-[hsl(96,80%,52%)]">
          {review.avatar}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{review.name}</p>
          <p className="text-[10px] text-[hsl(220,15%,45%)]">{review.role}</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection() {
  const { t } = useLanguage();
  const allReviews = [...reviews, ...reviews];

  return (
    <section id="reviews" className="py-20 md:py-28 relative overflow-hidden">
      <ScrollReveal className="container mx-auto px-4 lg:px-8 relative z-10 mb-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-badge mb-6">{t("reviews.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">{t("reviews.title")}</h2>
          <p className="mt-3 text-sm text-[hsl(220,15%,50%)]">{t("reviews.description")}</p>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.1}>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[hsl(220,60%,4%)] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[hsl(220,60%,4%)] to-transparent z-10 pointer-events-none" />
          <div className="flex gap-4 animate-scroll-left" style={{ width: "max-content" }}>
            {allReviews.map((review, i) => (<ReviewCard key={`r-${i}`} review={review} />))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
