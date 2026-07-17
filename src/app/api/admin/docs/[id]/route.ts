import { NextResponse } from "next/server";
import { deleteDoc, saveDoc } from "@/lib/db";
import { apiError, assertSameOrigin, requireAdminApi } from "@/lib/http";
import { docSchema } from "@/lib/validators";

interface RouteProps { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: RouteProps) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    assertSameOrigin(request);
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("문서 ID가 올바르지 않습니다.");
    const input = docSchema.parse(await request.json());
    return NextResponse.json({ doc: saveDoc(id, input) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    assertSameOrigin(request);
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw new Error("문서 ID가 올바르지 않습니다.");
    deleteDoc(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
