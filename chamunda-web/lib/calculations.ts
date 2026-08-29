import type { Client, Invoice, Totals } from "./types";

export function formatINR(n: number): string {
  const num = Number(n) || 0;
  return "\u20B9 " + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}
function threeDigitWords(n: number): string {
  if (n >= 100) return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigitWords(n % 100) : "");
  return twoDigitWords(n);
}

// Converts a rupee amount to words using the Indian numbering system (Lakh/Crore),
// matching how amounts are written out on Indian tax invoices.
export function numberToWordsIndian(num: number): string {
  let n = Math.round(Math.abs(num));
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const rest = n;
  const parts: string[] = [];
  if (crore) parts.push(threeDigitWords(crore) + " Crore");
  if (lakh) parts.push(threeDigitWords(lakh) + " Lakh");
  if (thousand) parts.push(threeDigitWords(thousand) + " Thousand");
  if (rest) parts.push(threeDigitWords(rest));
  return parts.join(" ");
}

// Core GST logic: intra-state (Gujarat) splits tax into CGST+SGST (9%+9%);
// any other state is treated as inter-state and charged IGST (18%) instead.
export function computeTotals(invoice: Invoice, client: Client | undefined): Totals {
  const subtotal = invoice.line_items.reduce(
    (sum, li) => sum + (Number(li.qty) || 0) * (Number(li.rate) || 0),
    0
  );
  const packing = Number(invoice.packing) || 0;
  const freight = Number(invoice.freight) || 0;
  const taxable = subtotal + packing + freight;
  const isGujarat = !!client?.state && client.state.trim().toLowerCase() === "gujarat";
  const sgst = isGujarat ? taxable * 0.09 : 0;
  const cgst = isGujarat ? taxable * 0.09 : 0;
  const igst = isGujarat ? 0 : taxable * 0.18;
  const beforeRound = taxable + sgst + cgst + igst;
  const total = Math.round(beforeRound);
  const roundOff = total - beforeRound;
  return { subtotal, packing, freight, taxable, sgst, cgst, igst, roundOff, total, isGujarat };
}
