"use client";
import React from "react";
import {
  ArrowRight,
  LayoutDashboard,
  Brain,
  UploadCloud,
  Shield,
  Zap,
  Eye,
  Lock,
  BarChart3,
  FileText,
  Clock,
  Database,
} from "lucide-react";
import { AppTab } from "@/utils/types";

interface HomeViewProps {
  onNavigate: (tab: AppTab) => void;
}

const benefits = [
  {
    icon: Shield,
    title: "FIU-Compliant Reporting",
    desc: "Auto-generated audit reports with cryptographic signatures, ready for Financial Intelligence Unit submission.",
  },
  {
    icon: Brain,
    title: "SHAP Explainability",
    desc: "Every flagged transaction includes feature-importance breakdowns — see exactly why the model flagged it.",
  },
  {
    icon: Zap,
    title: "Real-Time Scoring",
    desc: "Transactions are scored instantly upon upload. No batch delays — get risk assessments in seconds.",
  },
  {
    icon: BarChart3,
    title: "Interactive Dashboards",
    desc: "Filter by risk category, status, and amount. Visual distribution charts for instant portfolio insights.",
  },
  {
    icon: Clock,
    title: "Audit Trail",
    desc: "Complete history of every analysis, report, and action. Full traceability for compliance reviews.",
  },
  {
    icon: FileText,
    title: "LLM-Powered Summaries",
    desc: "AI-generated executive summaries distill complex risk data into plain-language compliance narratives.",
  },
];

export default function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="py-8 px-6 max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
          <span className="text-[#0052FF]">Mule Account Detection</span>
          {" "}and Fraud Prevention
        </h1>
        <p className="text-base text-slate-600 max-w-2xl">
          Insert dataset, run ML-based risk scoring, and get SHAP
          explainability for every flagged account.
        </p>
        <div className="flex flex-wrap gap-4 pt-1">
          <button
            onClick={() => onNavigate(AppTab.UPLOAD)}
            className="bg-[#0052FF] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all"
          >
            <UploadCloud className="w-5 h-5" />
            Upload Dataset
          </button>
          <button
            onClick={() => onNavigate(AppTab.DASHBOARD)}
            className="border border-slate-300 bg-white text-slate-800 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all"
          >
            <LayoutDashboard className="w-5 h-5 inline mr-2" />
            View Dashboard
          </button>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-500/30 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-800 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}