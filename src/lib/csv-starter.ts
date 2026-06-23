/**
 * Generate a starter CSV file for a template — gives users an instant
 * "fill-in-the-blanks" sheet where every column = a template variable.
 *
 * Workflow: user selects a template → downloads CSV → opens in Excel/Sheets →
 * fills rows with their own data → uploads back → auto-mapped → pages generated.
 */
import { isDesignVariable } from "@/lib/design-vars-filter";
import { exportDataFile } from "@/lib/export-csv";

/** Sensible example value for common variable names. */
const EXAMPLE_VALUES: Record<string, string> = {
  city: "Austin",
  state: "Texas",
  country: "United States",
  zip_code: "78701",
  postcode: "78701",
  service: "Plumbing",
  service_name: "Emergency Plumbing",
  product: "Wireless Headphones",
  product_name: "Wireless Headphones",
  category: "Services",
  brand: "Acme Co",
  brand_name: "Acme Co",
  company: "Acme Co",
  company_name: "Acme Co",
  business: "Acme Co",
  business_name: "Acme Co",
  title: "Best Plumber in Austin",
  name: "Acme Plumbing",
  description: "Top-rated 24/7 service available throughout the area.",
  excerpt: "Trusted local experts you can count on.",
  price: "99",
  rating: "4.9",
  phone: "+1-512-555-0100",
  email: "hello@example.com",
  address: "123 Main St",
  hours: "Mon–Fri 9am–6pm",
  website_url: "https://example.com",
  url: "https://example.com",
  slug: "best-plumber-austin",
  tagline: "Quality service, every time",
  keyword: "best plumber austin",
  topic: "Home Services",
  author: "Jane Doe",
  date: new Date().toISOString().split("T")[0],
  image: "https://picsum.photos/800/400",
};

const fallbackExample = (v: string): string => {
  const key = v.toLowerCase();
  if (EXAMPLE_VALUES[key]) return EXAMPLE_VALUES[key];
  // Look for partial matches (e.g. "store_city" → "city")
  for (const [k, val] of Object.entries(EXAMPLE_VALUES)) {
    if (key.includes(k)) return val;
  }
  return `Example ${v.replace(/_/g, " ")}`;
};

export interface StarterCsvOptions {
  templateName: string;
  /** Raw variable list from the template (may include {} or design vars). */
  variables: string[];
  /** Number of example rows to include (default 1). */
  exampleRows?: number;
  /** Output format (default "csv"). */
  format?: "csv" | "xlsx";
  /**
   * Optional template default values keyed by variable name. When provided,
   * each column is pre-filled with the real template content (services, stats,
   * testimonials, FAQ, contact text, etc.) so an uploaded CSV auto-maps 1:1.
   */
  defaultValues?: Record<string, string>;
}

/** Trigger a download of a starter CSV/Excel containing the template's variable headers + example rows. */
export function downloadStarterCsv({ templateName, variables, exampleRows = 1, format = "csv", defaultValues }: StarterCsvOptions) {
  const cleaned = Array.from(
    new Set(
      variables
        .map((v) => v.replace(/[{}]/g, "").trim())
        .filter((v) => v.length > 0 && !isDesignVariable(v))
    )
  );

  if (cleaned.length === 0) {
    // Fall back to a generic starter set
    cleaned.push("title", "city", "service", "description", "price");
  }

  // Case-insensitive lookup of a variable's default value.
  const defaultsLower: Record<string, string> = {};
  if (defaultValues) {
    for (const [k, v] of Object.entries(defaultValues)) {
      defaultsLower[k.toLowerCase()] = String(v ?? "");
    }
  }
  const exampleFor = (v: string): string => {
    const fromDefaults = defaultsLower[v.toLowerCase()];
    if (fromDefaults !== undefined && fromDefaults !== "") return fromDefaults;
    return fallbackExample(v);
  };

  const rows: Record<string, string>[] = [];
  for (let i = 0; i < Math.max(1, exampleRows); i++) {
    const row: Record<string, string> = {};
    cleaned.forEach((v) => (row[v] = exampleFor(v)));
    rows.push(row);
  }

  const safeName = templateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "template";
  exportDataFile(rows, "csv", `${safeName}-starter.csv`);
}
