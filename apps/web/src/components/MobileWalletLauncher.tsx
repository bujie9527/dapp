"use client";

import { useState, useCallback } from "react";

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
}

function hasInjected(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as { ethereum?: unknown }).ethereum;
}

/** 快捷钱包顺序（Onchain 排第一） */
const WALLET_ORDER = ["onchain", "tokenpocket", "okx", "metamask", "trust"] as const;

/** Deep link 配置：点击后在对应钱包内置浏览器打开当前页面 URL */
const WALLET_DEEP_LINKS: Record<
  string,
  { name: string; getUrl: (currentUrl: string) => string }
> = {
  onchain: {
    name: "Onchain",
    getUrl: (url) =>
      `https://link.onchain.com/open_url?url=${encodeURIComponent(url)}`,
  },
  tokenpocket: {
    name: "TokenPocket",
    getUrl: (url) => {
      const param = encodeURIComponent(JSON.stringify({ url }));
      return `tpdapp://open?params=${param}`;
    },
  },
  okx: {
    name: "OKX",
    getUrl: (url) => `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(url)}`,
  },
  metamask: {
    name: "MetaMask",
    getUrl: (url) => `https://metamask.app.link/dapp/${encodeURIComponent(url)}`,
  },
  trust: {
    name: "Trust Wallet",
    getUrl: (url) => `https://link.trustwallet.com/open_url?url=${encodeURIComponent(url)}`,
  },
};

const DETECT_STILL_ON_PAGE_MS = 1500;

export interface MobileWalletLauncherProps {
  /** 点击「更多钱包」时调用，用于触发 WalletConnect connect() */
  onWalletConnect: () => void;
}

export function MobileWalletLauncher({ onWalletConnect }: MobileWalletLauncherProps) {
  const [toast, setToast] = useState<string | null>(null);

  const handleDeepLink = useCallback((key: string) => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const wallet = WALLET_DEEP_LINKS[key];
    if (!wallet) return;
    const link = wallet.getUrl(currentUrl);
    setToast(null);
    window.location.href = link;
    setTimeout(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        setToast("未检测到钱包App，请安装或使用更多钱包");
      }
    }, DETECT_STILL_ON_PAGE_MS);
  }, []);

  if (typeof window === "undefined") return null;
  if (!isMobile()) return null;
  if (hasInjected()) return null;

  return (
    <div style={{ marginBottom: "1rem" }}>
      <p style={{ fontSize: "0.875rem", color: "#94a3b8", marginBottom: 8 }}>
        在钱包 App 内打开本页，连接更顺畅：
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {WALLET_ORDER.filter((key) => key in WALLET_DEEP_LINKS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleDeepLink(key)}
            style={{
              padding: "0.5rem 0.75rem",
              background: "#334155",
              border: "none",
              borderRadius: 8,
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {WALLET_DEEP_LINKS[key].name}
          </button>
        ))}
        <button
          type="button"
          onClick={onWalletConnect}
          style={{
            padding: "0.5rem 0.75rem",
            background: "#3b82f6",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          更多钱包（WalletConnect）
        </button>
      </div>
      {toast && (
        <p
          style={{
            marginTop: 8,
            fontSize: "0.8125rem",
            color: "#fbbf24",
            padding: "6px 8px",
            background: "rgba(251, 191, 36, 0.15)",
            borderRadius: 6,
          }}
        >
          {toast}
        </p>
      )}
    </div>
  );
}
