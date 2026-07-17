import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "wicked_docs_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

interface SessionPayload {
  expiresAt: number;
}

function secret(): string {
  const value = process.env.SECRET_KEY?.trim();
  if (!value || value.length < 24) {
    throw new Error("SECRET_KEY must contain at least 24 characters.");
  }
  return value;
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  if (!expectedUser || !expectedPassword) return false;
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPassword);
}

export function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 } satisfies SessionPayload),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, providedSignature] = token.split(".");
  if (!payload || !providedSignature || !safeEqual(signature(payload), providedSignature)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    return Number.isFinite(parsed.expiresAt) && parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
