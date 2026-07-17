import type { ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/docs/code-block";

function childText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return childText((children as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
        components={{
          pre({ children }) {
            const element = children as ReactElement<{ className?: string; children?: ReactNode }>;
            const language = /language-([^\s]+)/.exec(element?.props?.className || "")?.[1];
            return <CodeBlock code={childText(element?.props?.children).replace(/\n$/, "")} language={language} />;
          },
          code({ children, className }) {
            return <code className={className}>{children}</code>;
          },
          a({ href, children }) {
            const external = href?.startsWith("http");
            return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
