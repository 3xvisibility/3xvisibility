import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { InvoiceRecord } from "./invoice-pdf";

/**
 * Legally compliant invoice generator for a French SAS, localised into the
 * customer's language (French, German, Spanish, English fallback).
 * All mandatory French mentions are kept in every language, plus a QR code
 * encoding the invoice reference so it can be verified/downloaded instantly.
 */

export const ISSUER = {
  legalName: "VERODAV GROUP",
  tradingName: "3xvisibility",
  form: "SAS",
  capital: "1 000 €",
  address: "21 rue de Cherbourg",
  postalCode: "67100",
  city: "Strasbourg",
  country: "France",
  rcs: "RCS Strasbourg 843 715 954",
  siren: "843 715 954",
  siret: "843 715 954 00027",
  vat: "FR95 843715954",
  email: "Support@3xvisibility.com",
  website: "https://3xvisibility.com",
};

const VAT_RATE = 0.2;

export type InvoiceLocale = "fr" | "de" | "es" | "en";

interface InvoiceStrings {
  intlLocale: string;
  fileWord: string;
  issuerCapital: (capital: string) => string;
  vatLabel: string;
  title: string;
  numberLabel: string;
  issuedLabel: string;
  serviceDateLabel: string;
  client: string;
  clientFallback: string;
  qrCaption: string;
  colDescription: string;
  colQty: string;
  colUnit: string;
  colTotal: string;
  defaultItem: string;
  serviceFallback: string;
  totalHt: string;
  vatRow: (rate: string) => string;
  totalTtc: string;
  refunded: string;
  netPaid: string;
  paid: string;
  statusLabel: (status: string) => string;
  paymentRef: (ref: string) => string;
  einvoicing: (status: string) => string;
  legal: string[];
}

