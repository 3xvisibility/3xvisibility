# AI Site Builder (Novamira-style, in-app)

লক্ষ্য: তোমার app-এর ভেতরেই একটা AI agent থাকবে (Lovable-এর মতো)। User শুধু **brand + category + niche**, একটা **reference link**, একটা **marketplace template**, বা সাধারণ ভাষায় **লিখে** বলবে — AI নিজে design + content বানিয়ে WordPress/Shopify-তে publish করে দেবে। Novamira-র মতো AI সরাসরি WordPress-কে নিয়ন্ত্রণও করতে পারবে (connector plugin দিয়ে)।

User কোনো prompt লিখবে না — আমরা (app-এর AI) brand/category/niche থেকে নিজে prompt বানিয়ে নেবো।

## ১. দুটো ঢোকার পথ (Chat + Wizard)

- **Wizard (সহজ)**: 3টা ফিল্ড — Brand, Category, Niche (+ optional reference link / template select)। "Build" চাপলে AI কাজ শুরু।
- **Chat (powerful)**: একটা chat box যেখানে user free-form লিখবে ("আমার জন্য একটা ডেন্টাল ক্লিনিকের landing page বানাও")। AI বুঝে নেবে।
- দুটোই একই backend AI engine-এ যাবে, তাই কাজ একই থাকবে।

## ২. AI কীভাবে input থেকে site বানাবে

```text
Input (brand/category/niche | link | template | text)
        │
        ▼
  [AI Planner]  → কোন ধরনের page, কয়টা section, কী design tone
        │
        ▼
  [Source resolve]
   - link দিলে → ওই site fetch করে design/structure পড়বে
   - template দিলে → stored Elementor JSON master নেবে
   - শুধু text/brand দিলে → marketplace থেকে best-match template বাছবে
        │
        ▼
  [AI Content] → brand/niche অনুযায়ী title/description/section content
                 (আগের word-count lock + ±20% length rule মানবে)
        │
        ▼
  [Preview]  → user দেখে approve করবে (Age preview, pore publish)
        │
        ▼
  [Publish] → Elementor native (WP) | Shopify | bulk
```

## ৩. AI-এর WordPress control (Novamira ধাঁচ)

Novamira live PHP চালায়। আমরা একই powerful জিনিস নিরাপদভাবে দেবো — **3xVisibility connector plugin**-এ নতুন "AI Action" endpoints দিয়ে। AI সরাসরি র PHP চালাবে না (security risk), বরং নির্দিষ্ট safe action গুলো করতে পারবে:

- Page/Elementor document create + save
- Media upload + attachment ID mapping
- Menu / navigation এ page যোগ
- Theme/global style token পড়া (site introspection)
- Permalink, SEO meta, page template (Elementor Full Width) set করা
- Cache regenerate + editor-readiness verify

প্রতিটা action AI tool-calling দিয়ে চালানো হবে, তাই AI নিজে decide করে দরকার অনুযায়ী tool গুলো call করবে — কিন্তু allowed action-এর বাইরে কিছু করতে পারবে না।

> যদি তুমি সত্যিই সম্পূর্ণ live PHP execution চাও (যেকোনো code), সেটা আলাদা ভয়ানক-powerful কিন্তু risky mode — আমি default-এ রাখছি না। চাইলে পরে toggle হিসেবে যোগ করবো।

## ৪. Output / Publish

- **WordPress** → সবসময় native Elementor JSON (Full Width), connector plugin দিয়ে, image গুলো WP Media Library-তে sync।
- **Shopify** → OS 2.0 page/product হিসেবে।
- **Preview-first** → publish-এর আগে side-by-side preview + similarity check (98% gate)।
- **Bulk** → একসাথে অনেক page (existing campaign engine reuse)।

## ৫. কী নতুন বানানো হবে

নতুন একটা page: **AI Site Builder** (sidebar-এ), যেখানে Chat tab + Wizard tab থাকবে। পুরোটাই আগের generation/publish engine-এর উপরে বসানো হবে, তাই নতুন করে content/publish logic লিখতে হবে না — শুধু AI agent layer + tool গুলো যোগ হবে।

---

## Technical section

- **Frontend**: `src/pages/AiSiteBuilderPage.tsx` — Tabs (Chat | Wizard)। Chat: `useChat` (AI SDK) → new edge function `ai-site-builder`. Wizard: brand/category/niche/link/template ফর্ম, যা একই edge function-কে structured payload পাঠাবে।
- **Backend agent**: নতুন edge function `supabase/functions/ai-site-builder/index.ts` — Lovable AI Gateway, AI SDK `streamText` + tool-calling (`stopWhen: stepCountIs(50)`)। Tools: `resolve_template`, `fetch_reference_site`, `generate_section_content`, `create_preview`, `publish_page` (existing `generate-pages`/`publish-pages` reuse), `wp_action` (connector plugin).
- **Connector plugin**: `class-3xv-rest.php`-এ নতুন `pgp/v1/ai-action` route গুলো (create document, set menu, set template, read theme tokens, regenerate css)। নতুন plugin version bump।
- **Reuse**: word-count lock (`template-length-budget.ts`), elementor engine, stored Elementor JSON master, similarity gate, image sync — সব আগেরটাই।
- **History**: chat history persistence — আলাদা করে জিজ্ঞেস করবো (threads vs single, DB vs localStorage) build শুরুর আগে।
- **Safety**: AI কেবল allowlisted `wp_action` চালাতে পারবে; কোনো raw SQL/PHP নয়।

কোনটা আগে চাও — পুরোটা একবারে, নাকি ধাপে ধাপে (আগে Wizard+publish, পরে Chat+WP-control)?