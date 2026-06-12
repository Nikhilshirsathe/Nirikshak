"use client";
import React, { useState, useEffect } from "react";
import { Bell, Search, CheckCircle, ShieldAlert, RefreshCw } from "lucide-react";
import { Alert } from "@/utils/types";
import { getAlerts, resolveAlert } from "@/services/api";

type StatusFilter = "all" | "Active Alert" | "Under Review" | "Resolved";

export default function AlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchAlerts = () => {
    setLoading(true);
    getAlerts()
      .then((data) => {
        setAlerts(data as Alert[]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleResolve = async (id: string) => {
    await resolveAlert(id).catch(() => {});
    setAlerts((prev) =>
      prev.map((al) =>
        al.id === id ? { ...al, status: "Resolved" as const } : al
      )
    );
  };

  const filtered = alerts.filter((al) => {
    const matchSearch =
      al.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      al.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (statusFilter === "all" || al.status === statusFilter);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Alerts</h2>
          <p className="text-sm text-slate-500 mt-1">
            {alerts.length} total alerts ·{" "}
            {alerts.filter((a) => a.status === "Active Alert").length} active
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="bg-white border border-slate-300 font-semibold px-4 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold text-slate-800">Alert Queue</span>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-56 pl-9 pr-4 py-1.5 rounded-lg text-xs bg-white border border-slate-300 focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3.5 py-1.5 rounded-lg text-xs bg-white border border-slate-300 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Active Alert">Active</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#f8fafc] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                {["Alert ID", "Account", "Category", "Confidence", "Status", ""].map((h) => (
                  <th key={h} className={`px-6 py-3.5 ${h === "" ? "text-right" : ""}`}>{h || "Actions"}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading alerts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No alerts found.
                  </td>
                </tr>
              ) : (
                filtered.map((al) => (
                  <tr key={al.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 uppercase">{al.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{al.accountId}</td>
                    <td className="px-6 py-4">
                      <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded text-[10px] font-extrabold border border-red-100 uppercase">
                        {al.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full" style={{ width: `${al.confidence}%` }} />
                        </div>
                        <span className="font-bold text-slate-800">{al.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          al.status === "Active Alert"
                            ? "bg-red-500/10 text-red-700"
                            : al.status === "Under Review"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            al.status === "Active Alert"
                              ? "bg-red-500"
                              : al.status === "Under Review"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {al.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {al.status !== "Resolved" && (
                          <button
                            onClick={() => handleResolve(al.id)}
                            className="px-2.5 py-1 rounded text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold border border-emerald-200 transition-all flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> Resolve
                          </button>
                        )}
                        <button
                          className="px-2.5 py-1 rounded text-[10px] bg-red-50 hover:bg-red-100 text-red-700 font-extrabold border border-red-200 transition-all flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3 h-3" /> Escalate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}