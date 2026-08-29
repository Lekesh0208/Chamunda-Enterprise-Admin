import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function StatusBadge({ status }: { status: string }) {
  const isGood = status === "Paid" || status === "Delivered";
  const isBad = status === "Pending";
  const cls = isGood
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isBad
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-50 text-slate-700 border-slate-200";
  const Icon = isGood ? CheckCircle2 : isBad ? Clock : AlertCircle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      <Icon size={12} /> {status || "-"}
    </span>
  );
}
