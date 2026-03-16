import { Star, Quote } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const reviews = [
  { name: "Sarah Chen", role: "SEO Director, GrowthHQ", avatar: "SC", rating: 5, text: "We generated 3,000 location pages in under 2 hours. Our organic traffic increased by 340% in 3 months. This tool is a game-changer." },
  { name: "Marcus Johnson", role: "Agency Owner, PixelForge", avatar: "MJ", rating: 5, text: "Finally a tool that actually works with WordPress REST API. We've onboarded 12 clients onto PageGen and the ROI is insane." },
  { name: "Emily Rodriguez", role: "Content Manager, TechScale", avatar: "ER", rating: 5, text: "The CSV-to-page pipeline is so intuitive. Our team went from manually creating 10 pages/day to generating 500 in one click." },
  { name: "David Park", role: "Founder, LocalSEO Pro", avatar: "DP", rating: 5, text: "Best investment for our agency. The template system with variables is incredibly flexible. We handle 50+ client campaigns monthly." },
  { name: "Lisa Thompson", role: "Marketing Lead, ShopifyPlus Store", avatar: "LT", rating: 5, text: "Shopify integration works flawlessly. We created 800 product landing pages and saw a 2x increase in conversions." },
  { name: "James Mitchell", role: "Head of Growth, ContentFarm", avatar: "JM", rating: 5, text: "We evaluated 5 different tools. PageGen was the only one that could handle our scale — 10,000 pages/month without breaking a sweat." },
  { name: "Anna Kowalski", role: "Digital Strategist, RankRise", avatar: "AK", rating: 5, text: "The field mapping UI is brilliant. No more messy spreadsheets. Just upload, map, and generate. Cut our workflow time by 90%." },
  { name: "Robert Kim", role: "CTO, PageStack", avatar: "RK", rating: 5, text: "Clean API, solid WordPress integration, and the campaign monitoring is top-notch. Our dev team loves working with this platform." },
];

function ReviewCard({ review }: { review: typeof reviews[0] }) {
  return (
    <div className="flex-shrink-0 w-[300px] md:w-[340px] rounded-xl border border-border/40 bg-background/60 backdrop-blur-sm p-5 hover:border-primary/20 hover:shadow-card-hover transition-all duration-500 relative group">
      <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/[0.05] group-hover:text-primary/[0.1] transition-colors duration-500" />
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(review.rating)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-[13px] text-foreground/85 leading-relaxed mb-4 line-clamp-4">"{review.text}"</p>
      <div className="flex items-center gap-2.5 pt-4 border-t border-border/30">
        <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-md shadow-primary/15">
          {review.avatar}
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-tight">{review.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{review.role}</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection() {
  const allReviews = [...reviews, ...reviews];

  return (
    <section id="reviews" className="py-20 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />

      <ScrollReveal className="container mx-auto px-4 lg:px-8 relative z-10 mb-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 bg-primary/[0.06] rounded-full px-3.5 py-1">
            <Star className="h-3 w-3 fill-current" />
            Reviews
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
            Loved by{" "}
            <span className="text-gradient-primary">2,000+ teams</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            See what SEO professionals and agencies say about PageGen.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <div className="flex gap-4 animate-scroll-left" style={{ width: "max-content" }}>
            {allReviews.map((review, i) => (
              <ReviewCard key={`row1-${i}`} review={review} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
