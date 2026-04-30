/**
 * supabase.functions.invoke() rejects FunctionsHttpError on any non-2xx
 * response with the generic message "Edge Function returned a non-2xx
 * status code", even though our edge functions put the real reason in
 * the JSON body. This helper extracts the actual error message.
 */
export async function extractEdgeError(err: any, fallback = "Request failed"): Promise<string> {
  try {
    const ctx = err?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json();
      const msg = body?.error || body?.message;
      if (msg) return String(msg);
    }
    if (ctx && typeof ctx.text === "function") {
      const text = await ctx.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error || parsed?.message) return String(parsed.error || parsed.message);
        } catch {
          return text;
        }
      }
    }
  } catch {
    // ignore — fall through to message
  }
  return err?.message || fallback;
}
