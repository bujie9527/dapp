import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { base } from "wagmi/chains";

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
