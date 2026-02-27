import { prisma } from "@dapp/db";

const TTL_MS = 30_000; // 30s
const cache = new Map<string, { value: string | null; expiresAt: number }>();

async function fetchSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/**
 * 获取配置项，为空则返回 null。带内存缓存，TTL 30s。
 */
export async function getSetting(key: string): Promise<string | null> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) return entry.value;
  const value = await fetchSetting(key);
  cache.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

/**
 * 获取必填配置项，为空则 throw Error。
 */
export async function getRequiredSetting(key: string): Promise<string> {
  const value = await getSetting(key);
  const trimmed = value?.trim() ?? "";
  if (!trimmed) throw new Error(`Setting "${key}" is required`);
  return trimmed;
}
