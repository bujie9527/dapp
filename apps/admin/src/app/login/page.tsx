"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user.trim() || !pass) {
      setError("请输入账号和密码");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: user.trim(), pass }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      router.replace("/dashboard");
    } catch {
      setError("登录失败，请检查账号密码（默认 admin / admin）");
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "1.5rem" }}>
      <h1 style={{ marginBottom: "1rem" }}>Admin 登录</h1>
      <p style={{ color: "#71717a", marginBottom: "1.5rem" }}>使用环境变量 ADMIN_USER / ADMIN_PASSWORD</p>
      {error && (
        <div style={{ padding: "0.75rem", background: "#3f1f1f", borderRadius: 8, marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: 4 }}>账号</label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #3f3f46" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: 4 }}>密码</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #3f3f46" }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: "0.75rem 1.25rem",
            background: "#3b82f6",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          登录
        </button>
      </form>
    </main>
  );
}
