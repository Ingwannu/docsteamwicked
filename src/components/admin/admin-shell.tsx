"use client";

import { BookOpenText, FolderTree, Gauge, History, LogOut, Plus, Settings2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/admin", label: "대시보드", icon: Gauge },
  { href: "/admin#documents", label: "문서", icon: BookOpenText },
  { href: "/admin#categories", label: "카테고리", icon: FolderTree },
] as const;

export function AdminShell({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand"><Image src="/WICKED.svg" width={34} height={34} alt="" /> <span>WICKED DOCS</span></Link>
        <nav>
          {links.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin" ? pathname === "/admin" : false;
            return <Link key={item.href} href={item.href} className={active ? "is-active" : undefined}><Icon aria-hidden="true" />{item.label}</Link>;
          })}
          {pathname.includes("/versions/") ? <span className="is-active"><History aria-hidden="true" />버전 기록</span> : null}
        </nav>
        <Link href="/admin/docs/new" className="admin-new-doc"><Plus aria-hidden="true" /> 새 문서</Link>
        <div className="admin-profile">
          <span><Settings2 aria-hidden="true" /></span>
          <div><strong>관리자</strong><small>Wickedhost Docs</small></div>
          <button type="button" onClick={logout} aria-label="로그아웃"><LogOut aria-hidden="true" /></button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div><small>관리자</small><span>/</span><strong>{title}</strong></div>{actions}</header>
        {children}
      </main>
    </div>
  );
}
