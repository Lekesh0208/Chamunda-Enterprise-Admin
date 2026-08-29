import { createClient } from "@/lib/supabase/server";
import AdminShell from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <AdminShell userEmail={user?.email ?? ""}>{children}</AdminShell>;
}
