"use client";
import React, { useState } from "react";
import {
  Search,
  AlertTriangle,
  Loader2,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Result {
  id: string;
  accountSource: string;
  destination: string;
  amount: number;
  riskScore: number;
  probability: number;
  category: string;
  status: string;
  row_index?: number;
}

export default function AccountLookupView() {
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    account_id: string;
    transactions: Result[];
    total: number;
    max_risk_score: number;
    avg_risk_score: number;
    is_suspected_mule: boolean;
    verdict: string;
  } | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleLookup = async () => {
    if (!accountId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`${apiBase}/account/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ account_id: accountId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Lookup failed");
      setResult(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-800">Single Account Analysis</h2>
        <p className="text-sm text-slate-500 mt-1">
          Enter an account ID to see all its transactions and risk summary.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              placeholder="e.g. ACC-0482-11 or TXN_9420314"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={!accountId.trim() || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Analyse
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Verdict card */}
          <div
            className={`rounded-2xl p-6 text-white flex items-center justify-between ${
              result.is_suspected_mule ? "bg-red-600" : "bg-emerald-600"
            }`}
          >
            <div>
              <p className="text-xs font-semibold opacity-80">Account ID</p>
              <p className="text-xl font-black mt-0.5 font-mono">{result.account_id}</p>
              <div
                className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  result.is_suspected_mule ? "bg-red-700" : "bg-emerald-700"
                }`}
              >
                {result.is_suspected_mule ? "⚠ SUSPECTED MULE" : "✓ LOW RISK"}
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs opacity-80">Max Risk Score</p>
              <p className="text-4xl font-black">{result.max_risk_score.toFixed(1)}%</p>
              <p className="text-xs opacity-80">
                Avg: {result.avg_risk_score.toFixed(1)}% · {result.total} tx
              </p>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-700">
                Transactions ({result.total})
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    {["ID", "Destination", "Amount", "Risk", "Category", "Status"].map(
                      (h) => (
                        <th key={h} className="px-5 py-3">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.transactions.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono font-bold text-slate-800">
                        {r.id}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {r.destination || "—"}
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        ${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                r.riskScore >= 80
                                  ? "bg-red-500"
                                  : r.riskScore >= 50
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${r.riskScore}%` }}
                            />
                          </div>
                          <span
                            className={`font-black ${
                              r.riskScore >= 80
                                ? "text-red-600"
                                : r.riskScore >= 50
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {r.riskScore.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                          {r.category}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            r.status === "Active Alert"
                              ? "bg-red-100 text-red-700"
                              : r.status === "Under Review"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}