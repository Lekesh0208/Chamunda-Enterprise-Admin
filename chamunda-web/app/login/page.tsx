"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, AlertCircle } from "lucide-react";

// Deliberately no "Sign up" link or route anywhere in this app.
// The only way an account gets created is you adding it directly in the
// Supabase dashboard (see README) - so there is no public entry point
// an outsider could ever discover or use.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
        setLoading(false);
        return;
      }
      router.push("/admin/invoice");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your internet connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-black tracking-tight">
            <span className="text-red-600">CHAMUNDA</span> <span className="text-white">ENTERPRISE</span>
          </div>
          <div className="text-slate-400 text-xs font-medium tracking-widest mt-1">ADMIN ACCESS</div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-2xl">
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm mt-1"
              autoComplete="username"
            />
          </div>
          <div className="mb-5">
            <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm mt-1"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            <Lock size={15} /> {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="text-center text-slate-500 text-xs mt-6">
          Private admin system. Not for public or customer access.
        </p>
      </div>
    </div>
  );
}
