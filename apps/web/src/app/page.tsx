"use client";

import { AuthFlow } from "@/components/AuthFlow";

export default function Home() {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem", padding: "2rem 2rem 0" }}>dApp 授权</h1>
      <p style={{ color: "#71717a", marginBottom: "1.5rem", padding: "0 2rem" }}>
        连接钱包 → 签名登录 (SIWE) → 授权 USDT 给 Charger 合约
      </p>
      <AuthFlow />
    </div>
  );
}
