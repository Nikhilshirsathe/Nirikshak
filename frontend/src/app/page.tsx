"use client";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthPage from "@/components/AuthPage";
import AppShell from "@/components/AppShell";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function App() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  if (!user) return <AuthPage onAuth={() => window.location.reload()} />;

  return <AppShell />;
}