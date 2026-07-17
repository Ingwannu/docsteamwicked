import { NextResponse } from "next/server";
import { createCategory, deleteCategory } from "@/lib/db";
import { apiError, assertSameOrigin, requireAdminApi } from "@/lib/http";
import { categorySchema } from "@/lib/validators";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    assertSameOrigin(request);
    const input = categorySchema.parse(await request.json());
    return NextResponse.json({ category: createCategory(input.name, input.slug, input.icon) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    assertSameOrigin(request);
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) throw new Error("카테고리 ID가 올바르지 않습니다.");
    deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
