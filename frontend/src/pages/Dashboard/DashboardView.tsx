"use client";
import React, { useState, useMemo } from "react";
import {
  Search,
  Brain,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Transaction, AppTab } from "@/utils/types";

interface DashboardViewProps {
  onNavigate: (tab: AppTab) => void;
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
}

function RiskDistributionChart({ transactions }: { transactions: Transaction[] }) {
  const cats = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [transactions]);

  const maxVal = Math.max(...cats.map(([, v]) => v), 1);

  if (cats.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Risk Categories</h3>
      <div className="space-y-3">
        {cats.map(([cat, count]) => (
          <div key={cat}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 truncate">{cat}</span>
              <span className="font-bold text-slate-800">{count}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0052FF]"
                style={{ width: `${(count / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPieChart({ transactions }: { transactions: Transaction[] }) {
  const { active, review, resolved } = useMemo(() => ({
    active: transactions.filter((t) => t.status === "Active Alert").length,
    review: transactions.filter((t) => t.status === "Under Review").length,
    resolved: transactions.filter((t) => t.status === "Resolved").length,
  }), [transactions]);

  const total = active + review + resolved || 1;

  const segments = [
    { label: "Active", value: active, color: "#EF4444", pct: (active / total) * 100 },
    { label: "Under Review", value: review, color: "#F59E0B", pct: (review / total) * 100 },
    { label: "Resolved", value: resolved, color: "#10B981", pct: (resolved / total) * 100 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Status Distribution</h3>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            {(() => {
              let offset = 0;
              return segments.map((s) => {
                const dash = (s.pct / 100) * 100;
                const el = (
                  <circle
                    key={s.label}
                    cx="18" cy="18" r="15.915"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="3.2"
                    strokeDasharray={`${dash} ${100 - dash}`}
                    strokeDashoffset={offset}
                    style={{ transition: "all 0.3s" }}
                  />
                );
                offset -= dash;
                return el;
              });
            })()}
          </svg>
        </div>
        <div className="space-y-1.5 text-xs">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
              <span className="font-semibold text-slate-700">{s.label}</span>
              <span className="font-bold text-slate-800">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskScoreChart({ transactions }: { transactions: Transaction[] }) {
  const buckets = useMemo(() => {
    const b = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    transactions.forEach((t) => {
      if (t.riskScore <= 20) b["0-20"]++;
      else if (t.riskScore <= 40) b["21-40"]++;
      else if (t.riskScore <= 60) b["41-60"]++;
      else if (t.riskScore <= 80) b["61-80"]++;
      else b["81-100"]++;
    });
    return b;
  }, [transactions]);

  const maxVal = Math.max(...Object.values(buckets), 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Risk Score Distribution</h3>
      <div className="flex items-end gap-2 h-32">
        {Object.entries(buckets).map(([range, count]) => (
          <div key={range} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-[#0052FF] rounded-t"
              style={{ height: `${(count / maxVal) * 100}%`, minHeight: count > 0 ? "8px" : "0" }}
            />
            <span className="text-[9px] text-slate-500 font-semibold">{range}</span>
            <span className="text-[9px] font-bold text-slate-700">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardView({
  onNavigate,
  transactions,
  onSelectTransaction,
}: DashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const categories = Array.from(new Set(transactions.map((tx) => tx.category)));
  const statuses = Array.from(new Set(transactions.map((tx) => tx.status)));

  const filtered = transactions.filter((tx) => {
    const matchSearch =
      tx.accountSource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchTerm.toLowerCase());
    return (
      matchSearch &&
      (categoryFilter === "all" || tx.category === categoryFilter) &&
      (statusFilter === "all" || tx.status === statusFilter)
    );
  });

  const displayed = showAll ? filtered : filtered.slice(0, 20);
  const flaggedCount = transactions.filter((t) => t.probability >= 0.5).length;
  const highRiskCount = transactions.filter((t) => t.probability >= 0.8).length;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-800">Risk Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">
          {transactions.length} total · {flaggedCount} flagged · {highRiskCount} high risk
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Records", value: transactions.length, color: "text-slate-800" },
          { label: "Flagged (≥50%)", value: flaggedCount, color: "text-red-600" },
          { label: "High Risk (≥80%)", value: highRiskCount, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <div className={`text-3xl font-black mt-1 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskDistributionChart transactions={transactions} />
        <StatusPieChart transactions={transactions} />
        <RiskScoreChart transactions={transactions} />
      </div>

      {/* Results table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Detection Results</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {showAll ? filtered.length : Math.min(20, filtered.length)} of {filtered.length} shown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-44 pl-9 pr-4 py-1.5 rounded-xl text-xs bg-white border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-white border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="all">Category: All</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-white border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="all">Status: All</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#f8fafc] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                {["Account", "Risk Score", "Category", "Amount", "Status", ""].map((h) => (
                  <th key={h} className={`px-6 py-3.5 ${h === "" ? "text-right" : ""}`}>{h || "Actions"}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{tx.accountSource}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tx.riskScore > 80 ? "bg-red-500" : tx.riskScore > 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${tx.riskScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-800">{tx.riskScore.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-[10px] font-bold border border-blue-100 uppercase">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      tx.status === "Active Alert" ? "bg-red-500/10 text-red-700" :
                      tx.status === "Under Review" ? "bg-amber-500/10 text-amber-700" :
                      "bg-emerald-500/10 text-emerald-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        tx.status === "Active Alert" ? "bg-red-500" :
                        tx.status === "Under Review" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => { onSelectTransaction(tx); onNavigate(AppTab.EXPLAINABLE_AI); }}
                      className="text-[#0052FF] hover:text-blue-700 font-bold flex items-center gap-1 ml-auto text-[11px] uppercase tracking-wide cursor-pointer hover:underline"
                    >
                      Inspect AI <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    {transactions.length === 0
                      ? "No data yet. Upload a dataset first."
                      : "No results match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Show Full Results toggle */}
        {filtered.length > 20 && (
          <div className="border-t border-slate-200 px-6 py-3 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0052FF] hover:text-blue-700 transition-colors"
            >
              {showAll ? (
                <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Show full results ({filtered.length} total) <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}