const STRINGS: Record<InvoiceLocale, InvoiceStrings> = {
  fr: {
    intlLocale: "fr-FR",
    fileWord: "Facture",
    issuerCapital: (c) => `au capital de ${c}`,
    vatLabel: "TVA intracommunautaire",
    title: "FACTURE",
    numberLabel: "N°",
    issuedLabel: "Date d'émission",
    serviceDateLabel: "Date de la prestation",
    client: "CLIENT",
    clientFallback: "Client",
    qrCaption: "Vérification facture",
    colDescription: "DÉSIGNATION",
    colQty: "QTÉ",
    colUnit: "PU HT",
    colTotal: "TOTAL HT",
    defaultItem: "Abonnement 3xvisibility",
    serviceFallback: "Prestation",
    totalHt: "Total HT",
    vatRow: (r) => `TVA ${r} %`,
    totalTtc: "Total TTC",
    refunded: "Remboursé",
    netPaid: "Net encaissé",
    paid: "Facture acquittée — payée par carte bancaire (Stripe)",
    statusLabel: (s) => `Statut : ${s}`,
    paymentRef: (r) => `Référence de paiement : ${r}`,
    einvoicing: (s) => `E-facturation (Factur-X) : ${s}`,
    legal: [
      "Conditions de règlement : paiement comptant à réception, par prélèvement automatique via Stripe.",
      "En cas de retard de paiement, pénalités au taux de 3 fois le taux d'intérêt légal, ainsi qu'une indemnité",
      "forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).",
      "Pas d'escompte pour paiement anticipé. TVA acquittée sur les débits.",
    ],
  },
  de: {
    intlLocale: "de-DE",
    fileWord: "Rechnung",
    issuerCapital: (c) => `mit einem Kapital von ${c}`,
    vatLabel: "USt-IdNr.",
    title: "RECHNUNG",
    numberLabel: "Nr.",
    issuedLabel: "Rechnungsdatum",
    serviceDateLabel: "Leistungsdatum",
    client: "KUNDE",
    clientFallback: "Kunde",
    qrCaption: "Rechnungsprüfung",
    colDescription: "BEZEICHNUNG",
    colQty: "MENGE",
    colUnit: "EP NETTO",
    colTotal: "NETTO",
    defaultItem: "3xvisibility Abonnement",
    serviceFallback: "Leistung",
    totalHt: "Nettobetrag",
    vatRow: (r) => `MwSt. ${r} %`,
    totalTtc: "Bruttobetrag",
    refunded: "Erstattet",
    netPaid: "Netto vereinnahmt",
    paid: "Rechnung bezahlt — per Kreditkarte (Stripe)",
    statusLabel: (s) => `Status: ${s}`,
    paymentRef: (r) => `Zahlungsreferenz: ${r}`,
    einvoicing: (s) => `E-Rechnung (Factur-X): ${s}`,
    legal: [
      "Zahlungsbedingungen: sofort fällig bei Erhalt, automatischer Einzug über Stripe.",
      "Bei Zahlungsverzug fallen Verzugszinsen in Höhe des dreifachen gesetzlichen Zinssatzes sowie eine",
      "Pauschale von 40 € für Beitreibungskosten an (Art. L441-10 und D441-5 französisches Handelsgesetzbuch).",
      "Kein Skonto bei vorzeitiger Zahlung. Umsatzsteuer nach vereinbarten Entgelten.",
    ],
  },
  es: {
    intlLocale: "es-ES",
    fileWord: "Factura",
    issuerCapital: (c) => `con un capital de ${c}`,
    vatLabel: "NIF-IVA intracomunitario",
    title: "FACTURA",
    numberLabel: "N.º",
    issuedLabel: "Fecha de emisión",
    serviceDateLabel: "Fecha de la prestación",
    client: "CLIENTE",
    clientFallback: "Cliente",
    qrCaption: "Verificación de factura",
    colDescription: "DESCRIPCIÓN",
    colQty: "CANT.",
    colUnit: "P. UNIT. SIN IVA",
    colTotal: "TOTAL SIN IVA",
    defaultItem: "Suscripción 3xvisibility",
    serviceFallback: "Prestación",
    totalHt: "Base imponible",
    vatRow: (r) => `IVA ${r} %`,
    totalTtc: "Total con IVA",
    refunded: "Reembolsado",
    netPaid: "Neto cobrado",
    paid: "Factura pagada — abonada con tarjeta bancaria (Stripe)",
    statusLabel: (s) => `Estado: ${s}`,
    paymentRef: (r) => `Referencia de pago: ${r}`,
    einvoicing: (s) => `Facturación electrónica (Factur-X): ${s}`,
    legal: [
      "Condiciones de pago: pago al contado a la recepción, mediante domiciliación automática vía Stripe.",
      "En caso de retraso en el pago se aplicarán penalizaciones equivalentes a 3 veces el tipo de interés legal, así",
      "como una indemnización fija de 40 € por gastos de cobro (art. L441-10 y D441-5 del Código de Comercio francés).",
      "Sin descuento por pago anticipado. IVA devengado según los cobros.",
    ],
  },
  en: {
    intlLocale: "en-IE",
    fileWord: "Invoice",
    issuerCapital: (c) => `with a share capital of ${c}`,
    vatLabel: "EU VAT number",
    title: "INVOICE",
    numberLabel: "No.",
    issuedLabel: "Issue date",
    serviceDateLabel: "Service date",
    client: "CUSTOMER",
    clientFallback: "Customer",
    qrCaption: "Invoice verification",
    colDescription: "DESCRIPTION",
    colQty: "QTY",
    colUnit: "UNIT EXCL. VAT",
    colTotal: "TOTAL EXCL. VAT",
    defaultItem: "3xvisibility subscription",
    serviceFallback: "Service",
    totalHt: "Subtotal excl. VAT",
    vatRow: (r) => `VAT ${r}%`,
    totalTtc: "Total incl. VAT",
    refunded: "Refunded",
    netPaid: "Net received",
    paid: "Invoice paid — settled by card (Stripe)",
    statusLabel: (s) => `Status: ${s}`,
    paymentRef: (r) => `Payment reference: ${r}`,
    einvoicing: (s) => `E-invoicing (Factur-X): ${s}`,
    legal: [
      "Payment terms: due on receipt, collected automatically via Stripe.",
      "Late payment incurs interest at three times the legal rate, plus a fixed recovery fee of €40",
      "(articles L441-10 and D441-5 of the French Commercial Code).",
      "No discount for early payment. VAT accounted for on payments.",
    ],
  },
};

const COUNTRY_LOCALE: Record<string, InvoiceLocale> = {
  FR: "fr",
  BE: "fr",
  LU: "fr",
  MC: "fr",
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
};

