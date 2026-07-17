import type { ReactNode } from "react";
import type { CategoryWithDocs } from "@/lib/types";
import { DocsHeader } from "@/components/docs/docs-header";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export function DocsShell({
  navigation,
  currentSlug,
  children,
}: {
  navigation: CategoryWithDocs[];
  currentSlug: string;
  children: ReactNode;
}) {
  return (
    <div className="docs-app">
      <DocsHeader navigation={navigation} currentSlug={currentSlug} />
      <DocsSidebar navigation={navigation} currentSlug={currentSlug} />
      {children}
    </div>
  );
}
