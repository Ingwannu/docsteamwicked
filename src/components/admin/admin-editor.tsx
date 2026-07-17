"use client";

import { ArrowLeft, Bot, Check, Eye, FileQuestion, History, LoaderCircle, Save, Sparkles, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CategoryWithDocs, DocRecord } from "@/lib/types";
import { slugify } from "@/lib/slug";

type EditorState = {
  title: string;
  slug: string;
  description: string;
  content: string;
  categoryId: number | null;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
};

const EMPTY_DOC: EditorState = {
  title: "",
  slug: "",
  description: "",
  content: "# 새 문서\n\n문서 내용을 작성하세요.",
  categoryId: null,
  sortOrder: 0,
  isPublished: false,
  isFeatured: false,
};

export function AdminEditor({ doc, categories }: { doc: DocRecord | null; categories: CategoryWithDocs[] }) {
  const router = useRouter();
  const [state, setState] = useState<EditorState>(doc ? {
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    content: doc.content,
    categoryId: doc.categoryId,
    sortOrder: doc.sortOrder,
    isPublished: doc.isPublished,
    isFeatured: doc.isFeatured,
  } : EMPTY_DOC);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const initial = useMemo(() => JSON.stringify(doc ? state : EMPTY_DOC), [doc]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(state) !== initial && savedAt === null;

  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((previous) => ({ ...previous, [key]: value }));
    setSavedAt(null);
  };

  const save = async () => {
    if (!state.title.trim() || !state.slug.trim()) {
      setError("제목과 슬러그를 입력하세요.");
      return;
    }
    setBusy(true);
    setError("");
    const response = await fetch(doc ? `/api/admin/docs/${doc.id}` : "/api/admin/docs", {
      method: doc ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    const payload = (await response.json()) as { error?: string; doc?: DocRecord };
    setBusy(false);
    if (!response.ok || !payload.doc) {
      setError(payload.error || "저장하지 못했습니다.");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    if (!doc) router.replace(`/admin/docs/${payload.doc.id}`);
    router.refresh();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const runAi = async (action: "write" | "improve" | "faq") => {
    setAiBusy(action);
    setError("");
    const response = await fetch("/api/admin/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, topic: state.title, content: state.content }),
    });
    const payload = (await response.json()) as { error?: string; content?: string };
    setAiBusy(null);
    if (!response.ok || !payload.content) {
      setError(payload.error || "AI 요청을 처리하지 못했습니다.");
      return;
    }
    update("content", payload.content);
  };

  return (
    <div className="editor-page">
      <div className="editor-toolbar">
        <Link href="/admin" className="secondary-action"><ArrowLeft aria-hidden="true" /> 목록</Link>
        <span className={dirty ? "save-state is-dirty" : "save-state"}>{savedAt ? <Check aria-hidden="true" /> : null}{savedAt ? `${savedAt} 저장됨` : dirty ? "저장되지 않은 변경" : "최신 상태"}</span>
        <div>
          {doc?.isPublished ? <Link href={`/doc/${encodeURIComponent(doc.slug)}`} target="_blank" className="secondary-action"><Eye aria-hidden="true" /> 미리보기</Link> : null}
          {doc ? <Link href={`/admin/versions/${doc.id}`} className="secondary-action"><History aria-hidden="true" /> 버전 기록</Link> : null}
          <button type="button" className="primary-action" onClick={save} disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <Save />}{busy ? "저장 중" : "저장"}</button>
        </div>
      </div>
      {error ? <p className="editor-error" role="alert">{error}</p> : null}
      <div className="editor-grid">
        <section className="editor-workspace">
          <label className="editor-field"><span>제목 *</span><input value={state.title} onChange={(event) => { update("title", event.target.value); if (!doc) update("slug", slugify(event.target.value)); }} maxLength={200} placeholder="문서 제목" /></label>
          <label className="editor-field"><span>설명</span><textarea value={state.description} onChange={(event) => update("description", event.target.value)} maxLength={300} rows={2} placeholder="검색과 미리보기에 사용할 짧은 설명" /></label>
          <label className="editor-field editor-content-field">
            <span>내용 (Markdown)</span>
            <div className="markdown-toolbar"><b>H1</b><b>H2</b><b>H3</b><i>B</i><i>⌁</i><i>&lt;/&gt;</i><small>Markdown · {state.content.length.toLocaleString("ko-KR")}자</small></div>
            <textarea value={state.content} onChange={(event) => update("content", event.target.value)} spellCheck={false} />
          </label>
        </section>
        <aside className="editor-inspector">
          <section>
            <h2>게시 설정</h2>
            <div className="publish-toggle">
              <button type="button" className={state.isPublished ? "is-active" : undefined} onClick={() => update("isPublished", true)}>공개</button>
              <button type="button" className={!state.isPublished ? "is-active" : undefined} onClick={() => update("isPublished", false)}>초안</button>
            </div>
            <label><span>카테고리</span><select value={state.categoryId || ""} onChange={(event) => update("categoryId", event.target.value ? Number(event.target.value) : null)}><option value="">분류 없음</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label><span>슬러그</span><input value={state.slug} onChange={(event) => update("slug", slugify(event.target.value))} maxLength={250} /></label>
            <label><span>정렬 순서</span><input type="number" min={0} value={state.sortOrder} onChange={(event) => update("sortOrder", Number(event.target.value))} /></label>
            <label className="switch-row"><span><strong>대표 문서</strong><small>카테고리의 첫 문서로 강조합니다.</small></span><input type="checkbox" checked={state.isFeatured} onChange={(event) => update("isFeatured", event.target.checked)} /></label>
          </section>
          <section className="ai-panel">
            <h2><Sparkles aria-hidden="true" /> AI 글쓰기 도우미</h2>
            <p>현재 제목과 내용을 사용해 문서를 작성하거나 다듬습니다.</p>
            <button type="button" onClick={() => runAi("write")} disabled={aiBusy !== null}><WandSparkles /> <span><strong>글쓰기</strong><small>주제에 맞는 초안 생성</small></span>{aiBusy === "write" ? <LoaderCircle className="spin" /> : null}</button>
            <button type="button" onClick={() => runAi("improve")} disabled={aiBusy !== null}><Bot /> <span><strong>개선</strong><small>가독성과 문장 개선</small></span>{aiBusy === "improve" ? <LoaderCircle className="spin" /> : null}</button>
            <button type="button" onClick={() => runAi("faq")} disabled={aiBusy !== null}><FileQuestion /> <span><strong>FAQ 생성</strong><small>문서 기반 질문과 답변</small></span>{aiBusy === "faq" ? <LoaderCircle className="spin" /> : null}</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
