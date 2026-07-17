"use client";

import { ArrowRight, KeyRound, LoaderCircle, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "로그인하지 못했습니다.");
      setBusy(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        <span>관리자 아이디</span>
        <div><UserRound aria-hidden="true" /><input name="username" autoComplete="username" required /></div>
      </label>
      <label>
        <span>비밀번호</span>
        <div><KeyRound aria-hidden="true" /><input name="password" type="password" autoComplete="current-password" required /></div>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button type="submit" className="primary-action" disabled={busy}>
        {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : null}
        {busy ? "로그인 중" : "관리자 로그인"}
        {busy ? null : <ArrowRight aria-hidden="true" />}
      </button>
    </form>
  );
}
