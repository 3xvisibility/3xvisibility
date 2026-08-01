import { jsPDF } from "jspdf";

export type AnalyzerCheckStatus = "good" | "warn" | "bad";

export interface AnalyzerCheck {
  id: string;
  label: string;
  status: AnalyzerCheckStatus;
  detail: string;
  fix: string;
}

export interface AnalyzerCategory {
  key: string;
  label: string;
  score: number;
  checks: AnalyzerCheck[];
}

export interface AnalyzerReport {
  url: string;
  host: string;
  title: string;
  description: string;
  overall: number;
  categories: AnalyzerCategory[];
  issueCount: number;
  topFixes: { label: string; detail: string; fix: string }[];
}

const BRAND: [number, number, number] = [106, 206, 40];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const AMBER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [220, 38, 38];

const MARGIN = 48;

function statusColor(status: AnalyzerCheckStatus): [number, number, number] {
  if (status === "good") return BRAND;
  if (status === "warn") return AMBER;
  return RED;
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return BRAND;
  if (score >= 50) return AMBER;
  return RED;
}

export function buildAnalyzerPdf(report: AnalyzerReport): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 60) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ---- header band -------------------------------------------------------
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setFillColor(...BRAND);
  doc.rect(0, 108, pageW, 4, "F");

  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("3XVISIBILITY", MARGIN, 40);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Website Health Report", MARGIN, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 205, 215);
  doc.text(doc.splitTextToSize(report.url, contentW - 140)[0], MARGIN, 88);

  // overall score badge
  const badgeX = pageW - MARGIN - 92;
  doc.setFillColor(...scoreColor(report.overall));
  doc.roundedRect(badgeX, 30, 92, 58, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(String(report.overall), badgeX + 46, 60, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("OVERALL SCORE", badgeX + 46, 76, { align: "center" });

  y = 140;

  // ---- summary -----------------------------------------------------------
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(report.host, MARGIN, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const meta = [
    report.title ? `Title: ${report.title}` : "Title: not found",
    report.description ? `Description: ${report.description}` : "Description: missing",
    `Issues found: ${report.issueCount}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  meta.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, contentW);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 12;
  });

  y += 10;

  // ---- category scores ---------------------------------------------------
  const colW = (contentW - 20) / 3;
  ensureSpace(70);
  report.categories.forEach((cat, i) => {
    const x = MARGIN + i * (colW + 10);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, y, colW, 54, 6, 6, "FD");
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(cat.label, colW - 20)[0], x + 10, y + 20);
    doc.setFontSize(18);
    doc.setTextColor(...scoreColor(cat.score));
    doc.text(`${cat.score}%`, x + 10, y + 42);
  });
  y += 78;

  // ---- detailed checks ---------------------------------------------------
  report.categories.forEach((cat) => {
    ensureSpace(60);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(cat.label, MARGIN, y);
    doc.setTextColor(...scoreColor(cat.score));
    doc.text(`${cat.score}%`, pageW - MARGIN, y, { align: "right" });
    y += 8;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    y += 16;

    cat.checks.forEach((check) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const labelLines = doc.splitTextToSize(check.label, contentW - 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const detailLines = doc.splitTextToSize(check.detail, contentW - 24);
      const fixLines = check.status === "good" ? [] : doc.splitTextToSize(`Fix: ${check.fix}`, contentW - 24);
      const blockH = labelLines.length * 12 + detailLines.length * 11 + fixLines.length * 11 + 12;
      ensureSpace(blockH);

      doc.setFillColor(...statusColor(check.status));
      doc.circle(MARGIN + 4, y - 3.5, 3.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(labelLines, MARGIN + 16, y);
      y += labelLines.length * 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(detailLines, MARGIN + 16, y);
      y += detailLines.length * 11;

      if (fixLines.length) {
        doc.setTextColor(...BRAND);
        doc.text(fixLines, MARGIN + 16, y);
        y += fixLines.length * 11;
      }
      y += 12;
    });
    y += 6;
  });

  // ---- improvement plan --------------------------------------------------
  if (report.topFixes.length) {
    ensureSpace(80);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Your improvement plan", MARGIN, y);
    y += 8;
    doc.setDrawColor(...BRAND);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    y += 18;

    report.topFixes.forEach((fix, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const head = doc.splitTextToSize(`${i + 1}. ${fix.label} — ${fix.detail}`, contentW);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const body = doc.splitTextToSize(fix.fix, contentW - 14);
      ensureSpace(head.length * 12 + body.length * 11 + 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(head, MARGIN, y);
      y += head.length * 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND);
      doc.text(body, MARGIN + 14, y);
      y += body.length * 11 + 12;
    });
  }

  // ---- footers -----------------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Report by 3xVisibility — 3xvisibility.com", MARGIN, pageH - 28);
    doc.text(`Page ${p} of ${pages}`, pageW - MARGIN, pageH - 28, { align: "right" });
  }

  return doc;
}

export function downloadAnalyzerPdf(report: AnalyzerReport): void {
  const doc = buildAnalyzerPdf(report);
  const safeHost = report.host.replace(/[^a-z0-9.-]/gi, "-");
  doc.save(`website-report-${safeHost}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
