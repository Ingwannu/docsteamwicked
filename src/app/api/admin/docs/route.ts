import { NextResponse } from "next/server";
import { saveDoc } from "@/lib/db";
import { apiError, assertSameOrigin, requireAdminApi } from "@/lib/http";
import { docSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    assertSameOrigin(request);
    const input = docSchema.parse(await request.json());
    return NextResponse.json({ doc: saveDoc(null, input) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
