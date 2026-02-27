"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function ChargePage() {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ chargeId?: string; txHash?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api<{ chargeId: string; txHash: string }>("/charge", {
        method: "POST",
        body: { address: address.trim(), amount: amount.trim() },
      });
      setResult({ chargeId: data.chargeId, txHash: data.txHash });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "扣费失败" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>发起扣费</h1>
      <p style={{ color: "#71717a", marginBottom: "1rem" }}>
        对已 approve 的地址发起扣费，后端使用 CHARGER_PRIVATE_KEY 调用 Charger.charge。
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: 4 }}>地址</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            required
            style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #3f3f46" }}
          />
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: 4 }}>金额（最小单位）</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000"
            required
            style={{ width: "100%", padding: "0.5rem", borderRadius: 6, border: "1px solid #3f3f46" }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.75rem 1.25rem",
            background: "#22c55e",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "提交中…" : "发起扣费"}
        </button>
      </form>
      {result && (
        <div style={{ marginTop: "1rem", padding: "1rem", background: result.error ? "#3f1f1f" : "#1e3a2f", borderRadius: 8 }}>
          {result.error ? (
            <p style={{ color: "#f87171" }}>{result.error}</p>
          ) : (
            <>
              <p>chargeId: {result.chargeId}</p>
              <p>txHash: {result.txHash}</p>
              <p><a href={`/dashboard/charge/status?chargeId=${result.chargeId}`} style={{ color: "#7dd3fc" }}>查看状态</a></p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
