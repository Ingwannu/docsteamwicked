import { NextResponse } from "next/server";
import { restoreVersion } from "@/lib/db";
import { apiError, assertSameOrigin, requireAdminApi } from "@/lib/http";

interface RouteProps { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteProps) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    assertSameOrigin(request);
    const versionId = Number((await params).id);
    const body = (await request.json()) as { docId?: number };
    const docId = Number(body.docId);
    if (!Number.isInteger(versionId) || !Number.isInteger(docId)) throw new Error("버전 정보가 올바르지 않습니다.");
    return NextResponse.json({ doc: restoreVersion(docId, versionId) });
  } catch (error) {
    return apiError(error);
  }
}
