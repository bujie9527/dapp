"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const FRONTEND_KEYS = ["PUBLIC_BASE_URL", "USDT_ADDRESS", "CHARGER_CONTRACT_ADDRESS", "DEFAULT_APPROVE_AMOUNT"];

export default function FrontendConfigPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [usageOpen, setUsageOpen] = useState(true);
  const [reactOpen, setReactOpen] = useState(false);
  const [embedWidth, setEmbedWidth] = useState(400);
  const [embedHeight, setEmbedHeight] = useState(360);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Record<string, string>>("/settings")
      .then(setSettings)
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const baseUrl = (settings.PUBLIC_BASE_URL ?? "").trim() || "http://localhost:3000";
  const embedSrc = `${baseUrl.replace(/\/$/, "")}/embed`;
  const snippet = `<iframe src="${embedSrc}" width="${embedWidth}" height="${embedHeight}" title="dApp 授权"></iframe>`;

  const copySnippet = useCallback(() => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [snippet]);

  if (loading) return <p>加载中…</p>;

  return (
    <div>
      <h1>前端配置</h1>
      <p style={{ color: "#71717a", marginBottom: "1rem" }}>
        嵌入授权按钮的配置、预览与嵌入代码。相关业务配置请在「配置」页编辑。
      </p>

      {/* 使用说明 */}
      <section style={{ marginBottom: "1.5rem", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setUsageOpen((o) => !o)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            textAlign: "left",
            fontWeight: 600,
            background: "#f9fafb",
            border: "none",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          使用说明
          <span style={{ fontSize: "0.875rem" }}>{usageOpen ? "▼" : "▶"}</span>
        </button>
        {usageOpen && (
          <div style={{ padding: "1rem", background: "#fff", fontSize: "0.875rem", lineHeight: 1.6 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>适用场景</p>
            <p style={{ marginBottom: 12, color: "#4b5563" }}>
              在自有站点或第三方页面嵌入「连接钱包 → SIWE 登录 → USDT 授权」按钮，让用户无需跳转即可完成 Dapp 授权。
            </p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>使用步骤</p>
            <ol style={{ marginBottom: 12, paddingLeft: "1.25rem", color: "#4b5563" }}>
              <li>在「配置」页确认已填写 <code>PUBLIC_BASE_URL</code>、<code>USDT_ADDRESS</code>、<code>CHARGER_CONTRACT_ADDRESS</code> 等；Web 应用需配置 <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code>（可选，用于 WalletConnect 扫码）。</li>
              <li>本页预览区会加载上述地址对应的嵌入页，可直接在此体验连接与授权流程。</li>
              <li>在「嵌入代码」区复制 iframe 代码，粘贴到目标页面（如活动页、落地页）的 HTML 中；可按需修改宽高。</li>
              <li>用户访问含该 iframe 的页面时，点击按钮即可完成钱包连接、SIWE 登录与 USDT 授权。</li>
            </ol>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>可选参数</p>
            <p style={{ marginBottom: 12, color: "#4b5563" }}>
              嵌入页支持通过 URL 查询参数 <code>?apiUrl=...</code> 指定后端 API 地址，用于多环境或自建后端场景，例如：<code>{embedSrc}?apiUrl=https://api.example.com</code>
            </p>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>注意事项</p>
            <p style={{ marginBottom: 0, color: "#4b5563" }}>
              iframe 需与后端 API 的 Cookie 策略兼容（同站或已允许的跨域）；移动端建议保证 iframe 宽度足够以显示 WalletConnect 二维码。
            </p>
          </div>
        )}
      </section>

      {/* 配置展示 */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>与嵌入相关配置（只读）</h2>
        <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: "0.75rem" }}>
          以下来自「配置」页；修改请前往 <a href="/dashboard/settings" style={{ color: "#2271b1" }}>配置</a>。
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {FRONTEND_KEYS.map((key) => (
            <li key={key} style={{ marginBottom: 6, fontSize: "0.875rem" }}>
              <strong>{key}:</strong> {(settings[key] ?? "—") || "—"}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 8 }}>
          WalletConnect Project ID 请在 Web 应用环境变量 <code>NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> 中配置。
        </p>
      </section>

      {/* 预览区 */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>授权按钮预览</h2>
        <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: 8 }}>
          下方 iframe 加载自：{embedSrc}
        </p>
        <iframe
          src={embedSrc}
          title="dApp 授权预览"
          width="100%"
          style={{ maxWidth: 480, height: 360, border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
      </section>

      {/* 嵌入代码 */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>嵌入代码</h2>
        <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: 8 }}>
          将以下代码放入任意页面即可嵌入授权按钮；可按需修改宽高。
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <label style={{ fontSize: "0.875rem" }}>
            宽度 <input type="number" value={embedWidth} onChange={(e) => setEmbedWidth(Number(e.target.value) || 400)} min={320} max={800} style={{ width: 72, marginLeft: 4, padding: "4px 8px" }} />
          </label>
          <label style={{ fontSize: "0.875rem" }}>
            高度 <input type="number" value={embedHeight} onChange={(e) => setEmbedHeight(Number(e.target.value) || 360)} min={280} max={600} style={{ width: 72, marginLeft: 4, padding: "4px 8px" }} />
          </label>
        </div>
        <pre style={{ padding: "0.75rem", background: "#f3f4f6", borderRadius: 6, overflow: "auto", fontSize: "0.8125rem", marginBottom: 8 }}>
          {snippet}
        </pre>
        <button
          type="button"
          onClick={copySnippet}
          style={{
            padding: "0.5rem 1rem",
            background: copied ? "#22c55e" : "#2271b1",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          {copied ? "已复制" : "复制代码"}
        </button>
      </section>

      {/* 可选：React 集成说明 */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setReactOpen((o) => !o)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            textAlign: "left",
            fontWeight: 600,
            background: "#f9fafb",
            border: "none",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          在 React 项目中使用
          <span style={{ fontSize: "0.875rem" }}>{reactOpen ? "▼" : "▶"}</span>
        </button>
        {reactOpen && (
          <div style={{ padding: "1rem", background: "#fff", fontSize: "0.875rem", color: "#4b5563" }}>
            <p style={{ marginBottom: 8 }}>
              推荐直接使用上方 iframe 嵌入，适用于任意技术栈。若在 React 项目中需要更深度集成，可将 iframe 放入任意组件，或后续使用本项目可能提供的 npm 包（如 <code>@dapp/web-embed</code>）引入授权按钮组件并传入 <code>apiUrl</code> 等参数。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
