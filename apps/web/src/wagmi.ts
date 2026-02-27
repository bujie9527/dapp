import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { base } from "wagmi/chains";
import type { Connector } from "wagmi";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    ...(projectId
      ? [
          walletConnect({
            projectId,
            qrModalOptions: {
              explorerRecommendedWalletIds: [
                "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
                "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // Trust Wallet
                "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393", // TokenPocket
              ],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org"),
  },
  ssr: true,
});

/**
 * Injected 优先的连接策略：有 window.ethereum 时优先返回 injected，否则返回 walletConnect。
 * 用于 UI 上优先展示/使用 injected（如钱包内置浏览器、浏览器插件）。
 */
export function getPreferredConnector(connectors: Connector[]): Connector | undefined {
  const injectedConnector = connectors.find((c) => c.id === "injected");
  const wcConnector = connectors.find((c) => c.id === "walletConnect");
  if (typeof window === "undefined") return wcConnector ?? injectedConnector;
  if ((window as unknown as { ethereum?: unknown }).ethereum) {
    return injectedConnector ?? wcConnector;
  }
  return wcConnector ?? injectedConnector;
}
