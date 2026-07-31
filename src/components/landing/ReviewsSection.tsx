import { Star } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";
import photo1 from "@/assets/team/person-1.jpg";
import photo2 from "@/assets/team/person-2.jpg";
import photo3 from "@/assets/team/person-3.jpg";
import photo4 from "@/assets/team/person-4.jpg";

const reviewConfigs = [
  { name: "Sarah Chen", roleKey: "reviews.role1", avatar: "SC", photo: photo1, textKey: "reviews.text1" },
  { name: "Marcus Johnson", roleKey: "reviews.role2", avatar: "MJ", photo: photo2, textKey: "reviews.text2" },
  { name: "Emily Rodriguez", roleKey: "reviews.role3", avatar: "ER", photo: photo3, textKey: "reviews.text3" },
  { name: "David Park", roleKey: "reviews.role4", avatar: "DP", photo: photo4, textKey: "reviews.text4" },
  { name: "Lisa Thompson", roleKey: "reviews.role5", avatar: "LT", textKey: "reviews.text5" },
  { name: "James Mitchell", roleKey: "reviews.role6", avatar: "JM", textKey: "reviews.text6" },
  { name: "Anna Kowalski", roleKey: "reviews.role7", avatar: "AK", textKey: "reviews.text7" },
  { name: "Robert Kim", roleKey: "reviews.role8", avatar: "RK", textKey: "reviews.text8" },
];

type Review = { name: string; role: string; avatar: string; photo?: string; text: string };

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex-shrink-0 w-[300px] rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)] p-5 hover:border-[hsl(96,90%,45%,0.2)] transition-all duration-300">
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-[hsl(38,92%,60%)] text-[hsl(38,92%,60%)]" />
        ))}
      </div>
      <p className="text-[13px] text-[hsl(220,10%,82%)] leading-relaxed mb-4">"{review.text}"</p>
      <div className="flex items-center gap-3 pt-3 border-t border-[hsl(96,90%,45%,0.08)]">
        {review.photo ? (
          <img
            src={review.photo}
            alt={`${review.name}, ${review.role}`}
            loading="lazy"
            width={512}
            height={512}
            className="h-8 w-8 rounded-full object-cover border border-[hsl(96,90%,45%,0.2)]"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(96,90%,45%,0.2)] to-[hsl(96,92%,62%,0.2)] flex items-center justify-center text-[10px] font-bold text-[hsl(96,80%,52%)]">
            {review.avatar}
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-foreground">{review.name}</p>
          <p className="text-[10px] text-[hsl(220,10%,64%)]">{review.role}</p>
        </div>
      </div>
    </div>
  );
}


export function ReviewsSection() {
  const { t } = useLanguage();
  const reviews = reviewConfigs.map((review) => ({
    name: review.name,
    avatar: review.avatar,
    photo: (review as { photo?: string }).photo,

    role: t(review.roleKey),
    text: t(review.textKey),
  }));
  const allReviews = [...reviews, ...reviews];

  return (
    <section id="reviews" className="py-20 md:py-28 relative overflow-hidden">
      <ScrollReveal className="container mx-auto px-4 lg:px-8 relative z-10 mb-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="section-badge mb-6">{t("reviews.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">{t("reviews.title")}</h2>
          <p className="mt-3 text-sm text-[hsl(220,10%,70%)]">{t("reviews.description")}</p>
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
