export type Client = {
  id: string;
  firm_name: string;
  address: string;
  gstin: string;
  state: string;
  contact_person: string;
  contact_no: string;
};

export type LineItem = {
  description: string;
  hsn: string;
  unit: string;
  qty: number | string;
  rate: number | string;
};

export type Invoice = {
  id: string;
  invoice_no: string;
  date: string;
  client_id: string;
  buyer_order_no: string;
  terms_of_payment: string;
  delivery_challan_no: string;
  dated: string;
  dispatched_through: string;
  lr_rr_no: string;
  motor_vehicle_no: string;
  consignee_same_as_buyer: boolean;
  consignee_client_id: string | null;
  line_items: LineItem[];
  packing: number;
  freight: number;
  invoice_total: number;
  payment_status: "Pending" | "Partial" | "Paid";
  delivery_status: "Pending" | "Ready to Dispatch" | "Delivered";
  due_date: string;
  notes: string;
  created_at?: string;
};

export type CatalogItem = {
  id: string;
  description: string;
  hsn: string;
  unit: string;
  typical_rate: number;
};

export type Totals = {
  subtotal: number;
  packing: number;
  freight: number;
  taxable: number;
  sgst: number;
  cgst: number;
  igst: number;
  roundOff: number;
  total: number;
  isGujarat: boolean;
};
