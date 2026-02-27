"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Charge = {
  id: string;
  address: string;
  amount: string;
  status: string;
  txHash: string | null;
  errorSummary: string | null;
  createdAt: string;
};

function ChargeStatusContent() {
  const searchParams = useSearchParams();
  const chargeId = searchParams.get("chargeId");
  const [charge, setCharge] = useState<Charge | null>(null);
  const [loading, setLoading] = useState(!!chargeId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chargeId) {
      setError("缺少 chargeId");
      setLoading(false);
      return;
    }
    api<Charge>(`/charge/status?chargeId=${encodeURIComponent(chargeId)}`)
      .then(setCharge)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [chargeId]);

  if (loading) return <p>加载中…</p>;
  if (error || !charge) return <p>{error || "未找到"}</p>;

  return (
    <div>
      <h1>扣费状态</h1>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
        <dt>ID</dt><dd>{charge.id}</dd>
        <dt>地址</dt><dd style={{ fontFamily: "monospace" }}>{charge.address}</dd>
        <dt>金额</dt><dd>{charge.amount}</dd>
        <dt>状态</dt><dd>{charge.status}</dd>
        <dt>TxHash</dt><dd style={{ fontFamily: "monospace" }}>{charge.txHash ?? "—"}</dd>
        <dt>错误</dt><dd style={{ color: "#f87171" }}>{charge.errorSummary ?? "—"}</dd>
        <dt>创建时间</dt><dd>{new Date(charge.createdAt).toLocaleString()}</dd>
      </dl>
    </div>
  );
}

export default function ChargeStatusPage() {
  return (
    <Suspense fallback={<p>加载中…</p>}>
      <ChargeStatusContent />
    </Suspense>
  );
}
