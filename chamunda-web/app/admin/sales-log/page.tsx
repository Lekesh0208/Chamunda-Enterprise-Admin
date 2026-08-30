"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/calculations";
import { PAYMENT_STATUSES, DELIVERY_STATUSES } from "@/lib/constants";
import type { Invoice, Client } from "@/lib/types";
import Toast from "@/components/Toast";
import { Search } from "lucide-react";

type Row = Invoice & { clients: Pick<Client, "firm_name"> | null };

export default function SalesLogPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*, clients!client_id ( firm_name )")
      .order("created_at", { ascending: false });
    if (error) showToast("Could not load Sales Log: " + error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load data once on mount, deps are correct
    load();
  }, [load]);

  async function updateStatus(id: string, field: "payment_status" | "delivery_status", value: string) {
    const prev = rows;
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    const { error } = await supabase.from("invoices").update({ [field]: value }).eq("id", id);
    if (error) {
      showToast("Update failed: " + error.message);
      setRows(prev);
    }
  }

  const filtered = rows.filter(
    (r) =>
      (r.clients?.firm_name || "").toLowerCase().includes(search.toLowerCase()) ||
      r.invoice_no.includes(search)
  );

  return (
    <div className="p-6">
      <Toast message={toast} />
      <h1 className="text-xl font-bold mb-4">Sales Log ({rows.length} invoices)</h1>
      <div className="relative mb-3 max-w-sm">
        <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client or invoice no..." className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm" />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left p-2.5">Invoice No</th>
                <th className="text-left p-2.5">Date</th>
                <th className="text-left p-2.5">Client</th>
                <th className="text-right p-2.5">Total</th>
                <th className="text-left p-2.5">Payment</th>
                <th className="text-left p-2.5">Delivery</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-2.5 font-medium">{r.invoice_no}</td>
                  <td className="p-2.5 text-slate-500">{r.date}</td>
                  <td className="p-2.5">{r.clients?.firm_name || "Unknown"}</td>
                  <td className="p-2.5 text-right font-medium">{formatINR(r.invoice_total)}</td>
                  <td className="p-2.5">
                    <select value={r.payment_status} onChange={(e) => updateStatus(r.id, "payment_status", e.target.value)} className="text-xs border border-slate-200 rounded px-1.5 py-1">
                      {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-2.5">
                    <select value={r.delivery_status} onChange={(e) => updateStatus(r.id, "delivery_status", e.target.value)} className="text-xs border border-slate-200 rounded px-1.5 py-1">
                      {DELIVERY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-2.5 text-right">
                    <Link href={`/admin/invoice?edit=${r.id}`} className="text-xs text-slate-600 hover:underline">View / Reprint</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-slate-400">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
