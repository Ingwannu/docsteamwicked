import { LifeBuoy, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import type { CategoryWithDocs } from "@/lib/types";

export function DocsSidebar({ navigation, currentSlug }: { navigation: CategoryWithDocs[]; currentSlug: string }) {
  return (
    <aside className="docs-sidebar">
      <nav aria-label="문서 카테고리">
        {navigation.map((category) => (
          <section className="nav-group" key={category.id}>
            <h2><span aria-hidden="true">{category.icon}</span>{category.name}</h2>
            {category.docs.map((doc) => (
              <Link
                key={doc.id}
                href={`/doc/${encodeURIComponent(doc.slug)}`}
                className={doc.slug === currentSlug ? "is-active" : undefined}
                aria-current={doc.slug === currentSlug ? "page" : undefined}
              >
                {doc.title}
              </Link>
            ))}
          </section>
        ))}
      </nav>
      <div className="sidebar-help">
        <LifeBuoy aria-hidden="true" />
        <strong>도움이 필요하신가요?</strong>
        <p>문제로 막혔다면 지원팀이 빠르게 도와드립니다.</p>
        <Link href="https://store.teamwicked.me/plugin/support_manager/client_tickets/add/" target="_blank">
          지원 요청하기 <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="sidebar-footer"><PanelLeftClose aria-hidden="true" /> 문서 센터</div>
    </aside>
  );
}
