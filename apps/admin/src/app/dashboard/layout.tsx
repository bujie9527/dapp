"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearAdminAuth } from "@/lib/api";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: "include" })
      .then((r) => {
        setAllowed(r.ok);
        if (!r.ok) router.replace("/login");
      })
      .catch(() => {
        setAllowed(false);
        router.replace("/login");
      });
  }, [router, pathname]);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/charge")) setChargeOpen(true);
  }, [pathname]);

  const logout = () => {
    clearAdminAuth();
    router.replace("/login");
  };

  if (allowed === null) {
    return (
      <div className="admin-main-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>加载中…</p>
      </div>
    );
  }
  if (allowed === false) return null;

  return (
    <>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">dApp 管理</div>
        <nav className="admin-sidebar-nav">
          <ul className="admin-sidebar-menu">
            <li>
              <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
                概览
              </Link>
            </li>
            <li>
              <Link href="/dashboard/events" className={pathname.startsWith("/dashboard/events") ? "active" : ""}>
                事件
              </Link>
            </li>
            <li>
              <Link href="/dashboard/users" className={pathname.startsWith("/dashboard/users") ? "active" : ""}>
                用户
              </Link>
            </li>
            <li>
              <Link href="/dashboard/settings" className={pathname.startsWith("/dashboard/settings") ? "active" : ""}>
                配置
              </Link>
            </li>
            <li>
              <Link href="/dashboard/frontend-config" className={pathname.startsWith("/dashboard/frontend-config") ? "active" : ""}>
                前端配置
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={`accordion-trigger ${pathname.startsWith("/dashboard/charge") ? "active" : ""}`}
                aria-expanded={chargeOpen}
                onClick={() => setChargeOpen((o) => !o)}
              >
                扣费
              </button>
              <ul className="admin-sidebar-submenu" style={{ display: chargeOpen ? "block" : "none" }}>
                <li>
                  <Link
                    href="/dashboard/charge"
                    className={pathname === "/dashboard/charge" ? "active" : ""}
                  >
                    发起扣费
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/charge/status"
                    className={pathname.startsWith("/dashboard/charge/status") ? "active" : ""}
                  >
                    扣费状态
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" onClick={logout}>
            退出
          </button>
        </div>
      </aside>
      <div className="admin-main-wrap">
        <main className="admin-main">{children}</main>
      </div>
    </>
  );
}
