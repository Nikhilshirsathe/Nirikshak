"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Home,
  UploadCloud,
  LayoutDashboard,
  Brain,
  FileText,
  Menu,
  X,
  LogOut,
  Loader2,
  Search,
} from "lucide-react";
import { AppTab, Transaction } from "@/utils/types";
import { supabase } from "@/lib/supabase";
import { logoutSession, getPredictions } from "@/services/api";

import HomeView from "@/pages/Home/HomeView";
import UploadView from "@/pages/Upload/UploadView";
import DashboardView from "@/pages/Dashboard/DashboardView";
import ExplainableAIView from "@/pages/Explainability/ExplainableAIView";
import ReportsView from "@/pages/Reports/ReportsView";
import AccountLookupView from "@/pages/AccountLookup/AccountLookupView";

const navItems = [
  { tab: AppTab.HOME, label: "Platform Overview", icon: Home },
  { tab: AppTab.UPLOAD, label: "Upload Dataset", icon: UploadCloud },
  { tab: AppTab.DASHBOARD, label: "Risk Dashboard", icon: LayoutDashboard },
  { tab: AppTab.EXPLAINABLE_AI, label: "Explainable AI", icon: Brain },
  { tab: AppTab.ACCOUNT_LOOKUP, label: "Account Lookup", icon: Search },
  { tab: AppTab.REPORTS, label: "Audit Reports", icon: FileText },
];

// ── Helpers for URL <-> Tab sync ────────────────────────────────────────
const TAB_PARAM = "tab";

function getTabFromURL(): AppTab {
  if (typeof window === "undefined") return AppTab.HOME;
  const params = new URLSearchParams(window.location.search);
  const tab = params.get(TAB_PARAM) as AppTab | null;
  if (tab && Object.values(AppTab).includes(tab)) return tab;
  return AppTab.HOME;
}

function setTabInURL(tab: AppTab) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set(TAB_PARAM, tab);
  window.history.replaceState({}, "", url.toString());
}

// ── Helpers for sessionStorage persistence ──────────────────────────────
function loadPersistedState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function savePersistedState<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore quota errors */ }
}

export default function AppShell() {
  // ── Initialize from URL / sessionStorage instead of blank defaults ──
  const [activeTab, setActiveTab] = useState<AppTab>(() => getTabFromURL());
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Next.js static export/prerender may execute components once without browser session.
  // Keep this strictly client-only and guard render paths.
  const safeTransactions = transactions ?? [];
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(() =>
    loadPersistedState<Transaction | null>("nirikshak_selected_tx", null)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  // ── Sync tab changes to the URL ────────────────────────────────────────
  const handleTabChange = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    setTabInURL(tab);
    setMobileMenuOpen(false);
  }, []);

  // ── Sync selectedTransaction to sessionStorage ────────────────────────
  useEffect(() => {
    savePersistedState("nirikshak_selected_tx", selectedTransaction);
  }, [selectedTransaction]);

  // ── Fetch data from the backend session on mount ────────────────────────
  const refreshData = useCallback(async () => {
    setDataLoading(true);
    try {
      const { results } = await getPredictions();
      setTransactions(results || []);
    } catch {
      // If 401 or network error, data stays empty
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email || "");
    });
  }, [refreshData]);

  // ── Listen for browser back/forward (popstate) ─────────────────────────
  useEffect(() => {
    const onPopState = () => {
      const tab = getTabFromURL();
      setActiveTab(tab);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    // Clear persisted state on sign out
    try { sessionStorage.clear(); } catch { /* ignore */ }
    try { await logoutSession(); } catch { /* ignore */ }
    await supabase.auth.signOut();
  };

  const renderTabContent = () => {
    if (dataLoading && activeTab !== AppTab.HOME && activeTab !== AppTab.UPLOAD) {
      return (
        <div className="flex items-center justify-center py-32 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm font-semibold">Loading session data...</span>
        </div>
      );
    }

    switch (activeTab) {
      case AppTab.HOME:
        return <HomeView onNavigate={handleTabChange} />;
      case AppTab.UPLOAD:
        return (
          <UploadView
            onNavigate={handleTabChange}
            onAnalysisComplete={() => {
              refreshData();
            }}
          />
        );
      case AppTab.DASHBOARD:
        return (
          <DashboardView
            onNavigate={handleTabChange}
            transactions={safeTransactions}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
          />
        );
      case AppTab.EXPLAINABLE_AI:
        return <ExplainableAIView selectedTransaction={selectedTransaction} />;
      case AppTab.REPORTS:
        return <ReportsView />;
      case AppTab.ACCOUNT_LOOKUP:
        return <AccountLookupView />;
      default:
        return <HomeView onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fe] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 h-16 sticky top-0 z-50 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-600 hover:text-slate-900 focus:outline-none p-1 shrink-0"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div
            onClick={() => handleTabChange(AppTab.HOME)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-[#0052FF] text-white rounded-xl flex items-center justify-center font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-950 uppercase tracking-tight">
                Nirikshak AI
              </h1>
              <span className="text-[9px] text-[#0052FF] font-semibold block tracking-wider mt-0.5 font-mono">
                Enterprise AML Platform
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-slate-400 block">
              {userEmail || ""}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-600 font-semibold border border-slate-200 px-3 py-1.5 rounded-lg hover:border-red-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-grow relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-4 shrink-0 justify-between self-stretch min-h-[calc(100vh-64px)]">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 mb-3">
              Navigation
            </span>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleTabChange(item.tab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm leading-none transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#0052FF] text-white shadow-lg shadow-blue-500/10"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-64 bg-white p-4 h-full flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm font-bold text-slate-800">
                    Menu
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.tab;
                    return (
                      <button
                        key={item.tab}
                        onClick={() => handleTabChange(item.tab)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-xs leading-none transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#0052FF] text-white shadow"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}

        <main className="flex-grow p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full lg:max-w-none">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
}