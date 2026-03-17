import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function generateProductImage(
  productName: string,
  niche: string,
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{
          role: "user",
          content: `Generate a clean, professional product photo of "${productName}" for a ${niche} ecommerce store. White background, studio lighting, high quality product photography style. No text or watermarks.`,
        }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`Image gen failed for ${productName}: ${response.status}`);
      return getPlaceholderImage(productName);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (imageUrl) return imageUrl;
    return getPlaceholderImage(productName);
  } catch (err) {
    console.error(`Image gen error for ${productName}:`, err);
    return getPlaceholderImage(productName);
  }
}

function getPlaceholderImage(productName: string): string {
  const encoded = encodeURIComponent(productName);
  return `https://placehold.co/600x600/e2e8f0/64748b?text=${encoded}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { generation_id } = await req.json();
    if (!generation_id) {
      return new Response(JSON.stringify({ error: "generation_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the generation record
    const { data: gen, error: genError } = await supabase
      .from("store_generations")
      .select("*")
      .eq("id", generation_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (genError || !gen) {
      return new Response(JSON.stringify({ error: "Store generation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await supabase
      .from("store_generations")
      .update({ status: "processing" })
      .eq("id", generation_id);

    // Step 1: Generate categories using AI
    const categoryPrompt = `You are a product catalog expert. Generate product categories for an ecommerce store in the "${gen.niche}" niche.
${gen.keywords?.length ? `Keywords: ${gen.keywords.join(", ")}` : ""}
Language: ${gen.language || "en"}
Tone: ${gen.content_tone || "professional"}

Generate 4-6 relevant product categories. Each category should have a name and a short description.`;

    const categoryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: categoryPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "create_categories",
            description: "Create product categories for the store",
            parameters: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      slug: { type: "string" },
                    },
                    required: ["name", "description", "slug"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["categories"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_categories" } },
      }),
    });

    if (!categoryResponse.ok) {
      if (categoryResponse.status === 429) {
        await supabase.from("store_generations").update({ status: "failed", error_message: "Rate limit exceeded. Please try again later." }).eq("id", generation_id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (categoryResponse.status === 402) {
        await supabase.from("store_generations").update({ status: "failed", error_message: "AI credits exhausted. Please add funds." }).eq("id", generation_id);
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await categoryResponse.text();
      throw new Error(`AI category generation failed: ${errText}`);
    }

    const catData = await categoryResponse.json();
    const catArgs = JSON.parse(catData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}");
    const categories = (catArgs.categories || []).map((c: any) => ({
      ...c,
      slug: c.slug || slugify(c.name),
    }));

    // Update progress with categories
    await supabase.from("store_generations").update({
      categories,
      progress: {
        categories_created: categories.length,
        products_created: 0,
        pages_created: 0,
        total_categories: categories.length,
        total_products: gen.product_count,
      },
    }).eq("id", generation_id);

    // Step 2: Generate products for each category using AI
    const productsPerCategory = Math.ceil(gen.product_count / categories.length);
    const allProducts: any[] = [];

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const productPrompt = `You are a product copywriter. Generate ${productsPerCategory} unique products for the "${cat.name}" category in a "${gen.niche}" ecommerce store.
Language: ${gen.language || "en"}
Tone: ${gen.content_tone || "professional"}
Price range: $${gen.price_min || 9.99} - $${gen.price_max || 99.99}

For each product generate a compelling name, detailed HTML description with features and benefits, a short description, and a realistic price within the range.`;

      const productResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: productPrompt }],
          tools: [{
            type: "function",
            function: {
              name: "create_products",
              description: "Create products for the category",
              parameters: {
                type: "object",
                properties: {
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        price: { type: "string" },
                        description: { type: "string" },
                        short_description: { type: "string" },
                        seo_title: { type: "string" },
                        seo_description: { type: "string" },
                      },
                      required: ["name", "price", "description", "short_description", "seo_title", "seo_description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["products"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_products" } },
        }),
      });

      if (!productResponse.ok) {
        const errText = await productResponse.text();
        console.error(`Product generation failed for ${cat.name}: ${errText}`);
        continue;
      }

      const prodData = await productResponse.json();
      const prodArgs = JSON.parse(prodData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}");
      const products = (prodArgs.products || []).map((p: any) => ({
        ...p,
        category: cat.name,
        category_slug: cat.slug,
        slug: slugify(p.name),
      }));

      // Generate images for products in this batch
      for (const product of products) {
        product.image = await generateProductImage(product.name, gen.niche, LOVABLE_API_KEY);
      }

      allProducts.push(...products);

      // Update progress
      await supabase.from("store_generations").update({
        products: allProducts,
        progress: {
          categories_created: categories.length,
          products_created: allProducts.length,
          pages_created: 0,
          total_categories: categories.length,
          total_products: gen.product_count,
        },
      }).eq("id", generation_id);
    }

    // Trim to requested product count
    const finalProducts = allProducts.slice(0, gen.product_count);

    // Update final status
    await supabase.from("store_generations").update({
      status: "completed",
      products: finalProducts,
      progress: {
        categories_created: categories.length,
        products_created: finalProducts.length,
        pages_created: finalProducts.length,
        total_categories: categories.length,
        total_products: gen.product_count,
      },
    }).eq("id", generation_id);

    return new Response(
      JSON.stringify({
        success: true,
        categories: categories.length,
        products: finalProducts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-store error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Store generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