/**
 * Picks the customer's invoice language from (in order): an explicit
 * language/locale on the invoice billing details, their billing country,
 * then French as the issuer's default.
 */
export function resolveInvoiceLocale(invoice: InvoiceRecord): InvoiceLocale {
  const details = (invoice.billing_details || {}) as Record<string, any>;
  const address = (details.address || {}) as Record<string, any>;

  const raw = String(
    details.language ?? details.locale ?? details.preferred_locales?.[0] ?? "",
  )
    .slice(0, 2)
    .toLowerCase();
  if (raw === "fr" || raw === "de" || raw === "es" || raw === "en") return raw;

  const country = String(details.country ?? address.country ?? "").toUpperCase();
  if (COUNTRY_LOCALE[country]) return COUNTRY_LOCALE[country];

  return "fr";
}

const money = (cents: number, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(
    (cents || 0) / 100,
  );

const longDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/** Payload embedded in the QR code (invoice reference + amount + issuer VAT). */
export function invoiceQrPayload(invoice: InvoiceRecord) {
  return [
    `FACTURE:${invoice.invoice_number}`,
    `TVA:${ISSUER.vat}`,
    `TTC:${((invoice.amount_total || 0) / 100).toFixed(2)}EUR`,
    `DATE:${new Date(invoice.issued_at).toISOString().slice(0, 10)}`,
    `URL:${ISSUER.website}/billing?invoice=${encodeURIComponent(invoice.invoice_number)}`,
  ].join("\n");
}

/** Builds the invoice as a jsPDF document in the customer's language. */
export async function generateFrenchInvoicePdf(
  invoice: InvoiceRecord,
  locale: InvoiceLocale = resolveInvoiceLocale(invoice),
): Promise<jsPDF> {
  const t = STRINGS[locale] ?? STRINGS.fr;
  const euro = (cents: number) => money(cents, t.intlLocale);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const right = pageWidth - margin;
  let y = margin;

  // ---- Issuer block ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(ISSUER.tradingName, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110);
  const issuerLines = [
    `${ISSUER.legalName} — ${ISSUER.form} ${t.issuerCapital(ISSUER.capital)}`,
    `${ISSUER.address}, ${ISSUER.postalCode} ${ISSUER.city}, ${ISSUER.country}`,
    `${ISSUER.rcs} — SIRET ${ISSUER.siret}`,
    `${t.vatLabel} : ${ISSUER.vat}`,
    `${ISSUER.email} — ${ISSUER.website}`,
  ];
  issuerLines.forEach((line, i) => doc.text(line, margin, y + 16 + i * 11));

  // ---- Invoice header ----
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(t.title, right, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(110);
  doc.text(`${t.numberLabel} ${invoice.invoice_number}`, right, y + 16, { align: "right" });
  doc.text(`${t.issuedLabel} : ${longDate(invoice.issued_at, t.intlLocale)}`, right, y + 29, {
    align: "right",
  });
  doc.text(
    `${t.serviceDateLabel} : ${longDate(invoice.issued_at, t.intlLocale)}`,
    right,
    y + 42,
    { align: "right" },
  );

  y += 92;
  doc.setDrawColor(225);
  doc.line(margin, y, right, y);
  y += 22;

  // ---- Client block ----
  doc.setTextColor(110);
  doc.setFontSize(8.5);
  doc.text(t.client, margin, y);
  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.text(invoice.customer_name || invoice.customer_email || t.clientFallback, margin, y + 16);
  if (invoice.customer_email) {
    doc.setFontSize(9.5);
    doc.setTextColor(90);
    doc.text(invoice.customer_email, margin, y + 30);
  }

  // ---- QR code (top right of client block) ----
  try {
    const qr = await QRCode.toDataURL(invoiceQrPayload(invoice), {
      margin: 0,
      width: 320,
      errorCorrectionLevel: "M",
    });
    doc.addImage(qr, "PNG", right - 78, y - 8, 78, 78);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(t.qrCaption, right - 39, y + 80, { align: "center" });
  } catch {
    // QR generation failure must never block the invoice
  }

  y += 104;

  // ---- Line items ----
  doc.setFillColor(245, 246, 248);
  doc.rect(margin, y, right - margin, 24, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text(t.colDescription, margin + 10, y + 16);
  doc.text(t.colQty, right - 210, y + 16, { align: "right" });
  doc.text(t.colUnit, right - 120, y + 16, { align: "right" });
  doc.text(t.colTotal, right - 10, y + 16, { align: "right" });
  y += 24;

  const lines =
    invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items
      : [
          {
            description: invoice.plan || invoice.description || t.defaultItem,
            quantity: 1,
            amount: invoice.amount_total,
          },
        ];

  doc.setTextColor(25);
  doc.setFontSize(9.5);
  let totalHt = 0;
  for (const item of lines) {
    const ttc = item.amount ?? 0;
    const ht = Math.round(ttc / (1 + VAT_RATE));
    totalHt += ht;
    const qty = item.quantity ?? 1;
    const wrapped = doc.splitTextToSize(item.description || t.serviceFallback, right - margin - 240);
    const rowHeight = Math.max(24, wrapped.length * 13 + 10);
    doc.text(wrapped, margin + 10, y + 16);
    doc.text(String(qty), right - 210, y + 16, { align: "right" });
    doc.text(euro(Math.round(ht / Math.max(qty, 1))), right - 120, y + 16, { align: "right" });
    doc.text(euro(ht), right - 10, y + 16, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(238);
    doc.line(margin, y, right, y);
  }

  const totalTtc = invoice.amount_total || 0;
  const totalVat = totalTtc - totalHt;

  // ---- Totals ----
  y += 22;
  const totalRow = (label: string, amount: string, bold = false, tone: number[] = [25, 25, 25]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 9.5);
    doc.setTextColor(bold ? 20 : 110);
    doc.text(label, right - 150, y, { align: "right" });
    doc.setTextColor(tone[0], tone[1], tone[2]);
    doc.text(amount, right - 10, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += bold ? 22 : 17;
  };

  totalRow(t.totalHt, euro(totalHt));
  totalRow(t.vatRow((VAT_RATE * 100).toFixed(0)), euro(totalVat));
  totalRow(t.totalTtc, euro(totalTtc), true);

  if (invoice.amount_refunded > 0) {
    totalRow(t.refunded, `- ${euro(invoice.amount_refunded)}`, false, [190, 60, 60]);
    totalRow(t.netPaid, euro(totalTtc - invoice.amount_refunded), true);
  }

  // ---- Payment + legal mentions ----
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(25);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.status === "paid" ? t.paid : t.statusLabel(invoice.status), margin, y);
  doc.setFont("helvetica", "normal");
  y += 18;

  doc.setFontSize(7.5);
  doc.setTextColor(120);
  const paymentRef = invoice.stripe_invoice_id || invoice.stripe_charge_id;
  const legal = [
    ...t.legal,
    paymentRef ? t.paymentRef(paymentRef) : "",
    invoice.einvoicing_status && invoice.einvoicing_status !== "not_configured"
      ? t.einvoicing(
          `${invoice.einvoicing_status}${invoice.einvoicing_pa ? ` — ${invoice.einvoicing_pa}` : ""}`,
        )
      : "",
  ].filter(Boolean);
  legal.forEach((line, i) => doc.text(line, margin, y + i * 10));

  return doc;
}

/** Localised file name, e.g. Rechnung-INV-2026-001.pdf */
export function invoiceFileName(invoice: InvoiceRecord, locale?: InvoiceLocale) {
  const l = locale ?? resolveInvoiceLocale(invoice);
  return `${(STRINGS[l] ?? STRINGS.fr).fileWord}-${invoice.invoice_number}.pdf`;
}

export async function downloadFrenchInvoicePdf(
  invoice: InvoiceRecord,
  locale?: InvoiceLocale,
) {
  const l = locale ?? resolveInvoiceLocale(invoice);
  const doc = await generateFrenchInvoicePdf(invoice, l);
  doc.save(invoiceFileName(invoice, l));
}

/** Returns the PDF as a base64 string (no data-url prefix) for upload/email. */
export async function frenchInvoicePdfBase64(
  invoice: InvoiceRecord,
  locale?: InvoiceLocale,
): Promise<string> {
  const doc = await generateFrenchInvoicePdf(invoice, locale);
  const dataUri = doc.output("datauristring");
  return dataUri.slice(dataUri.indexOf(",") + 1);
}
