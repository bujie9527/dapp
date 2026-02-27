"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthFlow } from "@/components/AuthFlow";

function EmbedContent() {
  const searchParams = useSearchParams();
  const apiUrl = searchParams.get("apiUrl") ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return <AuthFlow apiUrl={apiUrl} compact />;
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div style={{ padding: "1rem" }}>加载中…</div>}>
      <EmbedContent />
    </Suspense>
  );
}
