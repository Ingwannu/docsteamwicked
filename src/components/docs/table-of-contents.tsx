import type { HeadingItem } from "@/lib/markdown";
import { Feedback } from "@/components/docs/feedback";

export function TableOfContents({ headings, docId }: { headings: HeadingItem[]; docId: number }) {
  return (
    <aside className="docs-toc">
      <div>
        <h2>이 페이지의 목차</h2>
        <nav aria-label="이 페이지의 목차">
          {headings.map((heading, index) => (
            <a
              key={`${heading.id}-${index}`}
              href={`#${heading.id}`}
              className={`${heading.level > 2 ? "is-nested" : ""} ${index === 0 ? "is-active" : ""}`}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      </div>
      <Feedback docId={docId} />
    </aside>
  );
}
