// 事件类型与状态
export const EVENT_TYPES = ["SIWE", "APPROVE", "CHARGE"] as const;
export const EVENT_STATUSES = ["SUCCESS", "REJECTED", "FAILED"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

// 扣费状态
export const CHARGE_STATUSES = ["PENDING", "SUCCESS", "FAILED"] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

// 默认配置 key（与 DB settings 表一致）
export const SETTING_KEYS = [
  "PUBLIC_BASE_URL",
  "BASE_RPC_URL",
  "USDT_ADDRESS",
  "CHARGER_CONTRACT_ADDRESS",
  "DEFAULT_APPROVE_AMOUNT",
  "MAX_SINGLE_CHARGE_AMOUNT",
  "CONFIRMATIONS_REQUIRED",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
