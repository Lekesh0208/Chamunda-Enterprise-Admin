"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeTotals, todayDDMMYYYY } from "@/lib/calculations";
import { emptyLineItem } from "@/lib/utils";
import { PAYMENT_STATUSES, DELIVERY_STATUSES } from "@/lib/constants";
import type { Client, Invoice, CatalogItem } from "@/lib/types";
import InvoiceDocument from "@/components/InvoiceDocument";
import Toast from "@/components/Toast";
import { Plus, Trash2, Save, Printer, FilePlus } from "lucide-react";

function blankInvoice(nextNo: number): Invoice {
  return {
    id: "",
    invoice_no: String(nextNo).padStart(3, "0"),
    date: todayDDMMYYYY(),
    client_id: "",
    buyer_order_no: "",
    terms_of_payment: "",
    delivery_challan_no: "",
    dated: todayDDMMYYYY(),
    dispatched_through: "",
    lr_rr_no: "",
    motor_vehicle_no: "",
    consignee_same_as_buyer: true,
    consignee_client_id: null,
    line_items: [emptyLineItem()],
    packing: 0,
    freight: 0,
    invoice_total: 0,
    payment_status: "Pending",
    delivery_status: "Pending",
    due_date: "",
    notes: "",
  };
}

function InvoicePageInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [invoice, setInvoice] = useState<Invoice>(blankInvoice(1));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: clientsData, error: cErr }, { data: itemsData, error: iErr }] = await Promise.all([
      supabase.from("clients").select("*").order("firm_name"),
      supabase.from("items").select("*").order("description"),
    ]);
    if (cErr) showToast("Could not load clients: " + cErr.message);
    if (iErr) showToast("Could not load item catalog: " + iErr.message);
    setClients(clientsData || []);
    setCatalog(itemsData || []);

    if (editId) {
      const { data: inv, error: invErr } = await supabase.from("invoices").select("*").eq("id", editId).single();
      if (invErr) showToast("Could not load that invoice: " + invErr.message);
      else if (inv) setInvoice(inv as Invoice);
    } else {
      const { data: maxInv } = await supabase
        .from("invoices")
        .select("invoice_no")
        .order("created_at", { ascending: false })
        .limit(1);
      let next = 1;
      if (maxInv && maxInv[0]) {
        const n = parseInt(String(maxInv[0].invoice_no).replace(/\D/g, ""), 10);
        if (!isNaN(n)) next = n + 1;
      }
      setInvoice(blankInvoice(next));
    }
    setLoading(false);
  }, [editId, supabase, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load data once on mount (or when the edit id changes), deps are correct
    loadAll();
  }, [loadAll]);

  const client = clients.find((c) => c.id === invoice.client_id);
  const consignee = invoice.consignee_same_as_buyer
    ? client
    : clients.find((c) => c.id === invoice.consignee_client_id);
  const totals = computeTotals(invoice, client);

  function updateField<K extends keyof Invoice>(field: K, value: Invoice[K]) {
    setInvoice((prev) => ({ ...prev, [field]: value }));
  }

  function updateLineItem(idx: number, field: string, value: string) {
    setInvoice((prev) => {
      const items = [...prev.line_items];
      const updated = { ...items[idx], [field]: value };
      if (field === "description") {
        const match = catalog.find((c) => c.description.toLowerCase() === value.toLowerCase());
        if (match) {
          updated.hsn = match.hsn;
          updated.unit = match.unit;
          if (!items[idx].rate) updated.rate = match.typical_rate || "";
        }
      }
      items[idx] = updated;
      return { ...prev, line_items: items };
    });
  }
  function addLineItem() {
    setInvoice((prev) => ({ ...prev, line_items: [...prev.line_items, emptyLineItem()] }));
  }
  function removeLineItem(idx: number) {
    setInvoice((prev) => ({
      ...prev,
      line_items: prev.line_items.length > 1 ? prev.line_items.filter((_, i) => i !== idx) : prev.line_items,
    }));
  }

  async function handleSave() {
    if (!invoice.client_id) {
      showToast("Please select a Buyer first");
      return;
    }
    const validItems = invoice.line_items.filter((li) => li.description && Number(li.qty) > 0);
    if (validItems.length === 0) {
      showToast("Add at least one item with a quantity");
      return;
    }
    setSaving(true);
    const payload = { ...invoice, line_items: validItems, invoice_total: totals.total };
    delete (payload as Partial<Invoice>).id;

    const { error } = invoice.id
      ? await supabase.from("invoices").update(payload).eq("id", invoice.id)
      : await supabase.from("invoices").insert(payload);

    setSaving(false);
    if (error) {
      showToast("Save failed: " + error.message);
      return;
    }
    showToast(`Invoice ${invoice.invoice_no} saved to Sales Log`);
    loadAll();
  }

  function sanitizeForFilename(s: string): string {
    return (s || "")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  async function handlePrint() {
    let orderNumber = 1;
    if (invoice.client_id) {
      try {
        if (invoice.id) {
          // Existing invoice: count this client's invoices up to and including this one,
          // ordered by creation time, so reprinting always gives the same order number.
          const { data: current } = await supabase
            .from("invoices")
            .select("created_at")
            .eq("id", invoice.id)
            .single();
          const { count } = await supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("client_id", invoice.client_id)
            .lte("created_at", current?.created_at || new Date().toISOString());
          orderNumber = count || 1;
        } else {
          // Not yet saved: this will be their next order.
          const { count } = await supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("client_id", invoice.client_id);
          orderNumber = (count || 0) + 1;
        }
      } catch {
        orderNumber = 1; // fall back gracefully - filename is a convenience, never block printing
      }
    }

    const clientName = sanitizeForFilename(client?.firm_name || "Client");
    const invNo = sanitizeForFilename(invoice.invoice_no);
    const dateStr = sanitizeForFilename(invoice.date);
    const filename = `${clientName}_Inv${invNo}_${dateStr}_Order${orderNumber}`;

    const originalTitle = document.title;
    document.title = filename;
    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    window.print();
    setTimeout(restoreTitle, 15000); // safety fallback if afterprint never fires
  }

  const router = useRouter();
  function startNew() {
    router.push("/admin/invoice");
    router.refresh();
  }

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;

  return (
    <div className="p-6">
      <Toast message={toast} />
      <div className="no-print flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">Tax Invoice</h1>
        <div className="flex gap-2">
          <button onClick={startNew} className="px-3 py-1.5 rounded border border-slate-300 text-sm font-medium hover:bg-slate-100 flex items-center gap-1.5">
            <FilePlus size={14} /> New Invoice
          </button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50">
            <Save size={14} /> {saving ? "Saving..." : "Save to Sales Log"}
          </button>
          <button onClick={handlePrint} className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 flex items-center gap-1.5">
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="no-print grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase">Buyer Firm Name</label>
          <div className="flex gap-2 mt-1">
            <select
              value={invoice.client_id}
              onChange={(e) => updateField("client_id", e.target.value)}
              className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">-- Select client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.firm_name}</option>
              ))}
            </select>
            <button onClick={() => setNewClientOpen(true)} className="px-2 py-1.5 border border-slate-300 rounded text-sm hover:bg-slate-100" title="Add new client">
              <Plus size={16} />
            </button>
          </div>
          {client && (
            <div className="mt-2 text-xs text-slate-500 space-y-0.5">
              <div>{client.address}</div>
              <div>GSTIN: {client.gstin || "-"}</div>
              <div>{client.contact_person} {client.contact_no}</div>
            </div>
          )}
          <label className="flex items-center gap-2 mt-3 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={invoice.consignee_same_as_buyer}
              onChange={(e) => updateField("consignee_same_as_buyer", e.target.checked)}
            />
            Consignee (ship-to) same as buyer
          </label>
          {!invoice.consignee_same_as_buyer && (
            <select
              value={invoice.consignee_client_id || ""}
              onChange={(e) => updateField("consignee_client_id", e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1"
            >
              <option value="">-- Select consignee --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.firm_name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 grid grid-cols-2 gap-3">
          <Field label="Invoice No" value={invoice.invoice_no} onChange={(v) => updateField("invoice_no", v)} />
          <Field label="Invoice Date" value={invoice.date} onChange={(v) => updateField("date", v)} />
          <Field label="Buyer's Order No" value={invoice.buyer_order_no} onChange={(v) => updateField("buyer_order_no", v)} />
          <Field label="Terms of Payment" value={invoice.terms_of_payment} onChange={(v) => updateField("terms_of_payment", v)} />
          <Field label="Delivery Challan No" value={invoice.delivery_challan_no} onChange={(v) => updateField("delivery_challan_no", v)} />
          <Field label="Dated" value={invoice.dated} onChange={(v) => updateField("dated", v)} />
          <Field label="Dispatched Through" value={invoice.dispatched_through} onChange={(v) => updateField("dispatched_through", v)} placeholder="NA" />
          <Field label="Motor Vehicle No" value={invoice.motor_vehicle_no} onChange={(v) => updateField("motor_vehicle_no", v)} placeholder="NA" />
          <Field label="LR-RR No" value={invoice.lr_rr_no} onChange={(v) => updateField("lr_rr_no", v)} placeholder="NA" />
        </div>
      </div>

      <div className="no-print bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 uppercase">Items</label>
          <button onClick={addLineItem} className="text-xs text-emerald-700 font-medium flex items-center gap-1 hover:underline">
            <Plus size={14} /> Add line
          </button>
        </div>
        <div className="space-y-2">
          {invoice.line_items.map((li, idx) => (
            <div key={idx} className="grid gap-2 items-center" style={{ gridTemplateColumns: "3fr 1fr 0.8fr 0.8fr 0.9fr 0.9fr auto" }}>
              <input list="item-catalog" value={li.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)} placeholder="Description of goods" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
              <input value={li.hsn} onChange={(e) => updateLineItem(idx, "hsn", e.target.value)} placeholder="HSN" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
              <input type="number" value={li.qty} onChange={(e) => updateLineItem(idx, "qty", e.target.value)} placeholder="Qty" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
              <input type="number" value={li.rate} onChange={(e) => updateLineItem(idx, "rate", e.target.value)} placeholder="Rate" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
              <input value={li.unit} onChange={(e) => updateLineItem(idx, "unit", e.target.value)} placeholder="Unit" className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
              <div className="text-sm font-medium text-slate-700 text-right pr-2">
                {((Number(li.qty) || 0) * (Number(li.rate) || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <button onClick={() => removeLineItem(idx)} className="text-slate-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <datalist id="item-catalog">
          {catalog.map((it) => (
            <option key={it.id} value={it.description} />
          ))}
        </datalist>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
          <Field label="Packing & Forwarding" type="number" value={String(invoice.packing)} onChange={(v) => updateField("packing", Number(v))} />
          <Field label="Freight & Loading" type="number" value={String(invoice.freight)} onChange={(v) => updateField("freight", Number(v))} />
        </div>
      </div>

      <div className="no-print bg-white rounded-lg border border-slate-200 p-4 mb-4 flex gap-6">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Payment Status</label>
          <select value={invoice.payment_status} onChange={(e) => updateField("payment_status", e.target.value as Invoice["payment_status"])} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Delivery Status</label>
          <select value={invoice.delivery_status} onChange={(e) => updateField("delivery_status", e.target.value as Invoice["delivery_status"])} className="border border-slate-300 rounded px-2 py-1.5 text-sm">
            {DELIVERY_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="no-print bg-white border border-slate-300 rounded-lg overflow-x-auto p-4">
        <InvoiceDocument invoice={invoice} client={client} consignee={consignee} totals={totals} />
      </div>

      <div className="print-only">
        <InvoiceDocument invoice={invoice} client={client} consignee={consignee} totals={totals} />
      </div>

      {newClientOpen && (
        <NewClientModal
          onClose={() => setNewClientOpen(false)}
          onCreated={(c) => {
            setClients((prev) => [...prev, c].sort((a, b) => a.firm_name.localeCompare(b.firm_name)));
            updateField("client_id", c.id);
            setNewClientOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1"
      />
    </div>
  );
}

function NewClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Client) => void }) {
  const supabase = createClient();
  const [form, setForm] = useState({ firm_name: "", address: "", gstin: "", state: "Gujarat", contact_person: "", contact_no: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!form.firm_name.trim()) return;
    setSaving(true);
    setError("");
    const { data, error } = await supabase.from("clients").insert(form).select().single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated(data as Client);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-5">
        <h2 className="font-bold text-lg mb-4">New Client</h2>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <div className="space-y-3">
          <Field label="Firm Name *" value={form.firm_name} onChange={(v) => setForm({ ...form, firm_name: v })} />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GSTIN" value={form.gstin} onChange={(v) => setForm({ ...form, gstin: v })} />
            <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <Field label="Contact Person" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} />
            <Field label="Contact No." value={form.contact_no} onChange={(v) => setForm({ ...form, contact_no: v })} />
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

export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading...</div>}>
      <InvoicePageInner />
    </Suspense>
  );
}
