"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/calculations";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type InvRow = {
  invoice_total: number;
  date: string;
  line_items: { description: string; qty: number | string; rate: number | string }[];
  clients: { id: string; firm_name: string } | { id: string; firm_name: string }[] | null;
};

// Accepts the DD-MM-YYYY strings used throughout this dataset (carried over
// from the original spreadsheet) and parses them into real Date objects.
function parseDDMMYYYY(s: string): Date | null {
  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec((s || "").trim());
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

const BAR_COLORS = ["#0f172a", "#b91c1c", "#334155", "#dc2626", "#475569", "#ef4444", "#64748b"];

export default function DashboardPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<InvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_total, date, line_items, clients ( id, firm_name )");
    if (error) setErrorMsg(error.message);
    setRows((data as InvRow[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load data once on mount, deps are correct
    load();
  }, [load]);

  const clientStats = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; count: number; dates: Date[] }>();
    rows.forEach((r) => {
      const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
      if (!client) return;
      const entry = map.get(client.id) || { name: client.firm_name, revenue: 0, count: 0, dates: [] };
      entry.revenue += Number(r.invoice_total) || 0;
      entry.count += 1;
      const d = parseDDMMYYYY(r.date);
      if (d) entry.dates.push(d);
      map.set(client.id, entry);
    });

    return Array.from(map.values())
      .map((c) => {
        c.dates.sort((a, b) => a.getTime() - b.getTime());
        const lastOrder = c.dates[c.dates.length - 1];
        const now = new Date();
        const daysSince = lastOrder ? Math.round((now.getTime() - lastOrder.getTime()) / 86400000) : null;

        let avgGap: number | null = null;
        if (c.dates.length >= 2) {
          const gaps = [];
          for (let i = 1; i < c.dates.length; i++) {
            gaps.push((c.dates[i].getTime() - c.dates[i - 1].getTime()) / 86400000);
          }
          avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        }

        let reorderStatus: "OK" | "OVERDUE" | "Not enough history" = "Not enough history";
        if (avgGap !== null && daysSince !== null) {
          reorderStatus = daysSince > avgGap * 1.5 ? "OVERDUE" : "OK";
        }

        return {
          ...c,
          lastOrderStr: lastOrder ? lastOrder.toLocaleDateString("en-IN") : "-",
          daysSince,
          avgGap: avgGap !== null ? Math.round(avgGap) : null,
          reorderStatus,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [rows]);

  const productStats = useMemo(() => {
    const map = new Map<string, { revenue: number; qty: number }>();
    rows.forEach((r) => {
      r.line_items?.forEach((li) => {
        if (!li.description) return;
        const amount = (Number(li.qty) || 0) * (Number(li.rate) || 0);
        const entry = map.get(li.description) || { revenue: 0, qty: 0 };
        entry.revenue += amount;
        entry.qty += Number(li.qty) || 0;
        map.set(li.description, entry);
      });
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [rows]);

  const totalRevenue = clientStats.reduce((s, c) => s + c.revenue, 0);
  const overdueCount = clientStats.filter((c) => c.reorderStatus === "OVERDUE").length;

  if (loading) return <div className="p-6 text-slate-500">Loading dashboard...</div>;
  if (errorMsg) {
    // Thrown deliberately so /admin/error.tsx renders the shared error UI
    // instead of a half-loaded, confusing dashboard.
    throw new Error("Dashboard failed to load: " + errorMsg);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Revenue (all time)" value={formatINR(totalRevenue)} />
        <SummaryCard label="Active Clients" value={String(clientStats.length)} />
        <SummaryCard label="Clients Overdue to Reorder" value={String(overdueCount)} accent={overdueCount > 0} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Revenue by Client (Top 10)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientStats.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} fontSize={11} />
              <YAxis type="category" dataKey="name" width={140} fontSize={10} tick={{ width: 130 }} />
              <Tooltip formatter={(v) => formatINR(Number(v))} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {clientStats.slice(0, 10).map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Product (Top 10)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productStats} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} fontSize={11} />
              <YAxis type="category" dataKey="name" width={140} fontSize={10} />
              <Tooltip formatter={(v) => formatINR(Number(v))} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {productStats.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <h2 className="font-bold text-slate-800 mb-2">Sales by Client &amp; Reorder Tracking</h2>
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left p-2.5">Client</th>
              <th className="text-right p-2.5">Total Revenue</th>
              <th className="text-right p-2.5">Invoices</th>
              <th className="text-left p-2.5">Last Order</th>
              <th className="text-right p-2.5">Avg Days Between Orders</th>
              <th className="text-right p-2.5">Days Since Last Order</th>
              <th className="text-left p-2.5">Reorder Status</th>
            </tr>
          </thead>
          <tbody>
            {clientStats.map((c, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2.5 font-medium">{c.name}</td>
                <td className="p-2.5 text-right">{formatINR(c.revenue)}</td>
                <td className="p-2.5 text-right">{c.count}</td>
                <td className="p-2.5">{c.lastOrderStr}</td>
                <td className="p-2.5 text-right">{c.avgGap ?? "-"}</td>
                <td className="p-2.5 text-right">{c.daysSince ?? "-"}</td>
                <td className="p-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      c.reorderStatus === "OVERDUE"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : c.reorderStatus === "OK"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {c.reorderStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-xs text-slate-500 uppercase font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-red-600" : "text-slate-800"}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>
      {children}
    </div>
  );
}
