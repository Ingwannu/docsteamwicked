const MARKDOWN_DECORATION = /[`*_~\[\]<>]/g;

export function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("ko")
    .replace(MARKDOWN_DECORATION, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function headingText(value: string): string {
  return value
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(MARKDOWN_DECORATION, "")
    .trim();
}
