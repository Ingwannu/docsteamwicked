import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, getNavigation, listAllDocs } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const stats = getDashboardStats();
  const docs = listAllDocs();
  const categories = getNavigation(false);
  return <AdminShell title="대시보드"><AdminDashboard stats={stats} docs={docs} categories={categories} /></AdminShell>;
}
