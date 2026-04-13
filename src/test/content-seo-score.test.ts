import { describe, expect, it } from "vitest";

import { calculateContentSeoScore } from "@/lib/content-seo-score";

describe("calculateContentSeoScore", () => {
  it("detects a natural focus keyword instead of getting stuck on generic leading title words", () => {
    const title = "Get the Best Manual Poppy Seed Mill Today | Pro Grinder";
    const description = "Order the best manual poppy seed mill today! Get premium seeds ground fast with our local expert-rated grinder. High-quality results guaranteed nearby. Shop now.";
    const content = `
      <h1>Get the Manual Poppy Seed Mill: Best Pro Grinder Near You</h1>
      <p>Buy our high-performance manual poppy seed mill today, the essential kitchen accessory to grind poppy seeds and flax seeds with extreme precision. This reliable tool features a premium stainless steel housing and funnel that guarantee exceptional longevity for every home chef. Moreover, this premium product offers a simple and easy solution to save time on your home recipes. As local experts serving the community, we ensure professional results from the first use to boost your dishes throughout the region.</p>
      <h2>Why this manual poppy seed mill stands out</h2>
      <p>This manual poppy seed mill gives you consistent texture, smooth handling, and durable performance for daily cooking. Additionally, its compact design fits neatly into small kitchens while still delivering powerful grinding results. Because the crank system is responsive and balanced, you can prepare ingredients quickly without relying on electricity. Customers choose this grinder when they want reliable quality, faster prep, and better control over every batch.</p>
      <p>For example, bakers use the manual poppy seed mill to prepare fillings, pastry toppings, and fresh spice blends with less waste. The stainless build supports regular use, while the stable clamp keeps the grinder secure during operation. Furthermore, the device is easy to clean and store, making it a smart choice for busy households that want dependable kitchen tools.</p>
    `;

    const result = calculateContentSeoScore(title, content, "manual-poppy-seed-mill", {
      seoTitle: "Manual Poppy Seed Mill | Buy Today",
      description,
      seoKeywords: ["manual poppy seed mill"],
    });
    const check = (label: string) => result.checks.find((item) => item.label === label)?.passed;

    expect(result.score).toBeGreaterThan(50);
    expect(check("Focus keyword in title")).toBe(true);
    expect(check("Keyword in meta description")).toBe(true);
    expect(check("Keyword in introduction")).toBe(true);
    expect(check("Keyword in URL")).toBe(true);
    expect(check("Keyword density 0.5-2.5%")).toBe(true);
  });

  it("uses explicit CMS focus keywords for scoring so app score matches published SEO tools more closely", () => {
    const result = calculateContentSeoScore(
      "Get the Best Manual Poppy Seed Mill Today | Pro Grinder",
      `
        <h1>Moulin à pavot manuel pour votre cuisine</h1>
        <p>Moulin à pavot manuel pour votre cuisine et vos recettes maison. De plus, ce moulin à pavot manuel offre une prise en main simple, rapide et fiable pour un résultat régulier dès la première utilisation.</p>
        <h2>Pourquoi choisir ce moulin à pavot manuel local</h2>
        <p>Ce moulin à pavot manuel aide les foyers à préparer facilement des graines fraîchement moulues. En outre, il reste compact, robuste et pratique pour une utilisation fréquente dans la cuisine.</p>
        <p>Enfin, ce moulin à pavot manuel convient aux amateurs qui veulent un outil durable, précis et facile à nettoyer après chaque préparation.</p>
      `,
      "moulin-a-pavot-manuel",
      {
        seoTitle: "Moulin à pavot manuel | Acheter maintenant",
        description: "Achetez votre moulin à pavot manuel pour une mouture facile, rapide et précise à la maison. Commandez aujourd'hui pour un résultat fiable et durable.",
        seoKeywords: ["Moulin à pavot manuel"],
      }
    );

    const check = (label: string) => result.checks.find((item) => item.label === label)?.passed;

    expect(check("Focus keyword in title")).toBe(true);
    expect(check("Keyword in meta description")).toBe(true);
    expect(check("Keyword in URL")).toBe(true);
    expect(check("Keyword in introduction")).toBe(true);
  });
});