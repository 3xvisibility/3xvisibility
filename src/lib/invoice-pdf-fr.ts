import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { InvoiceRecord } from "./invoice-pdf";

/**
 * French compliant invoice ("facture") generator.
 * Includes all mentions obligatoires for a French SAS plus a QR code that
 * encodes the invoice reference so it can be verified/downloaded instantly.
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
  email: "info@3xvisibility.com",
  website: "https://3xvisibility.com",
};

const VAT_RATE = 0.2;

const euro = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    (cents || 0) / 100,
  );

const frDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

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

/** Builds the French invoice as a jsPDF document (async: QR code rendering). */
export async function generateFrenchInvoicePdf(invoice: InvoiceRecord): Promise<jsPDF> {
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
    `${ISSUER.legalName} — ${ISSUER.form} au capital de ${ISSUER.capital}`,
    `${ISSUER.address}, ${ISSUER.postalCode} ${ISSUER.city}, ${ISSUER.country}`,
    `${ISSUER.rcs} — SIRET ${ISSUER.siret}`,
    `TVA intracommunautaire : ${ISSUER.vat}`,
    `${ISSUER.email} — ${ISSUER.website}`,
  ];
  issuerLines.forEach((line, i) => doc.text(line, margin, y + 16 + i * 11));

  // ---- Invoice header ----
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FACTURE", right, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(110);
  doc.text(`N° ${invoice.invoice_number}`, right, y + 16, { align: "right" });
  doc.text(`Date d'émission : ${frDate(invoice.issued_at)}`, right, y + 29, { align: "right" });
  doc.text(`Date de la prestation : ${frDate(invoice.issued_at)}`, right, y + 42, {
    align: "right",
  });

  y += 92;
  doc.setDrawColor(225);
  doc.line(margin, y, right, y);
  y += 22;

  // ---- Client block ----
  doc.setTextColor(110);
  doc.setFontSize(8.5);
  doc.text("CLIENT", margin, y);
  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.text(invoice.customer_name || invoice.customer_email || "Client", margin, y + 16);
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
    doc.text("Vérification facture", right - 39, y + 80, { align: "center" });
  } catch {
    // QR generation failure must never block the invoice
  }

  y += 104;

  // ---- Line items ----
  doc.setFillColor(245, 246, 248);
  doc.rect(margin, y, right - margin, 24, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(90);
  doc.text("DÉSIGNATION", margin + 10, y + 16);
  doc.text("QTÉ", right - 210, y + 16, { align: "right" });
  doc.text("PU HT", right - 120, y + 16, { align: "right" });
  doc.text("TOTAL HT", right - 10, y + 16, { align: "right" });
  y += 24;

  const lines =
    invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items
      : [
          {
            description: invoice.plan || invoice.description || "Abonnement 3xvisibility",
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
    const wrapped = doc.splitTextToSize(item.description || "Prestation", right - margin - 240);
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

  totalRow("Total HT", euro(totalHt));
  totalRow(`TVA ${(VAT_RATE * 100).toFixed(0)} %`, euro(totalVat));
  totalRow("Total TTC", euro(totalTtc), true);

  if (invoice.amount_refunded > 0) {
    totalRow("Remboursé", `- ${euro(invoice.amount_refunded)}`, false, [190, 60, 60]);
    totalRow("Net encaissé", euro(totalTtc - invoice.amount_refunded), true);
  }

  // ---- Payment + legal mentions ----
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(25);
  doc.setFont("helvetica", "bold");
  doc.text(
    invoice.status === "paid" ? "Facture acquittée — payée par carte bancaire (Stripe)" : `Statut : ${invoice.status}`,
    margin,
    y,
  );
  doc.setFont("helvetica", "normal");
  y += 18;

  doc.setFontSize(7.5);
  doc.setTextColor(120);
  const legal = [
    "Conditions de règlement : paiement comptant à réception, par prélèvement automatique via Stripe.",
    "En cas de retard de paiement, pénalités au taux de 3 fois le taux d'intérêt légal, ainsi qu'une indemnité",
    "forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).",
    "Pas d'escompte pour paiement anticipé. TVA acquittée sur les débits.",
    invoice.stripe_invoice_id || invoice.stripe_charge_id
      ? `Référence de paiement : ${invoice.stripe_invoice_id || invoice.stripe_charge_id}`
      : "",
    invoice.einvoicing_status && invoice.einvoicing_status !== "not_configured"
      ? `E-facturation (Factur-X) : ${invoice.einvoicing_status}${invoice.einvoicing_pa ? ` — ${invoice.einvoicing_pa}` : ""}`
      : "",
  ].filter(Boolean);
  legal.forEach((line, i) => doc.text(line, margin, y + i * 10));

  return doc;
}

export async function downloadFrenchInvoicePdf(invoice: InvoiceRecord) {
  const doc = await generateFrenchInvoicePdf(invoice);
  doc.save(`Facture-${invoice.invoice_number}.pdf`);
}

/** Returns the PDF as a base64 string (no data-url prefix) for upload/email. */
export async function frenchInvoicePdfBase64(invoice: InvoiceRecord): Promise<string> {
  const doc = await generateFrenchInvoicePdf(invoice);
  const dataUri = doc.output("datauristring");
  return dataUri.slice(dataUri.indexOf(",") + 1);
}
