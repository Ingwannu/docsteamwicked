import { NextResponse } from "next/server";
import { submitFeedback } from "@/lib/db";
import { apiError, assertSameOrigin } from "@/lib/http";
import { feedbackSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const data = feedbackSchema.parse(await request.json());
    submitFeedback(data.docId, data.rating, data.comment);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
