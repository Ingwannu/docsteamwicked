"use client";

import { ArrowRight, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";

export function DocsSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && event.target === document.body) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!deferredQuery) return;
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(deferredQuery)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { results?: SearchResult[] }) => {
        setResults(data.results || []);
        setResolvedQuery(deferredQuery);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      });
    return () => controller.abort();
  }, [deferredQuery]);

  const visit = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/doc/${encodeURIComponent(slug)}`);
  };

  return (
    <>
      <button
        type="button"
        className={compact ? "icon-button" : "search-trigger"}
        onClick={() => setOpen(true)}
        aria-label="문서 검색"
      >
        <Search aria-hidden="true" />
        {compact ? null : (
          <>
            <span>문서 검색...</span>
            <kbd>⌘ K</kbd>
          </>
        )}
      </button>

      {open ? (
        <div className="search-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="문서 검색"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="search-input-row">
              <Search aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목, 설명, 내용 검색"
                aria-label="검색어"
              />
              <button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="검색 닫기">
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="search-results" aria-live="polite">
              {!deferredQuery ? (
                <p className="search-empty">찾고 싶은 기능이나 오류 메시지를 입력하세요.</p>
              ) : resolvedQuery !== deferredQuery ? (
                <p className="search-empty">검색 중...</p>
              ) : results.length === 0 ? (
                <p className="search-empty">일치하는 문서가 없습니다.</p>
              ) : (
                results.map((result) => (
                  <button key={result.id} type="button" className="search-result" onClick={() => visit(result.slug)}>
                    <span>
                      <strong>{result.title}</strong>
                      <small>{result.category || "분류 없음"} · {result.description || "설명 없음"}</small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
