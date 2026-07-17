import { AdminEditor } from "@/components/admin/admin-editor";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getNavigation } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewDocPage() {
  await requireAdmin();
  return <AdminShell title="새 문서"><AdminEditor doc={null} categories={getNavigation(false)} /></AdminShell>;
}
