"use client";
import React, { useState, useRef } from "react";
import {
  FileText,
  Download,
  Settings,
  Lock,
  Loader2,
  Database,
  User,
  BarChart3,
  PieChart,
  Brain,
} from "lucide-react";
import { generateReport } from "@/services/api";

interface ShapEntry {
  feature: string;
  impact_value: number;
  impact_type: "positive" | "negative";
  display_value: string;
}

interface ReportResult {
  report_id: string;
  generated_at: string;
  report_type: string;
  account_id: string | null;
  stats: Record<string, number>;
  category_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
  risk_buckets: Record<string, number>;
  shap_data: ShapEntry[] | null;
  llm_summary: string;
  transactions: {
    id: string;
    accountSource: string;
    destination: string;
    amount: number;
    riskScore: number;
    category: string;
    status: string;
  }[];
  pii_redaction: boolean;
  includeTxTable: boolean;
  message: string;
}

// ── Pure jsPDF generator (no html2canvas) ─────────────────────────────────
async function generatePDF(report: ReportResult) {
  const jspdfModule = await import("jspdf");
  const jsPDF = jspdfModule.default;

  const pdf = new jsPDF("p", "mm", "a4");
  const pw = 210; // page width mm
  const ph = 297; // page height mm
  const ml = 14;  // left margin
  const mr = 14;  // right margin
  const mt = 14;  // top margin
  const cw = pw - ml - mr; // content width

  let y = mt;

  function addSection(title: string, body: string) {
    if (y > ph - 40) {
      pdf.addPage();
      y = mt;
    }
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, ml, y);
    y += 6;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(body, cw) as string[];
    pdf.text(lines, ml, y);
    y += lines.length * 4.5 + 3;
  }

  function addStatsRow(items: { label: string; value: string | number }[]) {
    if (y > ph - 25) {
      pdf.addPage();
      y = mt;
    }
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    const colW = cw / items.length;
    items.forEach((item, i) => {
      pdf.text(item.label, ml + i * colW, y, { align: "left" });
    });
    y += 4;
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    items.forEach((item, i) => {
      pdf.text(String(item.value), ml + i * colW, y, { align: "left" });
    });
    y += 8;
  }

  // ── Header ──
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("NIRIKSHAK AI AUDIT REPORT", ml, y);
  y += 6;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Report ID: ${report.report_id}  |  Generated: ${new Date(report.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}  |  Type: ${report.report_type.toUpperCase()}${
      report.account_id ? `  |  Account: ${report.account_id}` : ""
    }`,
    ml,
    y
  );
  y += 2;
  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(1);
  pdf.line(ml, y, ml + cw, y);
  y += 8;

  // ── Account-specific verdict + SHAP ──
  if (report.report_type === "account") {
    /* Verdict box */
    const isFlagged = report.stats.flagged > 0;
    const boxH = 22;
    if (y + boxH > ph - 20) { pdf.addPage(); y = mt; }
    pdf.setFillColor(isFlagged ? 220 : 16, isFlagged ? 38 : 185, isFlagged ? 38 : 129);
    pdf.roundedRect(ml, y, cw, boxH, 3, 3, "F");
    pdf.setTextColor(255);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Account ID: ${report.account_id || ""}`, ml + 4, y + 6);
    pdf.setFontSize(11);
    pdf.text(isFlagged ? "SUSPECTED MULE" : "LOW RISK", ml + 4, y + 15);
    pdf.setFontSize(9);
    pdf.text(`Max Risk: ${report.stats.max_risk || "N/A"}%  |  Avg: ${report.stats.avg_risk}%  |  ${report.stats.total} tx`, ml + cw - 4, y + 15, { align: "right" });
    pdf.setTextColor(0);
    y += boxH + 6;

    /* SHAP bars */
    if (report.shap_data && report.shap_data.length > 0) {
      addSection("SHAP Feature Analysis (Top 8)", "");
      const topShap = [...report.shap_data].sort((a, b) => Math.abs(b.impact_value) - Math.abs(a.impact_value)).slice(0, 8);
      const maxAbs = Math.max(...topShap.map((x) => Math.abs(x.impact_value)), 0.001);
      topShap.forEach((s) => {
        if (y > ph - 15) { pdf.addPage(); y = mt; }
        const pct = Math.round((Math.abs(s.impact_value) / maxAbs) * 100);
        const barW = (pct / 100) * (cw * 0.65);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(s.feature, ml, y);
        pdf.setFont("helvetica", "bold");
        pdf.text(s.display_value, ml + cw * 0.7, y, { align: "right" });
        y += 3;
        pdf.setFillColor(s.impact_type === "positive" ? 220 : 16, s.impact_type === "positive" ? 38 : 185, s.impact_type === "positive" ? 38 : 129);
        if (barW > 1) pdf.roundedRect(ml, y, barW, 3, 1, 1, "F");
        y += 5;
      });
    }
  }

  // ── Dataset stats cards ──
  addStatsRow([
    { label: "Total", value: report.stats.total },
    { label: "Flagged", value: report.stats.flagged },
    { label: "High Risk", value: report.stats.high_risk },
    { label: "Avg Risk", value: `${report.stats.avg_risk}%` },
  ]);

  // ── Category Distribution ──
  if (Object.keys(report.category_distribution).length > 0) {
    if (y > ph - 50) { pdf.addPage(); y = mt; }
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Risk Categories", ml, y);
    y += 5;
    const catMax = Math.max(...Object.values(report.category_distribution), 1);
    Object.entries(report.category_distribution).forEach(([cat, count]) => {
      if (y > ph - 15) { pdf.addPage(); y = mt; }
      const barW = (count / catMax) * (cw * 0.6);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${cat} (${count})`, ml, y);
      y += 3;
      pdf.setFillColor(0, 82, 255);
      if (barW > 1) pdf.roundedRect(ml, y, barW, 3, 1, 1, "F");
      y += 5;
    });
  }

  // ── LLM Summary ──
  if (report.llm_summary) {
    addSection("AI-Generated Summary", report.llm_summary);
  }

  // ── Transaction Table ──
  if (report.includeTxTable && report.transactions.length > 0) {
    if (y > ph - 30) { pdf.addPage(); y = mt; }
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Transaction Table", ml, y);
    y += 6;

    const cols = ["Account", "Dest", "Amount", "Risk", "Category", "Status"];
    const colWidths = [cw * 0.18, cw * 0.18, cw * 0.14, cw * 0.12, cw * 0.2, cw * 0.18];
    let x = ml;

    // Header row
    pdf.setFillColor(241, 245, 249);
    pdf.rect(ml, y - 3, cw, 6, "F");
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "bold");
    cols.forEach((c, i) => {
      pdf.text(c, x, y);
      x += colWidths[i];
    });
    y += 6;

    let pg = (pdf as any).getNumberOfPages();
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    report.transactions.slice(0, 50).forEach((tx) => {
      if (y > ph - 8) {
        pdf.addPage();
        pg++;
        y = mt;
        // Draw header again
        pdf.setFillColor(241, 245, 249);
        pdf.rect(ml, y - 3, cw, 6, "F");
        pdf.setFontSize(6);
        pdf.setFont("helvetica", "bold");
        let hx = ml;
        cols.forEach((c, i) => {
          pdf.text(c, hx, y);
          hx += colWidths[i];
        });
        y += 6;
        pdf.setFontSize(6);
        pdf.setFont("helvetica", "normal");
      }
      let hx = ml;
      const vals = [
        tx.accountSource,
        tx.destination,
        `$${tx.amount.toLocaleString()}`,
        `${tx.riskScore.toFixed(1)}%`,
        tx.category,
        tx.status,
      ];
      vals.forEach((v, i) => {
        pdf.text(v.substring(0, 18), hx, y);
        hx += colWidths[i];
      });
      y += 4;
    });
  }

  // ── Footer ──
  pdf.setFontSize(7);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Cryptographically signed · FIU Compliant · Report ID: ${report.report_id}`, ml, ph - 8);

  pdf.save(`${report.report_id}.pdf`);
}

// ── HTML report generator for downloadable file ───────────────────────────
function generateHTMLReport(report: ReportResult): string {
  const txRows = report.includeTxTable
    ? report.transactions
        .slice(0, 50)
        .map(
          (tx) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace">${tx.accountSource}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#64748b">${tx.destination}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:700">$${tx.amount.toLocaleString()}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:${tx.riskScore >= 80 ? "#dc2626" : tx.riskScore >= 50 ? "#d97706" : "#059669"}">${tx.riskScore.toFixed(1)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${tx.category}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${tx.status}</td>
      </tr>`
        )
        .join("")
    : "";

  const shapSection = report.shap_data && report.shap_data.length > 0
    ? `<div style="margin:24px 32px">
        <h2 style="font-size:14px;font-weight:700;margin:0 0 12px">SHAP Feature Analysis</h2>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px">
          ${report.shap_data.sort((a, b) => Math.abs(b.impact_value) - Math.abs(a.impact_value)).slice(0, 8).map(s => {
            const maxAbs = Math.max(...report.shap_data!.map(x => Math.abs(x.impact_value)), 0.001);
            const pct = Math.round((Math.abs(s.impact_value) / maxAbs) * 100);
            return `<div style="margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
                <span style="font-family:monospace;color:#475569">${s.feature}</span>
                <span style="font-weight:700;color:${s.impact_type === "positive" ? "#dc2626" : "#059669"}">${s.display_value}</span>
              </div>
              <div style="width:100%;background:#e2e8f0;height:4px;border-radius:2px;overflow:hidden">
                <div style="height:100%;border-radius:2px;background:${s.impact_type === "positive" ? "#ef4444" : "#10b981"};width:${pct}%"></div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${report.report_id} — Audit Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:40px; color:#1e293b; background:#f8fafc; }
    .container { max-width:900px; margin:0 auto; background:white; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1); overflow:hidden; }
    .header { padding:32px; border-bottom:4px solid #1e293b; }
    .header h1 { margin:0; font-size:24px; }
    .header .meta { margin-top:8px; font-size:12px; color:#64748b; font-family:monospace; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead th { padding:12px; text-align:left; font-size:10px; text-transform:uppercase; color:#64748b; border-bottom:2px solid #e2e8f0; background:#f8fafc; }
    .footer { padding:16px 24px; border-top:1px solid #e2e8f0; font-size:10px; color:#94a3b8; background:#f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NIRIKSHAK AI AUDIT REPORT</h1>
      <div class="meta">
        Report ID: ${report.report_id} | Generated: ${new Date(report.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} | Type: ${report.report_type.toUpperCase()}${report.account_id ? ` | Account: ${report.account_id}` : ""} | PII: ${report.pii_redaction ? "ACTIVE" : "DISABLED"}
      </div>
    </div>
    ${shapSection}
    <div style="padding:24px;border-bottom:1px solid #e2e8f0">
      <h2 style="font-size:14px;font-weight:700;margin:0 0 12px">AI-Generated Summary</h2>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:13px;line-height:1.6;white-space:pre-wrap;color:#334155">${report.llm_summary}</div>
    </div>
    <table>
      <thead><tr><th>Account</th><th>Dest</th><th>Amount</th><th>Risk</th><th>Category</th><th>Status</th></tr></thead>
      <tbody>${txRows}</tbody>
    </table>
    <div class="footer">🔒 Cryptographically signed · FIU Compliant · Report ID: ${report.report_id}</div>
  </div>
</body>
</html>`;
}

export default function ReportsView() {
  const [reportType, setReportType] = useState<"dataset" | "account">("dataset");
  const [accountId, setAccountId] = useState("");
  const [includeRisk, setIncludeRisk] = useState(true);
  const [includeShap, setIncludeShap] = useState(true);
  const [includeTxTable, setIncludeTxTable] = useState(true);
  const [piiRedact, setPiiRedact] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleGenerate = async () => {
    if (reportType === "account" && !accountId.trim()) {
      setError("Please enter an account ID.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setReport(null);
    try {
      const data = await generateReport({
        report_type: reportType,
        account_id: reportType === "account" ? accountId.trim() : undefined,
        include_risk_analysis: includeRisk,
        include_shap: includeShap,
        include_transaction_table: includeTxTable,
        pii_redaction: piiRedact,
      });
      setReport(data as unknown as ReportResult);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail || "Failed to generate report.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const htmlContent = generateHTMLReport(report);
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.report_id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-800">Audit Reports</h2>
        <p className="text-sm text-slate-500 mt-1">
          Generate AI-powered compliance reports with charts and LLM summary.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Configuration panel */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Configuration
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-2">
                  Report Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReportType("dataset")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      reportType === "dataset"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-700">
                      Full Dataset
                    </span>
                  </button>
                  <button
                    onClick={() => setReportType("account")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      reportType === "account"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-700">
                      Single Account
                    </span>
                  </button>
                </div>
              </div>

              {reportType === "account" && (
                <div>
                  <label className="font-bold text-slate-600 block mb-1">
                    Account ID
                  </label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="e.g. ACC-0482-11"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-600 block">
                  Inclusions
                </label>
                {[
                  { key: "includeRisk", label: "Risk Analysis Summary", checked: includeRisk, set: setIncludeRisk },
                  { key: "includeShap", label: "SHAP Explainability Data", checked: includeShap, set: setIncludeShap },
                  { key: "includeTxTable", label: "Transaction Table", checked: includeTxTable, set: setIncludeTxTable },
                  { key: "piiRedact", label: "PII Redaction", checked: piiRedact, set: setPiiRedact },
                ].map(({ key, label, checked, set }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => set(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <span className="font-semibold text-slate-700">{label}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-xs disabled:opacity-50 transition-colors"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating with AI...</>
                ) : (
                  <><FileText className="w-4 h-4" /> Generate Report</>
                )}
              </button>

              {report && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  {downloading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating PDF...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Download PDF</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report preview */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
          )}

          {!report && !isGenerating && (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold">Configure and generate a report</p>
              <p className="text-xs mt-1">Choose report type and inclusions, then click Generate.</p>
            </div>
          )}

          {isGenerating && (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
              <p className="font-semibold">Generating report with AI...</p>
            </div>
          )}

          {report && !isGenerating && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b-4 border-slate-800">
                <h4 className="text-xl font-extrabold text-slate-900">NIRIKSHAK AI AUDIT REPORT</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-slate-500 font-mono">
                  <span>Report ID: {report.report_id}</span>
                  <span>Generated: {new Date(report.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span>Type: {report.report_type.toUpperCase()}</span>
                  {report.account_id && <span>Account: {report.account_id}</span>}
                </div>
              </div>

              {/* Account report — verdict + SHAP */}
              {report.report_type === "account" && (
                <>
                  <div className={`mx-6 mt-6 rounded-2xl p-5 text-white ${report.stats.flagged > 0 ? "bg-red-600" : "bg-emerald-600"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold opacity-80">Account ID</p>
                        <p className="text-xl font-black mt-0.5 font-mono">{report.account_id}</p>
                        <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-xl text-xs font-bold ${report.stats.flagged > 0 ? "bg-red-700" : "bg-emerald-700"}`}>
                          {report.stats.flagged > 0 ? "⚠ SUSPECTED MULE" : "✓ LOW RISK"}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs opacity-80">Max Risk Score</p>
                        <p className="text-4xl font-black">{report.stats.max_risk || "—"}%</p>
                        <p className="text-xs opacity-80">Avg: {report.stats.avg_risk}% · {report.stats.total} tx</p>
                      </div>
                    </div>
                  </div>

                  {report.shap_data && report.shap_data.length > 0 && (
                    <div className="px-6 mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-blue-600" />
                        <h5 className="text-xs font-bold text-slate-700 uppercase">SHAP Feature Analysis</h5>
                      </div>
                      <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                        {[...report.shap_data]
                          .sort((a, b) => Math.abs(b.impact_value) - Math.abs(a.impact_value))
                          .slice(0, 8)
                          .map((s, i) => {
                            const maxAbs = Math.max(...report.shap_data!.map((x) => Math.abs(x.impact_value)), 0.001);
                            const pct = Math.round((Math.abs(s.impact_value) / maxAbs) * 100);
                            return (
                              <div key={i}>
                                <div className="flex justify-between text-[10px] mb-0.5">
                                  <span className="font-mono text-slate-600 truncate">{s.feature}</span>
                                  <span className={`font-bold ${s.impact_type === "positive" ? "text-red-600" : "text-emerald-600"}`}>{s.display_value}</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${s.impact_type === "positive" ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Dataset report — stats */}
              {report.report_type === "dataset" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-slate-50 border-b">
                  {[
                    { label: "Total", value: report.stats.total },
                    { label: "Flagged", value: report.stats.flagged },
                    { label: "High Risk", value: report.stats.high_risk },
                    { label: "Avg Risk", value: `${report.stats.avg_risk}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-xl p-3 border text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dataset charts */}
              {report.report_type === "dataset" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-blue-600" /> Categories</h5>
                    {Object.entries(report.category_distribution).map(([cat, count]) => {
                      const maxVal = Math.max(...Object.values(report.category_distribution), 1);
                      return (
                        <div key={cat} className="mb-2">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-600 truncate">{cat}</span>
                            <span className="font-bold text-slate-800">{count}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#0052FF] h-full rounded-full" style={{ width: `${(count / maxVal) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1"><PieChart className="w-3.5 h-3.5 text-blue-600" /> Status</h5>
                    {Object.entries(report.status_distribution).map(([status, count]) => {
                      const total = Object.values(report.status_distribution).reduce((a, b) => a + b, 0) || 1;
                      const pct = Math.round((count / total) * 100);
                      const colors: Record<string, string> = { "Active Alert": "bg-red-500", "Under Review": "bg-amber-500", Resolved: "bg-emerald-500" };
                      return (
                        <div key={status} className="flex items-center gap-2 mb-1.5 text-[10px]">
                          <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || "bg-slate-400"}`} />
                          <span className="text-slate-600 flex-1">{status}</span>
                          <span className="font-bold text-slate-800">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-blue-600" /> Risk Distribution</h5>
                    {Object.entries(report.risk_buckets).map(([range, count]) => {
                      const maxVal = Math.max(...Object.values(report.risk_buckets), 1);
                      return (
                        <div key={range} className="mb-2">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-600">{range}</span>
                            <span className="font-bold text-slate-800">{count}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(count / maxVal) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account stats */}
              {report.report_type === "account" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 bg-slate-50 border-b">
                  {[
                    { label: "Transactions", value: report.stats.total },
                    { label: "Flagged", value: report.stats.flagged },
                    { label: "High Risk", value: report.stats.high_risk },
                    { label: "Avg Risk", value: `${report.stats.avg_risk}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-xl p-3 border text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* LLM Summary */}
              <div className="p-6 border-b">
                <h5 className="text-xs font-bold text-slate-700 mb-3">AI-Generated Summary</h5>
                <div className="bg-slate-50 border rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{report.llm_summary}</div>
              </div>

              {/* Transaction table */}
              {report.includeTxTable && report.transactions.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b">
                      <tr>
                        <th className="px-5 py-3">Account</th>
                        <th className="px-5 py-3">Destination</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Risk</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.transactions.slice(0, 50).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-mono font-semibold">{tx.accountSource}</td>
                          <td className="px-5 py-3 text-slate-500">{tx.destination}</td>
                          <td className="px-5 py-3 font-bold">${tx.amount.toLocaleString()}</td>
                          <td className="px-5 py-3">
                            <span className={`font-bold ${tx.riskScore >= 80 ? "text-red-600" : tx.riskScore >= 50 ? "text-amber-600" : "text-emerald-600"}`}>
                              {tx.riskScore.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-5 py-3">{tx.category}</td>
                          <td className="px-5 py-3">{tx.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.transactions.length > 50 && (
                    <p className="px-5 py-3 text-[10px] text-slate-400 text-center border-t">Showing 50 of {report.transactions.length} transactions</p>
                  )}
                </div>
              )}

              {/* Dataset SHAP */}
              {report.report_type === "dataset" && report.shap_data && report.shap_data.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-bold text-slate-700 uppercase">Top SHAP Features (Highest Risk Transaction)</h5>
                  </div>
                  <div className="bg-slate-50 border rounded-xl p-4 space-y-3">
                    {[...report.shap_data].sort((a, b) => Math.abs(b.impact_value) - Math.abs(a.impact_value)).slice(0, 6).map((s, i) => {
                      const maxAbs = Math.max(...report.shap_data!.map((x) => Math.abs(x.impact_value)), 0.001);
                      const pct = Math.round((Math.abs(s.impact_value) / maxAbs) * 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="font-mono text-slate-600 truncate">{s.feature}</span>
                            <span className={`font-bold ${s.impact_type === "positive" ? "text-red-600" : "text-emerald-600"}`}>{s.display_value}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.impact_type === "positive" ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50">
                <Lock className="w-3.5 h-3.5" />
                <span>Cryptographically signed · FIU Compliant · Report ID: {report.report_id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
