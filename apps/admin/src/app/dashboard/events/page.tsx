"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type EventItem = {
  id: string;
  type: string;
  status: string;
  address: string | null;
  txHash: string | null;
  errorSummary: string | null;
  createdAt: string;
  user?: { address: string } | null;
};

export default function EventsPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const load = async (cursor?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (cursor) params.set("cursor", cursor);
      const data = await api<{ items: EventItem[]; nextCursor: string | null }>(
        `/events?${params.toString()}`
      );
      if (cursor) setItems((prev) => [...prev, ...data.items]);
      else setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type, status]);

  return (
    <div>
      <h1>事件列表</h1>
      <div style={{ marginBottom: "1rem", display: "flex", gap: 8 }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ padding: "0.5rem", borderRadius: 6 }}
        >
          <option value="">全部类型</option>
          <option value="SIWE">SIWE</option>
          <option value="APPROVE">APPROVE</option>
          <option value="CHARGE">CHARGE</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "0.5rem", borderRadius: 6 }}
        >
          <option value="">全部状态</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="REJECTED">REJECTED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>
      {loading && items.length === 0 ? (
        <p>加载中…</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #3f3f46" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>时间</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>类型</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>状态</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>地址</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>TxHash</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>错误</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: "1px solid #27272a" }}>
                  <td style={{ padding: "0.5rem" }}>{new Date(ev.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "0.5rem" }}>{ev.type}</td>
                  <td style={{ padding: "0.5rem" }}>{ev.status}</td>
                  <td style={{ padding: "0.5rem", fontFamily: "monospace" }}>{ev.address ?? ev.user?.address ?? "—"}</td>
                  <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: 12 }}>
                    {ev.txHash ? `${ev.txHash.slice(0, 10)}…` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem", color: "#f87171" }}>{ev.errorSummary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {nextCursor && (
            <button
              onClick={() => load(nextCursor)}
              disabled={loading}
              style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "加载中…" : "加载更多"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
