import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/calculations";

export default async function DuesSummaryPage() {
  const supabase = await createClient();
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("invoice_total, payment_status, clients!client_id ( id, firm_name )");

  if (error) {
    throw new Error("Could not load Dues Summary: " + error.message);
  }

  const byClient = new Map<string, { name: string; pending: number }>();
  (invoices || []).forEach((inv) => {
    const client = Array.isArray(inv.clients) ? inv.clients[0] : inv.clients;
    if (!client || inv.payment_status === "Paid") return;
    const existing = byClient.get(client.id) || { name: client.firm_name, pending: 0 };
    existing.pending += Number(inv.invoice_total) || 0;
    byClient.set(client.id, existing);
  });

  const rows = Array.from(byClient.values())
    .filter((r) => r.pending > 0.01)
    .sort((a, b) => b.pending - a.pending);

  const total = rows.reduce((s, r) => s + r.pending, 0);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1">Dues Summary</h1>
      <p className="text-sm text-slate-500 mb-4">
        Total pending across all clients: <span className="font-bold text-slate-800">{formatINR(total)}</span>
      </p>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
            <tr>
              <th className="text-left p-2.5">Client</th>
              <th className="text-right p-2.5">Pending Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-2.5 font-medium">{r.name}</td>
                <td className="p-2.5 text-right font-semibold text-amber-700">{formatINR(r.pending)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={2} className="p-6 text-center text-slate-400">Nothing pending — all invoices are marked Paid.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
