"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Users, BookOpen, IndianRupee, LayoutDashboard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin/invoice", label: "Invoice", icon: FileText },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/sales-log", label: "Sales Log", icon: BookOpen },
  { href: "/admin/dues", label: "Dues Summary", icon: IndianRupee },
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function AdminShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      <div className="no-print w-56 bg-slate-950 text-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="font-black text-lg leading-tight tracking-tight">
            <span className="text-red-600">CHAMUNDA</span>
          </div>
          <div className="text-slate-400 text-xs font-medium tracking-wide">ENTERPRISE ADMIN</div>
        </div>
        <nav className="flex-1 p-2 space-y-1 mt-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition ${
                  active ? "bg-slate-800 text-red-500" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon size={16} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="text-xs text-slate-500 truncate mb-2">{userEmail}</div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
