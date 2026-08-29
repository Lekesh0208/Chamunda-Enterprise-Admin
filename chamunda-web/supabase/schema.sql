-- Chamunda Enterprise — database schema
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  firm_name text not null,
  address text default '',
  gstin text default '',
  state text default 'Gujarat',
  contact_person text default '',
  contact_no text default '',
  created_at timestamptz default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  hsn text default '',
  unit text default 'Nos',
  typical_rate numeric default 0
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null,
  date text default '',
  client_id uuid references clients(id) on delete restrict,
  buyer_order_no text default '',
  terms_of_payment text default '',
  delivery_challan_no text default '',
  dated text default '',
  dispatched_through text default '',
  lr_rr_no text default '',
  motor_vehicle_no text default '',
  consignee_same_as_buyer boolean default true,
  consignee_client_id uuid references clients(id),
  line_items jsonb not null default '[]',
  packing numeric default 0,
  freight numeric default 0,
  invoice_total numeric default 0,
  payment_status text default 'Pending',
  delivery_status text default 'Pending',
  due_date text default '',
  notes text default '',
  created_at timestamptz default now()
);

create index if not exists idx_invoices_client on invoices(client_id);
create index if not exists idx_invoices_status on invoices(payment_status);

-- Row Level Security: only logged-in (admin) sessions can read/write anything.
-- Anonymous/public requests get nothing, even if someone finds the API URL.
alter table clients enable row level security;
alter table items enable row level security;
alter table invoices enable row level security;

create policy "authenticated full access" on clients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated full access" on invoices
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
