import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdmin } from "@/lib/auth";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="admin-login-page">
      <section className="admin-login-brand">
        <Link href="/" className="admin-brand"><Image src="/WICKED.svg" width={38} height={38} alt="" /><span>WICKED DOCS</span></Link>
        <div><h1>문서를 운영하는 가장 빠른 방법.</h1><p>TeamWicked 디자인 시스템과 문서 편집 도구를 한 곳에서 관리합니다.</p></div>
      </section>
      <section className="admin-login-panel">
        <div><small>ADMIN CONSOLE</small><h2>관리자 로그인</h2><p>운영 계정으로 문서 센터에 접속하세요.</p><AdminLoginForm /><Link href="/">← 문서로 돌아가기</Link></div>
      </section>
    </main>
  );
}
