import { headingText, slugify } from "@/lib/slug";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export function extractHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const seen = new Map<string, number>();

  for (const line of markdown.split("\n")) {
    const match = /^(#{2,4})\s+(.+?)\s*#*$/.exec(line.trim());
    if (!match) continue;

    const text = headingText(match[2]);
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.push({
      id: count === 0 ? base : `${base}-${count + 1}`,
      text,
      level: match[1].length,
    });
  }

  return headings;
}

export function readingTime(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\-[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 260));
}

export function withoutLeadingTitle(markdown: string): string {
  return markdown.replace(/^\s*#\s+[^\n]+\n+/, "").trimStart();
}
