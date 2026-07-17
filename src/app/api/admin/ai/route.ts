import { NextResponse } from "next/server";
import { apiError, assertSameOrigin, requireAdminApi } from "@/lib/http";
import { aiSchema } from "@/lib/validators";

const ACTION_PROMPTS = {
  write: "주제를 바탕으로 실무형 호스팅 문서를 완성해 주세요. 제목부터 시작하고 단계, 예시, 주의사항을 포함하세요.",
  improve: "기존 문서의 사실과 의미는 유지하면서 더 명확하고 읽기 쉬운 한국어 기술 문서로 개선해 주세요.",
  outline: "주제에 적합한 문서 목차와 각 절에서 다룰 핵심 내용을 제안해 주세요.",
  faq: "기존 문서를 바탕으로 사용자가 실제로 묻는 질문과 짧고 정확한 답변을 FAQ 형식으로 작성해 주세요.",
  troubleshoot: "증상, 원인 후보, 확인 절차, 해결, 재발 방지 순서의 문제 해결 문서를 작성해 주세요.",
  chat: "사용자의 요청을 문서 편집 관점에서 정확하고 간결하게 도와주세요.",
} as const;

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    assertSameOrigin(request);
    const input = aiSchema.parse(await request.json());
    const apiKey = process.env.TEAMWICKED_API_KEY;
    const apiUrl = process.env.AI_API_URL || "https://api.teamwicked.me/v1";
    if (!apiKey) throw new Error("TEAMWICKED_API_KEY가 설정되지 않았습니다.");

    const messages = [
      {
        role: "system",
        content: "당신은 Wickedhost Docs의 한국어 기술 문서 편집자입니다. 결과는 Markdown만 반환하고, 확인되지 않은 제품 기능을 지어내지 마세요.",
      },
      ...(input.messages || []).slice(-12),
      {
        role: "user",
        content: `${ACTION_PROMPTS[input.action]}\n\n주제: ${input.topic || "기존 문서 개선"}\n\n기존 내용:\n${input.content}`,
      },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.AI_MODEL || "teamwicked-mimo", messages, max_tokens: 5000 }),
      signal: controller.signal,
      cache: "no-store",
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) throw new Error(`AI API 응답 오류 (${response.status})`);
    const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("AI가 빈 응답을 반환했습니다.");
    return NextResponse.json({ content });
  } catch (error) {
    return apiError(error);
  }
}
