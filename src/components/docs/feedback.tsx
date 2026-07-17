"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

export function Feedback({ docId }: { docId: number }) {
  const [submitted, setSubmitted] = useState<1 | -1 | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (rating: 1 | -1) => {
    if (busy || submitted) return;
    setBusy(true);
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ docId, rating }),
    });
    if (response.ok) setSubmitted(rating);
    setBusy(false);
  };

  return (
    <div className="feedback-block">
      <p>{submitted ? "의견을 남겨주셔서 감사합니다." : "이 페이지가 도움이 되었나요?"}</p>
      <div>
        <button type="button" onClick={() => send(1)} disabled={busy || submitted !== null} aria-label="도움이 됐어요">
          <ThumbsUp aria-hidden="true" />
        </button>
        <button type="button" onClick={() => send(-1)} disabled={busy || submitted !== null} aria-label="도움이 안 됐어요">
          <ThumbsDown aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
