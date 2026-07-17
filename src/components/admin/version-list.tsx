"use client";

import { History, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocVersion } from "@/lib/types";

export function VersionList({ docId, versions }: { docId: number; versions: DocVersion[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  const restore = async (id: number) => {
    if (!window.confirm("이 버전으로 문서 제목과 내용을 복원할까요? 현재 상태도 버전 기록으로 남습니다.")) return;
    setBusy(id);
    const response = await fetch(`/api/admin/versions/${id}/restore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ docId }),
    });
    setBusy(null);
    if (response.ok) {
      router.push(`/admin/docs/${docId}`);
      router.refresh();
    }
  };

  return (
    <div className="version-list">
      {versions.length === 0 ? <p className="empty-state">저장된 버전이 없습니다.</p> : versions.map((version) => (
        <article key={version.id}>
          <span><History aria-hidden="true" /></span>
          <div><strong>{version.message || "문서 저장"}</strong><h2>{version.title}</h2><p>{version.content.slice(0, 180)}{version.content.length > 180 ? "…" : ""}</p><small>{version.createdAt}</small></div>
          <button type="button" onClick={() => restore(version.id)} disabled={busy !== null}><RotateCcw aria-hidden="true" />{busy === version.id ? "복원 중" : "복원"}</button>
        </article>
      ))}
    </div>
  );
}
