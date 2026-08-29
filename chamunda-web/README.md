# Chamunda Enterprise — Admin System

A private, login-protected web app for invoicing, clients, sales tracking, and business
analytics. Built to replace the LibreOffice system with something that can't silently break.

---

## Part 1 — Deploy this (step by step)

You already have a Vercel account (your public site runs there), so this reuses that.
Total cost: **₹0**. Takes about 15 minutes the first time.

### Step 1 — Create the database (Supabase, free)

1. Go to [supabase.com](https://supabase.com) → Sign up (free, no card needed) → **New Project**.
2. Pick any name (e.g. `chamunda-admin`), set a database password (save it somewhere), pick the
   region closest to India (e.g. `ap-south-1` / Mumbai if offered).
3. Once the project is ready, go to the **SQL Editor** (left sidebar) → **New query**.
4. Open `supabase/schema.sql` from this project, paste its full contents in, click **Run**.
   This creates the `clients`, `items`, and `invoices` tables.
5. New query again → open `supabase/seed_data.sql` → paste in → **Run**.
   This loads your real 31 clients, 25 catalog items, and 80 invoice history records.
6. Go to **Project Settings → API**. Copy two values, you'll need them in Step 3:
   - **Project URL**
   - **anon / public key**

### Step 2 — Create your admin login (the only account that will ever exist)

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter your email and a password. Leave "Auto Confirm User" checked.
3. That's it — this is the only login this system will ever have. There is no sign-up page
   anywhere in the app for anyone to find.

### Step 3 — Deploy to Vercel

1. Push this project folder to a **new GitHub repository** (private repository — keep it private).
2. In Vercel: **Add New → Project** → import that GitHub repo.
3. Before clicking Deploy, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = (the Project URL from Step 1)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (the anon key from Step 1)
4. Click **Deploy**. In ~2 minutes you'll get a URL like `chamunda-admin.vercel.app`.
5. Go to that URL → you'll land on `/login` → sign in with the account from Step 2.

**This is intentionally a separate URL/project from your public site for now** — exactly as
you asked. Merging it under `chamundaenterprise-five.vercel.app/admin` later is a small,
low-risk step (Vercel supports multiple projects under custom paths/subdomains) — happy to do
that whenever you're ready.

### Keeping it private

- No signup page exists in the code at all — an account can only be created from inside the
  Supabase dashboard by you.
- Every `/admin/*` page is blocked at the network level (`proxy.ts`) for anyone without a valid
  login session — not just hidden from navigation, actually inaccessible.
- The database itself also refuses all requests from anyone not logged in (Row Level Security,
  set up in `schema.sql`) — even if someone had your Supabase URL and anon key, they get nothing
  without valid admin credentials.
- The `robots: noindex` in the layout keeps Google from ever listing the login page.

---

## Part 2 — How this was built (so you can learn from it)

### The stack, and why each piece

| Piece | What it is | Why this one |
|---|---|---|
| **Next.js** | React framework — handles pages, routing, server+client code in one project | Industry standard, what Vercel is built by/for, huge free-tutorial ecosystem |
| **Vercel** | Hosting | You already use it; free tier is generous; deploys straight from GitHub |
| **Supabase** | Postgres database + authentication, bundled together | One free service instead of stitching together a separate database and separate auth system |
| **Tailwind CSS** | Utility classes for styling | Fast to write, no separate CSS files to maintain |
| **Recharts** | Chart library | Draws the Revenue by Client / Revenue by Product bar charts on the Dashboard |
| **TypeScript** | Adds type-checking on top of JavaScript | Catches whole categories of bugs *before* they ship — this is what caught 2 real errors while building this, before you ever saw them |

### Folder structure

```
app/
  login/page.tsx          the only entry point — no signup exists anywhere
  admin/
    layout.tsx             checks who's logged in, passes it to AdminShell
    AdminShell.tsx          the sidebar + logout button
    invoice/page.tsx        create/edit/print invoices
    clients/page.tsx        client list, add/edit/delete
    sales-log/page.tsx      every invoice ever saved, with status dropdowns
    dues/page.tsx           who owes what (computed live from the database)
    dashboard/page.tsx      charts + reorder tracking
    error.tsx               catches any crash in any /admin page
  global-error.tsx          catches a crash in the app shell itself
  page.tsx                  redirects to /login or /admin/invoice
proxy.ts                    runs before every request; blocks /admin if not logged in
lib/
  supabase/client.ts        Supabase connection for the browser
  supabase/server.ts        Supabase connection for the server
  types.ts                  shared TypeScript shapes for Client/Invoice/etc
  calculations.ts           GST math + number-to-words (Indian Lakh/Crore style)
  constants.ts              your company details, bank details, terms & conditions
components/
  InvoiceDocument.tsx        the actual invoice layout — used for both screen and print
supabase/
  schema.sql                 database structure
  seed_data.sql               your real historical data as SQL
```

### How the login actually works

This uses **Supabase Auth** — when you sign in, Supabase gives your browser a secure session
cookie. `proxy.ts` runs on Vercel's edge network before any page loads, checks that cookie, and
redirects to `/login` if it's missing or invalid. This is the same mechanism used by large
production apps — not a shortcut.

### How the invoice matches your original exactly

`components/InvoiceDocument.tsx` is one component that renders every field, in the same order,
with the same section boundaries, as your LibreOffice invoice. Both the on-screen preview and
the printed version use this *same* component, so they can never quietly drift apart from each
other the way two hand-maintained copies eventually would.

### How GST calculation works

`lib/calculations.ts` → `computeTotals()`: if the buyer's state is Gujarat, it splits tax into
CGST + SGST (9% + 9%). Any other state is billed IGST (18%) instead — standard Indian GST rule
for intra-state vs inter-state sales.

### Why the Dues Summary can't get confused between clients anymore

Every invoice stores a `client_id` (a database reference), never a typed name. Two clients
could even have the exact same firm name typed slightly differently and the system still
couldn't confuse them, because it's never comparing text — it's comparing IDs. This is the
direct fix for the "SUN ENTERPRISE " trailing-space bug and the "ATHARVAN...LTD" vs
"ATHARVAN...LTD." bug you ran into in the spreadsheet version.

### Error handling

Next.js has a file-based convention for this: any file named `error.tsx` automatically catches
crashes in that section of the app and shows a friendly message with a "Try again" button
instead of a blank white screen. That's `app/admin/error.tsx` (catches anything in the admin
area) and `app/global-error.tsx` (catches a failure in the app shell itself). If something
breaks, you'll always see *what* broke, not just a blank page.

### What I verified before handing this to you

- `npm run build` — a full production build, completes with **zero errors**.
- `npx eslint` — code-quality linting, **zero errors, zero warnings**.
- TypeScript type-checking is part of that build step — it already caught and fixed 2 real bugs
  (chart tooltip formatting) before you ever saw them.

What I could *not* test from here: an actual live Supabase connection (my environment can't
reach supabase.com), and real login flow end-to-end. Please test both right after deploying,
and tell me immediately if anything looks off.

---

## Coming later, once you confirm this works

- Merging this under your existing public site instead of a separate URL.
- Anything else on your upgrade list — tell me when ready and I'll fold it into this same
  codebase rather than starting over.
