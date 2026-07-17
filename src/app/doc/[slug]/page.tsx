import { ArrowLeft, ArrowRight, BookOpen, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsShell } from "@/components/docs/docs-shell";
import { Feedback } from "@/components/docs/feedback";
import { MarkdownContent } from "@/components/docs/markdown-content";
import { TableOfContents } from "@/components/docs/table-of-contents";
import { getDocBySlug, getNavigation, recordView } from "@/lib/db";
import { extractHeadings, readingTime, withoutLeadingTitle } from "@/lib/markdown";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return { title: "문서를 찾을 수 없습니다" };
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `/doc/${encodeURIComponent(doc.slug)}` },
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const navigation = getNavigation(true);
  const content = withoutLeadingTitle(doc.content);
  const headings = extractHeadings(content);
  const orderedDocs = navigation.flatMap((category) => category.docs);
  const index = orderedDocs.findIndex((item) => item.id === doc.id);
  const previous = index > 0 ? orderedDocs[index - 1] : null;
  const next = index >= 0 && index < orderedDocs.length - 1 ? orderedDocs[index + 1] : null;
  recordView(doc.id);

  return (
    <DocsShell navigation={navigation} currentSlug={doc.slug}>
      <main className="doc-main">
        <div className="mobile-current-page"><BookOpen aria-hidden="true" /> {doc.categoryName || "문서"} / <strong>{doc.title}</strong></div>
        <article className="doc-article">
          <header className="doc-title-block">
            <p className="doc-meta"><span>{doc.categoryName || "문서"}</span><span><Clock3 aria-hidden="true" /> {readingTime(content)}분 읽기</span></p>
            <h1>{doc.title}</h1>
            {doc.description ? <p className="doc-description">{doc.description}</p> : null}
          </header>
          <MarkdownContent content={content} />
          <div className="mobile-feedback"><Feedback docId={doc.id} /></div>
          <nav className="doc-pagination" aria-label="문서 이동">
            {previous ? (
              <Link href={`/doc/${encodeURIComponent(previous.slug)}`}>
                <ArrowLeft aria-hidden="true" /><span><small>이전 문서</small>{previous.title}</span>
              </Link>
            ) : <span />}
            {next ? (
              <Link href={`/doc/${encodeURIComponent(next.slug)}`}>
                <span><small>다음 문서</small>{next.title}</span><ArrowRight aria-hidden="true" />
              </Link>
            ) : <span />}
          </nav>
        </article>
      </main>
      <TableOfContents headings={headings} docId={doc.id} />
    </DocsShell>
  );
}
