import { jsPDF } from "jspdf";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  amount: number; // cents
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_email: string | null;
  customer_name: string | null;
  description: string | null;
  plan: string | null;
  amount_total: number;
  amount_refunded: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  receipt_url: string | null;
  line_items: InvoiceLineItem[] | null;
  billing_details: Record<string, unknown> | null;
  issued_at: string;
  stripe_charge_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_intent?: string | null;
  user_id?: string | null;
}

export const formatInvoiceMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((cents || 0) / 100);

interface IssuerDetails {
  name?: string;
  email?: string;
  website?: string;
}

/** Draws one invoice onto the current page of an existing jsPDF document. */
function renderInvoice(doc: jsPDF, invoice: InvoiceRecord, issuer: IssuerDetails = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const right = pageWidth - margin;
  let y = margin;

  const company = issuer.name || "3Xvisibility";
  const companyEmail = issuer.email || "3xvisibility@gmail.com";
  const companySite = issuer.website || "https://3xvisibility.com";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(company, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(companySite, margin, y + 15);
  doc.text(companyEmail, margin, y + 28);

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", right, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(invoice.invoice_number, right, y + 16, { align: "right" });
  doc.text(
    new Date(invoice.issued_at).toLocaleDateString("en-US", { dateStyle: "long" }),
    right,
    y + 30,
    { align: "right" },
  );

  y += 58;
  doc.setDrawColor(225);
  doc.line(margin, y, right, y);
  y += 24;

  // Bill to
  doc.setTextColor(110);
  doc.setFontSize(9);
  doc.text("BILL TO", margin, y);
  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.text(invoice.customer_name || invoice.customer_email || "Customer", margin, y + 16);
  if (invoice.customer_email) {
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(invoice.customer_email, margin, y + 31);
  }

  // Status
  doc.setTextColor(110);
  doc.setFontSize(9);
  doc.text("STATUS", right, y, { align: "right" });
  doc.setFontSize(12);
  doc.setTextColor(invoice.status === "paid" ? 22 : 180, invoice.status === "paid" ? 140 : 90, 60);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.status.replace("_", " ").toUpperCase(), right, y + 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20);

  y += 60;

  // Table header
  doc.setFillColor(245, 246, 248);
  doc.rect(margin, y, right - margin, 24, "F");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("DESCRIPTION", margin + 10, y + 16);
  doc.text("QTY", right - 170, y + 16, { align: "right" });
  doc.text("AMOUNT", right - 10, y + 16, { align: "right" });
  y += 24;

  const lines: InvoiceLineItem[] =
    invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items
      : [
          {
            description: invoice.plan || invoice.description || "Subscription payment",
            quantity: 1,
            amount: invoice.amount_total,
          },
        ];

  doc.setTextColor(25);
  doc.setFontSize(10);
  for (const item of lines) {
    const wrapped = doc.splitTextToSize(item.description || "Item", right - margin - 220);
    const rowHeight = Math.max(24, wrapped.length * 14 + 10);
    doc.text(wrapped, margin + 10, y + 16);
    doc.text(String(item.quantity ?? 1), right - 170, y + 16, { align: "right" });
    doc.text(formatInvoiceMoney(item.amount ?? 0, invoice.currency), right - 10, y + 16, {
      align: "right",
    });
    y += rowHeight;
    doc.setDrawColor(238);
    doc.line(margin, y, right, y);
  }

  // Totals
  y += 20;
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text("Subtotal", right - 150, y, { align: "right" });
  doc.setTextColor(25);
  doc.text(formatInvoiceMoney(invoice.amount_total, invoice.currency), right - 10, y, {
    align: "right",
  });

  if (invoice.amount_refunded > 0) {
    y += 18;
    doc.setTextColor(110);
    doc.text("Refunded", right - 150, y, { align: "right" });
    doc.setTextColor(190, 60, 60);
    doc.text(`- ${formatInvoiceMoney(invoice.amount_refunded, invoice.currency)}`, right - 10, y, {
      align: "right",
    });
  }

  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.text("Total paid", right - 150, y, { align: "right" });
  doc.text(
    formatInvoiceMoney(invoice.amount_total - (invoice.amount_refunded || 0), invoice.currency),
    right - 10,
    y,
    { align: "right" },
  );
  doc.setFont("helvetica", "normal");

  // Footer
  y += 48;
  doc.setFontSize(9);
  doc.setTextColor(130);
  if (invoice.stripe_charge_id || invoice.stripe_invoice_id) {
    doc.text(
      `Reference: ${invoice.stripe_invoice_id || invoice.stripe_charge_id}`,
      margin,
      y,
    );
    y += 14;
  }
  doc.text("Thank you for your business. This invoice was generated automatically.", margin, y);

  return doc;
}

export function downloadInvoicePdf(invoice: InvoiceRecord, issuer?: IssuerDetails) {
  const doc = generateInvoicePdf(invoice, issuer);
  doc.save(`${invoice.invoice_number}.pdf`);
}
