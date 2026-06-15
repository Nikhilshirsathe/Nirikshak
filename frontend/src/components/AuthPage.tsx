"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Loader2, Eye, EyeOff, UserCircle } from "lucide-react";

type Mode = "login" | "signup";

export default function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Account created! Check your email to confirm, then log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else onAuth();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">Nirikshak AI</h1>
            <p className="text-[10px] text-blue-600 font-semibold">AML Detection Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === "login" ? "Sign in to your account to continue." : "Sign up to get started."}
            </p>
          </div>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {message && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">{message}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</> :
                mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="text-center text-sm text-slate-500">
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <button onClick={() => { setMode("signup"); setError(null); setMessage(null); }}
                  className="text-blue-600 font-semibold hover:underline">Sign up</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(null); setMessage(null); }}
                  className="text-blue-600 font-semibold hover:underline">Sign in</button>
              </>
            )}
          </div>

          {/* Demo Account */}
          {mode === "login" && (
            <div className="border-t border-slate-200 pt-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Demo Account for Judges</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Email:</span>
                    <code className="bg-white px-2 py-0.5 rounded-lg border border-blue-200 text-blue-700 font-mono text-xs">demo@nirikshak.ai</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Password:</span>
                    <code className="bg-white px-2 py-0.5 rounded-lg border border-blue-200 text-blue-700 font-mono text-xs">Demo@123456</code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("demo@nirikshak.ai");
                    setPassword("Demo@123456");
                  }}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 rounded-lg transition-colors text-xs"
                >
                  Auto-fill Demo Credentials
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
