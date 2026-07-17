import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { VersionList } from "@/components/admin/version-list";
import { requireAdmin } from "@/lib/auth";
import { getDocById, getVersions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const doc = Number.isInteger(id) ? getDocById(id) : null;
  if (!doc) notFound();
  const actions = <Link href={`/admin/docs/${doc.id}`} className="secondary-action"><ArrowLeft aria-hidden="true" /> 편집기로</Link>;
  return (
    <AdminShell title="버전 기록" actions={actions}>
      <div className="versions-page"><header><h1>{doc.title}</h1><p>저장 시점의 제목과 내용을 확인하고 복원할 수 있습니다.</p></header><VersionList docId={doc.id} versions={getVersions(doc.id)} /></div>
    </AdminShell>
  );
}
