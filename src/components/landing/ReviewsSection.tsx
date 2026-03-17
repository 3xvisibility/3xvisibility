import { Star } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const reviews = [
  { name: "Sarah Chen", role: "SEO Director, GrowthHQ", avatar: "SC", text: "We generated 3,000 location pages in under 2 hours. Organic traffic increased 340% in 3 months." },
  { name: "Marcus Johnson", role: "Agency Owner, PixelForge", avatar: "MJ", text: "Finally a tool that actually works with WordPress REST API. 12 clients onboarded, insane ROI." },
  { name: "Emily Rodriguez", role: "Content Manager, TechScale", avatar: "ER", text: "Our team went from manually creating 10 pages/day to generating 500 in one click." },
  { name: "David Park", role: "Founder, LocalSEO Pro", avatar: "DP", text: "Best investment for our agency. Template variables are incredibly flexible. 50+ campaigns monthly." },
  { name: "Lisa Thompson", role: "Marketing Lead, ShopifyPlus", avatar: "LT", text: "Shopify integration works flawlessly. 800 product landing pages, 2x conversion increase." },
  { name: "James Mitchell", role: "Head of Growth, ContentFarm", avatar: "JM", text: "We evaluated 5 tools. PageGen was the only one handling 10,000 pages/month without breaking." },
  { name: "Anna Kowalski", role: "Digital Strategist, RankRise", avatar: "AK", text: "The field mapping UI is brilliant. Upload, map, generate. Cut workflow time by 90%." },
  { name: "Robert Kim", role: "CTO, PageStack", avatar: "RK", text: "Clean API, solid WordPress integration, campaign monitoring is top-notch." },
];

function ReviewCard({ review }: { review: typeof reviews[0] }) {
  return (
    <div className="flex-shrink-0 w-[300px] rounded-2xl border border-border/30 bg-card/60 p-5 hover:border-border/50 transition-all duration-300">
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-[13px] text-foreground/80 leading-relaxed mb-4">"{review.text}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-border/20">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-[hsl(var(--primary-glow))]/20 flex items-center justify-center text-[10px] font-bold text-primary">
          {review.avatar}
        </div>
        <div>
          <p className="text-xs font-semibold">{review.name}</p>
          <p className="text-[10px] text-muted-foreground">{review.role}</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection() {
  const allReviews = [...reviews, ...reviews];

  return (
    <section id="reviews" className="py-20 md:py-28 relative overflow-hidden">
      <ScrollReveal className="container mx-auto px-4 lg:px-8 relative z-10 mb-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4 bg-primary/5 border border-primary/10 rounded-full px-4 py-1">
            Reviews
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em]">
            Loved by 2,000+ teams
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            See what SEO professionals say about PageGen.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <div className="flex gap-4 animate-scroll-left" style={{ width: "max-content" }}>
            {allReviews.map((review, i) => (
              <ReviewCard key={`r-${i}`} review={review} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
