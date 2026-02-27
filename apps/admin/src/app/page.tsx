"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const router = useRouter();
  useEffect(() => {
    const auth = typeof window !== "undefined" ? localStorage.getItem("adminAuth") : null;
    if (auth) router.replace("/dashboard");
    else router.replace("/login");
  }, [router]);
  return <div style={{ padding: 2 }}>Redirecting…</div>;
}
