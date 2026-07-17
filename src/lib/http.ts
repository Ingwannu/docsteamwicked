import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  // Proxies terminate TLS and can rewrite request.url to an internal bind address.
  // Host headers preserve the browser-visible authority, so they are the correct CSRF boundary.
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const visibleHost = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  if (new URL(origin).host !== visibleHost) {
    throw new Error("허용되지 않은 요청 출처입니다.");
  }
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
}

export function apiError(error: unknown, fallback = "요청을 처리하지 못했습니다."): NextResponse {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}
