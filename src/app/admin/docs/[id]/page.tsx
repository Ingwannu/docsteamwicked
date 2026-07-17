import { notFound } from "next/navigation";
import { AdminEditor } from "@/components/admin/admin-editor";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getDocById, getNavigation } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditDocPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const doc = Number.isInteger(id) ? getDocById(id) : null;
  if (!doc) notFound();
  return <AdminShell title="문서 편집"><AdminEditor doc={doc} categories={getNavigation(false)} /></AdminShell>;
}
