"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/** 每个配置项的功能说明与获取方式，后续凡涉及此类参数均需在此维护说明 */
const CONFIG_META: Record<
  string,
  { label: string; description: string; howToGet: string }
> = {
  PUBLIC_BASE_URL: {
    label: "PUBLIC_BASE_URL",
    description: "对外展示的前端/站点根地址，用于 SIWE 的 domain、前端资源与回调链接等。",
    howToGet: "填写实际访问的站点根 URL，如 https://yourdomain.com 或 http://localhost:3000。",
  },
  BASE_RPC_URL: {
    label: "BASE_RPC_URL",
    description: "Base 链的 RPC 节点地址，用于后端发链上交易（如扣费）、前端读链数据。",
    howToGet: "可从 Base 官方 https://mainnet.base.org 或第三方（如 Alchemy、Infura、QuickNode）获取；测试网用 https://sepolia.base.org。",
  },
  USDT_ADDRESS: {
    label: "USDT_ADDRESS",
    description: "Base 链上 USDT 合约地址，用户 Approve 与 Charger 扣费均针对该合约。",
    howToGet: "Base 主网 USDT 官方合约地址可从 Base 文档或 basescan.org 查询；测试网使用对应测试网 USDT 地址。",
  },
  CHARGER_CONTRACT_ADDRESS: {
    label: "CHARGER_CONTRACT_ADDRESS",
    description: "本项目 Charger 合约部署后的地址，仅 owner 可调用 charge，从用户授权额度内扣 USDT。",
    howToGet: "部署 contracts/Charger.sol 后从部署输出或区块浏览器获取合约地址。",
  },
  DEFAULT_APPROVE_AMOUNT: {
    label: "DEFAULT_APPROVE_AMOUNT",
    description: "用户端默认授权给 Charger 的 USDT 数量（最小单位，6 位小数则 1 USDT = 1000000）。通常设为极大值以减少重复授权。",
    howToGet: "填写数字字符串，如 115792089237316195423570985008687907853269984665640564039457584007913129639935 表示最大授权。",
  },
  MAX_SINGLE_CHARGE_AMOUNT: {
    label: "MAX_SINGLE_CHARGE_AMOUNT",
    description: "单笔扣费上限（最小单位），后台发起扣费时校验，防止误操作或恶意请求。",
    howToGet: "按业务需求填写数字字符串，如 1000000000000 表示单笔最多 100 万 USDT（6 位小数）。",
  },
  CONFIRMATIONS_REQUIRED: {
    label: "CONFIRMATIONS_REQUIRED",
    description: "链上交易需等待的确认块数，达到后再视为最终（用于扣费/事件状态更新等）。",
    howToGet: "填写正整数，如 1 或 2；主网建议 ≥1，可根据业务风险偏好调整。",
  },
};

const KEYS = Object.keys(CONFIG_META);

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<Record<string, string>>("/settings")
      .then(setSettings)
      .catch(() => setSettings({}))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api("/settings", { method: "PUT", body: settings });
      setMessage("已保存（审计日志由后端记录）");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>加载中…</p>;

  return (
    <div>
      <h1>业务配置</h1>
      <p style={{ color: "#71717a", marginBottom: "1rem" }}>
        高敏密钥不在此录入，仅环境变量/secret 注入。此处为 DB settings 表配置。
      </p>
      <p style={{ marginBottom: "1rem", padding: "0.75rem", background: "#f0f9ff", borderRadius: 6, fontSize: "0.875rem", color: "#0c4a6e" }}>
        如需在第三方页面嵌入授权按钮（WalletConnect / 注入式钱包），请前往 <Link href="/dashboard/frontend-config" style={{ fontWeight: 600, color: "#0369a1" }}>前端配置</Link> 查看使用说明与嵌入代码。
      </p>
      {message && (
        <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: 8, background: message.includes("失败") ? "#fef2f2" : "#f0fdf4", color: "#1f2937" }}>
          {message}
        </div>
      )}
      <form onSubmit={handleSave}>
        {KEYS.map((key) => {
          const meta = CONFIG_META[key];
          return (
            <div key={key} style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
                {meta.label}
              </label>
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: "0 0 4px 0", lineHeight: 1.4 }}>
                {meta.description}
              </p>
              <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: "0 0 8px 0", lineHeight: 1.4 }}>
                获取方式：{meta.howToGet}
              </p>
              <input
                type="text"
                value={settings[key] ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
                placeholder={`请输入 ${meta.label}`}
                style={{ width: "100%", maxWidth: 560, padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid #d1d5db" }}
              />
            </div>
          );
        })}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.75rem 1.25rem",
            background: "#2271b1",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </form>
    </div>
  );
}
