"use client";

import { ArrowUpRight, BookOpenText, Eye, FilePenLine, FolderPlus, MessageCircleMore, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CategoryWithDocs, DashboardStats, DocSummary } from "@/lib/types";
import { slugify } from "@/lib/slug";

export function AdminDashboard({
  stats,
  docs,
  categories,
}: {
  stats: DashboardStats;
  docs: DocSummary[];
  categories: CategoryWithDocs[];
}) {
  const router = useRouter();
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("📄");
  const [busy, setBusy] = useState(false);

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setBusy(true);
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: categoryName, slug: slugify(categoryName), icon: categoryIcon }),
    });
    setBusy(false);
    if (response.ok) {
      setCategoryName("");
      router.refresh();
    }
  };

  const removeCategory = async (id: number) => {
    if (!window.confirm("카테고리를 삭제할까요? 문서는 분류 없음으로 이동합니다.")) return;
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const removeDoc = async (id: number) => {
    if (!window.confirm("문서와 버전 기록을 모두 삭제할까요?")) return;
    await fetch(`/api/admin/docs/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="admin-dashboard">
      <section className="admin-intro">
        <div><h1>문서를 더 빠르고 정확하게.</h1><p>공개 문서, 분류, 피드백과 버전 기록을 한 곳에서 관리합니다.</p></div>
        <Link href="/admin/docs/new" className="primary-action"><Plus aria-hidden="true" /> 새 문서 작성</Link>
      </section>

      <section className="stats-strip" aria-label="문서 현황">
        <div><BookOpenText aria-hidden="true" /><span><small>전체 문서</small><strong>{stats.totalDocs}</strong></span></div>
        <div><FilePenLine aria-hidden="true" /><span><small>공개 / 초안</small><strong>{stats.publishedDocs} / {stats.draftDocs}</strong></span></div>
        <div><Eye aria-hidden="true" /><span><small>누적 조회</small><strong>{stats.totalViews.toLocaleString("ko-KR")}</strong></span></div>
        <div><MessageCircleMore aria-hidden="true" /><span><small>긍정 / 부정</small><strong>{stats.positiveFeedback} / {stats.negativeFeedback}</strong></span></div>
      </section>

      <section id="documents" className="admin-section">
        <div className="section-heading"><div><h2>문서</h2><p>최근 수정된 순서로 표시합니다.</p></div><Link href="/admin/docs/new">새 문서 <Plus aria-hidden="true" /></Link></div>
        <div className="document-table" role="table">
          <div className="document-row document-row-head" role="row"><span>문서</span><span>상태</span><span>조회</span><span>작업</span></div>
          {docs.map((doc) => (
            <div className="document-row" role="row" key={doc.id}>
              <span><strong>{doc.title}</strong><small>{doc.categoryName || "분류 없음"} · /doc/{doc.slug}</small></span>
              <span><i className={doc.isPublished ? "status-published" : "status-draft"}>{doc.isPublished ? "공개" : "초안"}</i></span>
              <span>{doc.views.toLocaleString("ko-KR")}</span>
              <span className="row-actions">
                {doc.isPublished ? <Link href={`/doc/${encodeURIComponent(doc.slug)}`} target="_blank" aria-label="문서 보기"><ArrowUpRight /></Link> : null}
                <Link href={`/admin/docs/${doc.id}`} aria-label="문서 편집"><FilePenLine /></Link>
                <button type="button" onClick={() => removeDoc(doc.id)} aria-label="문서 삭제"><Trash2 /></button>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="admin-section category-management">
        <div className="section-heading"><div><h2>카테고리</h2><p>사이드바의 문서 그룹을 관리합니다.</p></div></div>
        <div className="category-layout">
          <div className="category-list">
            {categories.map((category) => (
              <div key={category.id}><span>{category.icon}</span><strong>{category.name}</strong><small>{category.docs.length}개 문서</small><button type="button" onClick={() => removeCategory(category.id)} aria-label={`${category.name} 삭제`}><Trash2 /></button></div>
            ))}
          </div>
          <form className="category-form" onSubmit={createCategory}>
            <FolderPlus aria-hidden="true" />
            <h3>새 카테고리</h3>
            <label><span>아이콘</span><input value={categoryIcon} onChange={(event) => setCategoryIcon(event.target.value)} maxLength={4} /></label>
            <label><span>이름</span><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="예: 게임 서버" maxLength={100} /></label>
            <button type="submit" className="primary-action" disabled={busy}>{busy ? "추가 중" : "카테고리 추가"}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
