import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.208.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Create a JWT for Google Service Account authentication
async function createGoogleJwt(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Import the private key
  const pemContent = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64url(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}

// Exchange JWT for access token
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const jwt = await createGoogleJwt(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Submit URL to Google Indexing API
async function submitUrlToGoogle(
  accessToken: string,
  url: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED"
): Promise<any> {
  const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Google API error: ${response.status}`);
  }
  return data;
}

// Check URL indexing status
async function getUrlStatus(accessToken: string, url: string): Promise<any> {
  const encodedUrl = encodeURIComponent(url);
  const response = await fetch(
    `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodedUrl}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Status check failed: ${response.status}`);
  }
  return data;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, website_id, urls, request_ids } = body;

    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get website with service account
    const { data: website, error: webError } = await supabase
      .from("websites")
      .select("id, url, name, google_indexing_enabled, google_service_account")
      .eq("id", website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (webError || !website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!website.google_service_account) {
      return new Response(JSON.stringify({ error: "Google service account not configured for this website" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = website.google_service_account as {
      client_email: string;
      private_key: string;
    };

    // Get access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(serviceAccount);
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `Authentication failed: ${e.message}` }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different actions
    if (action === "submit") {
      // Submit URLs for indexing
      const urlList: string[] = urls || [];
      if (urlList.length === 0) {
        return new Response(JSON.stringify({ error: "No URLs provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let submitted = 0;
      let failed = 0;
      const results: any[] = [];

      for (const url of urlList) {
        try {
          const googleResponse = await submitUrlToGoogle(accessToken, url);

          // Update or create indexing request record
          const { data: existing } = await supabase
            .from("indexing_requests")
            .select("id")
            .eq("url", url)
            .eq("website_id", website_id)
            .maybeSingle();

          if (existing) {
            await supabase.from("indexing_requests").update({
              status: "submitted",
              google_response: googleResponse,
              error_message: null,
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            await supabase.from("indexing_requests").insert({
              user_id: user.id,
              website_id,
              url,
              status: "submitted",
              google_response: googleResponse,
              submitted_at: new Date().toISOString(),
            });
          }

          submitted++;
          results.push({ url, status: "submitted" });
        } catch (e: any) {
          // Update record as failed
          const { data: existing } = await supabase
            .from("indexing_requests")
            .select("id, retry_count")
            .eq("url", url)
            .eq("website_id", website_id)
            .maybeSingle();

          if (existing) {
            await supabase.from("indexing_requests").update({
              status: "failed",
              error_message: e.message,
              retry_count: (existing.retry_count || 0) + 1,
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            await supabase.from("indexing_requests").insert({
              user_id: user.id,
              website_id,
              url,
              status: "failed",
              error_message: e.message,
            });
          }

          failed++;
          results.push({ url, status: "failed", error: e.message });
        }
      }

      return new Response(JSON.stringify({ success: true, submitted, failed, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "retry") {
      // Retry failed requests
      const ids: string[] = request_ids || [];
      const { data: failedRequests } = await supabase
        .from("indexing_requests")
        .select("id, url")
        .in("id", ids)
        .eq("website_id", website_id);

      if (!failedRequests || failedRequests.length === 0) {
        return new Response(JSON.stringify({ error: "No requests found to retry" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let retried = 0;
      let retryFailed = 0;

      for (const req of failedRequests) {
        try {
          const googleResponse = await submitUrlToGoogle(accessToken, req.url);
          await supabase.from("indexing_requests").update({
            status: "submitted",
            google_response: googleResponse,
            error_message: null,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", req.id);
          retried++;
        } catch (e: any) {
          await supabase.from("indexing_requests").update({
            status: "failed",
            error_message: e.message,
            retry_count: (failedRequests as any).retry_count ? (failedRequests as any).retry_count + 1 : 1,
            updated_at: new Date().toISOString(),
          }).eq("id", req.id);
          retryFailed++;
        }
      }

      return new Response(JSON.stringify({ success: true, retried, failed: retryFailed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      // Check status of submitted URLs
      const { data: requests } = await supabase
        .from("indexing_requests")
        .select("id, url, status")
        .eq("website_id", website_id)
        .eq("status", "submitted");

      if (!requests || requests.length === 0) {
        return new Response(JSON.stringify({ success: true, checked: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let checked = 0;
      for (const req of requests) {
        try {
          const statusData = await getUrlStatus(accessToken, req.url);
          const latestUpdate = statusData.latestUpdate || statusData.latestRemove;
          const newStatus = latestUpdate ? "indexed" : "submitted";

          await supabase.from("indexing_requests").update({
            status: newStatus,
            google_response: statusData,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", req.id);
          checked++;
        } catch {
          // Skip status check failures
        }
      }

      return new Response(JSON.stringify({ success: true, checked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-submit: submit all published pages for a website
    if (action === "auto-submit") {
      const { data: pages } = await supabase
        .from("generated_pages")
        .select("id, slug, external_url")
        .eq("website_id", website_id)
        .eq("user_id", user.id)
        .neq("status", "failed");

      if (!pages || pages.length === 0) {
        return new Response(JSON.stringify({ success: true, submitted: 0, message: "No pages to index" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const baseUrl = website.url.replace(/\/$/, "");
      let submitted = 0;
      let failed = 0;

      for (const page of pages) {
        const pageUrl = page.external_url || `${baseUrl}/${page.slug}`;
        try {
          const googleResponse = await submitUrlToGoogle(accessToken, pageUrl);

          const { data: existing } = await supabase
            .from("indexing_requests")
            .select("id")
            .eq("url", pageUrl)
            .eq("website_id", website_id)
            .maybeSingle();

          if (existing) {
            await supabase.from("indexing_requests").update({
              status: "submitted",
              google_response: googleResponse,
              error_message: null,
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              page_id: page.id,
            }).eq("id", existing.id);
          } else {
            await supabase.from("indexing_requests").insert({
              user_id: user.id,
              website_id,
              page_id: page.id,
              url: pageUrl,
              status: "submitted",
              google_response: googleResponse,
              submitted_at: new Date().toISOString(),
            });
          }
          submitted++;
        } catch (e: any) {
          const { data: existing } = await supabase
            .from("indexing_requests")
            .select("id")
            .eq("url", pageUrl)
            .eq("website_id", website_id)
            .maybeSingle();

          if (existing) {
            await supabase.from("indexing_requests").update({
              status: "failed",
              error_message: e.message,
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
          } else {
            await supabase.from("indexing_requests").insert({
              user_id: user.id,
              website_id,
              page_id: page.id,
              url: pageUrl,
              status: "failed",
              error_message: e.message,
            });
          }
          failed++;
        }
      }

      return new Response(JSON.stringify({ success: true, submitted, failed, total: pages.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: submit, retry, status, auto-submit" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
