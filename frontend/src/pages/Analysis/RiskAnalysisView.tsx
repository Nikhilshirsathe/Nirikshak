"use client";
import React from "react";
import { Network } from "lucide-react";

export default function RiskAnalysisView() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-800">Network Analysis</h2>
        <p className="text-sm text-slate-500 mt-1">
          Visualize entity relationships and money flow patterns.
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
        <Network className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="font-semibold">Network graph will appear here</p>
        <p className="text-xs mt-1">Upload a dataset to enable network analysis visualization.</p>
      </div>
    </div>
  );
}