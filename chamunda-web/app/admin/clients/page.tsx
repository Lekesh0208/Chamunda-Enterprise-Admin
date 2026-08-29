"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/lib/types";
import Toast from "@/components/Toast";
import { Plus, Search, X } from "lucide-react";

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalClient, setModalClient] = useState<Client | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("clients").select("*").order("firm_name");
    if (error) showToast("Could not load clients: " + error.message);
    setClients(data || []);
    setLoading(false);
  }, [supabase, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load data once on mount, deps are correct
    load();
  }, [load]);

  async function handleDelete(c: Client) {
    const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("client_id", c.id);
    if (count && count > 0) {
      showToast(`Can't delete ${c.firm_name} — they have ${count} invoice(s) on record`);
      setConfirmDelete(null);
      return;
    }
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) showToast("Delete failed: " + error.message);
    else { showToast("Client deleted"); load(); }
    setConfirmDelete(null);
  }

  const filtered = clients.filter((c) => c.firm_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6">
      <Toast message={toast} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Clients ({clients.length})</h1>
        <button onClick={() => setModalClient("new")} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5">
          <Plus size={14} /> Add Client
        </button>
      </div>
      <div className="relative mb-3 max-w-sm">
        <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm" />
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left p-2.5">Firm Name</th>
                <th className="text-left p-2.5">GSTIN</th>
                <th className="text-left p-2.5">Contact Person</th>
                <th className="text-left p-2.5">Contact No.</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-2.5 font-medium">{c.firm_name}</td>
                  <td className="p-2.5 text-slate-500">{c.gstin || "-"}</td>
                  <td className="p-2.5 text-slate-500">{c.contact_person || "-"}</td>
                  <td className="p-2.5 text-slate-500">{c.contact_no || "-"}</td>
                  <td className="p-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setModalClient(c)} className="text-xs text-slate-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => setConfirmDelete(c)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-400">No clients found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalClient && (
        <ClientModal
          client={modalClient === "new" ? null : modalClient}
          onClose={() => setModalClient(null)}
          onSaved={() => { setModalClient(null); load(); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-sm p-5">
            <h2 className="font-bold text-lg mb-2">Delete {confirmDelete.firm_name}?</h2>
            <p className="text-sm text-slate-600 mb-4">This can&apos;t be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded border border-slate-300 text-sm">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-3 py-1.5 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientModal({ client, onClose, onSaved }: { client: Client | null; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    firm_name: client?.firm_name || "",
    address: client?.address || "",
    gstin: client?.gstin || "",
    state: client?.state || "Gujarat",
    contact_person: client?.contact_person || "",
    contact_no: client?.contact_no || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form.firm_name.trim()) return;
    setSaving(true);
    setError("");
    const { error } = client
      ? await supabase.from("clients").update(form).eq("id", client.id)
      : await supabase.from("clients").insert(form);
    setSaving(false);
    if (error) { setError(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{client ? "Edit Client" : "New Client"}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Firm Name *</label>
            <input value={form.firm_name} onChange={(e) => setForm({ ...form, firm_name: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">GSTIN</label>
              <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Contact Person</label>
              <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Contact No.</label>
              <input value={form.contact_no} onChange={(e) => setForm({ ...form, contact_no: e.target.value })} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-slate-300 text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
