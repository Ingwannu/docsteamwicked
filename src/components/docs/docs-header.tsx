"use client";

import { BookOpen, ExternalLink, ListTree, Menu, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CategoryWithDocs } from "@/lib/types";
import { DocsSearch } from "@/components/docs/docs-search";
import { DockThemeToggle, ThemeToggle } from "@/components/ui/theme-toggle";

export function DocsHeader({ navigation, currentSlug }: { navigation: CategoryWithDocs[]; currentSlug: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocItems, setTocItems] = useState<Array<{ id: string; text: string }>>([]);

  const openTableOfContents = () => {
    setTocItems(
      Array.from(document.querySelectorAll<HTMLElement>(".markdown-content h2, .markdown-content h3"))
        .filter((heading) => Boolean(heading.id))
        .map((heading) => ({ id: heading.id, text: heading.textContent?.trim() || heading.id })),
    );
    setTocOpen(true);
  };

  return (
    <>
      <header className="docs-header">
        <Link href="/" className="docs-brand" aria-label="Wickedhost Docs 홈">
          <Image src="/WICKED.svg" width={36} height={36} alt="" priority />
          <span>WICKED DOCS</span>
        </Link>
        <div className="header-search-desktop"><DocsSearch /></div>
        <nav className="header-links" aria-label="주요 링크">
          <Link href="/">문서</Link>
          <Link href="https://status.teamwicked.me" target="_blank">상태</Link>
          <Link href="https://teamwicked.me" target="_blank">Team WICKED</Link>
        </nav>
        <div className="header-actions">
          <ThemeToggle compact />
          <Link href="/admin" className="admin-button"><UserRound aria-hidden="true" /> 관리자</Link>
        </div>
        <div className="header-actions-mobile">
          <DocsSearch compact />
          <button type="button" className="icon-button" onClick={() => setMenuOpen(true)} aria-label="문서 메뉴 열기">
            <Menu aria-hidden="true" />
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="문서 메뉴">
          <div className="mobile-drawer-head">
            <span><BookOpen aria-hidden="true" /> 문서 탐색</span>
            <button type="button" className="icon-button" onClick={() => setMenuOpen(false)} aria-label="문서 메뉴 닫기">
              <X aria-hidden="true" />
            </button>
          </div>
          <nav className="mobile-navigation">
            {navigation.map((category) => (
              <section key={category.id}>
                <h2>{category.icon} {category.name}</h2>
                {category.docs.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/doc/${encodeURIComponent(doc.slug)}`}
                    className={doc.slug === currentSlug ? "is-active" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    {doc.title}
                  </Link>
                ))}
              </section>
            ))}
          </nav>
          <div className="mobile-drawer-links">
            <Link href="https://status.teamwicked.me" target="_blank">서비스 상태 <ExternalLink aria-hidden="true" /></Link>
            <Link href="https://teamwicked.me" target="_blank">Team WICKED <ExternalLink aria-hidden="true" /></Link>
            <ThemeToggle />
            <Link href="/admin" className="admin-button"><UserRound aria-hidden="true" /> 관리자</Link>
          </div>
        </div>
      ) : null}

      {tocOpen ? (
        <div className="mobile-toc-sheet" role="dialog" aria-modal="true" aria-label="이 페이지의 목차">
          <div><strong>이 페이지의 목차</strong><button type="button" className="icon-button" onClick={() => setTocOpen(false)} aria-label="목차 닫기"><X /></button></div>
          <nav>
            {tocItems.length ? tocItems.map((item) => <a key={item.id} href={`#${item.id}`} onClick={() => setTocOpen(false)}>{item.text}</a>) : <p>이 문서에는 목차가 없습니다.</p>}
          </nav>
        </div>
      ) : null}

      <nav className="mobile-doc-dock" aria-label="모바일 문서 도구">
        <button type="button" className="dock-action is-active" onClick={() => setMenuOpen(true)}><BookOpen aria-hidden="true" /><span>문서</span></button>
        <button type="button" className="dock-action" onClick={openTableOfContents}><ListTree aria-hidden="true" /><span>목차</span></button>
        <DockThemeToggle />
        <Link href="/admin" className="dock-action dock-admin"><UserRound aria-hidden="true" /><span>관리자</span></Link>
      </nav>
    </>
  );
}
