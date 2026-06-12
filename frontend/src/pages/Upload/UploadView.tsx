"use client";
import React, { useState, useRef } from "react";
import {
  UploadCloud,
  AlertTriangle,
  FileSpreadsheet,
  Loader2,
  Trash2,
} from "lucide-react";
import { Transaction, AppTab } from "@/utils/types";
import { uploadDataset } from "@/services/api";

interface UploadViewProps {
  onNavigate: (tab: AppTab) => void;
  onAnalysisComplete: () => void;
}

export default function UploadView({
  onNavigate,
  onAnalysisComplete,
}: UploadViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
  } | null>(null);
  const [results, setResults] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<{ total: number; flagged: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    const fileSize = (file.size / 1048576).toFixed(2) + " MB";
    setUploading(true);
    setError(null);
    try {
      const res = await uploadDataset(file);
      setUploadedFile({ name: file.name, size: fileSize });
      setResults(res.results || []);
      setStats({ total: res.records, flagged: res.flagged });
      onAnalysisComplete();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail || "Upload failed. Please check the file format.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-2xl font-bold text-slate-800">Upload Dataset</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload a CSV or Excel file. The model will score every transaction
          for money mule risk automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[240px] ${
          isDragging
            ? "border-[#0052FF] bg-[#0052FF]/5"
            : "border-slate-300 hover:border-[#0052FF] bg-white"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
          }}
        />
        {uploading ? (
          <div className="space-y-4">
            <Loader2 className="w-10 h-10 text-[#0052FF] animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              Uploading & analyzing...
            </p>
          </div>
        ) : uploadedFile ? (
          <div className="space-y-3">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-100">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{uploadedFile.name}</p>
              <p className="text-xs text-slate-400">{uploadedFile.size}</p>
            </div>
            {stats && (
              <p className="text-xs text-slate-500">
                {stats.total} records · {stats.flagged} flagged
              </p>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadedFile(null);
                setResults([]);
                setStats(null);
                setError(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <UploadCloud className="w-10 h-10 text-blue-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Drop CSV or Excel here, or click to browse
            </p>
            <p className="text-xs text-slate-400">Supports .csv, .xlsx, .xls</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Predictions</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {results.length} results shown
              </p>
            </div>
            <button
              onClick={() => onNavigate(AppTab.DASHBOARD)}
              className="px-4 py-1.5 rounded-lg text-xs bg-[#0052FF] text-white font-semibold hover:bg-blue-600 transition-colors"
            >
              View Dashboard
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#f8fafc] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Risk Score</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.slice(0, 20).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-mono font-semibold text-slate-800">
                      {tx.accountSource || tx.id}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tx.riskScore >= 80 ? "bg-red-500" : tx.riskScore >= 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${tx.riskScore}%` }}
                          />
                        </div>
                        <span className="font-bold">{tx.riskScore.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.status === "Active Alert"
                            ? "bg-red-100 text-red-700"
                            : tx.status === "Under Review"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}