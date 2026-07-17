import { NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const data = loginSchema.parse(await request.json());
    if (!verifyCredentials(data.username, data.password)) {
      return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
