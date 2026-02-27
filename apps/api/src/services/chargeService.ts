import { createPublicClient, createWalletClient, http, parseAbi, keccak256, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { prisma } from "@dapp/db";
import { getSetting, getRequiredSetting } from "./settingsService.js";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode?: string,
    message?: string
  ) {
    super(message ?? "Request failed");
    this.name = "ApiError";
  }
}

const USDT_ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
]);

const CHARGER_ABI = parseAbi([
  "function charge(address from, uint256 amount, bytes32 ref) external",
]);

const CHAIN_ID = 8453;

async function getRpcUrl(): Promise<string> {
  const fromDb = await getSetting("BASE_RPC_URL");
  const trimmed = fromDb?.trim();
  return trimmed || process.env.BASE_RPC_URL || "https://mainnet.base.org";
}

export async function chargeUser(params: {
  address: `0x${string}`;
  amount: string;
  ref: string;
  adminUser: string;
}): Promise<{ chargeId: string; txHash: `0x${string}` }> {
  const { address, amount, ref, adminUser } = params;

  // 1) 读取 settings（RPC 可选，其余必填）
  const rpcUrl = await getRpcUrl();
  const chargerAddress = (await getRequiredSetting("CHARGER_CONTRACT_ADDRESS")).toLowerCase() as `0x${string}`;
  const usdtAddress = (await getRequiredSetting("USDT_ADDRESS")).toLowerCase() as `0x${string}`;
  const maxAmount = await getRequiredSetting("MAX_SINGLE_CHARGE_AMOUNT");
  await getSetting("CONFIRMATIONS_REQUIRED"); // 可选，默认 "2" Step3 再用，这里只读一次避免漏 key

  // 2) 输入校验
  const addrStr = address as string;
  if (!addrStr.startsWith("0x") || addrStr.length !== 42) {
    throw new ApiError(400, "VALIDATION_FAILED", "address must be 0x-prefixed 42 chars");
  }
  let amountBigInt: bigint;
  try {
    amountBigInt = BigInt(amount);
  } catch {
    throw new ApiError(400, "VALIDATION_FAILED", "amount must be a valid integer string");
  }
  if (amountBigInt <= 0n) {
    throw new ApiError(400, "VALIDATION_FAILED", "amount must be > 0");
  }
  if (amountBigInt > BigInt(maxAmount)) {
    throw new ApiError(400, "VALIDATION_FAILED", "amount exceeds MAX_SINGLE_CHARGE_AMOUNT");
  }
  if (!ref || ref.length > 128) {
    throw new ApiError(400, "VALIDATION_FAILED", "ref required and length <= 128");
  }

  // 3) 幂等：已存在且有 txHash 则直接返回
  const existing = await prisma.charge.findUnique({ where: { ref } });
  if (existing?.txHash) {
    return { chargeId: existing.id, txHash: existing.txHash as `0x${string}` };
  }

  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: base, transport });

  // 4) 链上前置校验：allowance 与 balance
  const allowance = await publicClient.readContract({
    address: usdtAddress,
    abi: USDT_ABI,
    functionName: "allowance",
    args: [address, chargerAddress],
  });
  if (allowance < amountBigInt) {
    throw new ApiError(409, "VALIDATION_FAILED", "allowance/balance insufficient");
  }
  const balance = await publicClient.readContract({
    address: usdtAddress,
    abi: USDT_ABI,
    functionName: "balanceOf",
    args: [address],
  });
  if (balance < amountBigInt) {
    throw new ApiError(409, "VALIDATION_FAILED", "allowance/balance insufficient");
  }

  // 5) 创建/更新 Charge（upsert by ref）
  const charge = await prisma.charge.upsert({
    where: { ref },
    create: {
      ref,
      address: address.toLowerCase(),
      amount,
      chainId: CHAIN_ID,
      tokenAddress: usdtAddress,
      status: "SUBMITTED",
      requestedBy: adminUser,
    },
    update: {
      address: address.toLowerCase(),
      amount,
      chainId: CHAIN_ID,
      tokenAddress: usdtAddress,
      status: "SUBMITTED",
      requestedBy: adminUser,
    },
  });

  // 6) 发链上交易
  const pk = process.env.CHARGER_PRIVATE_KEY;
  if (!pk) {
    throw new ApiError(500, "RPC_ERROR", "CHARGER_PRIVATE_KEY not configured");
  }
  const account = privateKeyToAccount(pk as `0x${string}`);
  const wallet = createWalletClient({ account, chain: base, transport });
  const refBytes32 = keccak256(stringToHex(ref)) as `0x${string}`;

  let txHash: `0x${string}`;
  try {
    txHash = await wallet.writeContract({
      address: chargerAddress,
      abi: CHARGER_ABI,
      functionName: "charge",
      args: [address, amountBigInt, refBytes32],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "RPC failed";
    throw new ApiError(500, "RPC_ERROR", msg);
  }

  // 7) 更新 Charge：txHash、status 保持 SUBMITTED
  await prisma.charge.update({
    where: { id: charge.id },
    data: { txHash, status: "SUBMITTED" },
  });

  // 8) 写 Event：status=SUBMITTED 表示仅提交交易，与链上确认后的 SUCCESS 区分
  await prisma.event.create({
    data: {
      type: "CHARGE",
      status: "SUBMITTED",
      actor: "ADMIN",
      address: address.toLowerCase(),
      txHash,
      chargeId: charge.id,
      metadata: { action: "CHARGE_SUBMITTED", txHash, amount, ref, chargeId: charge.id },
    },
  });

  return { chargeId: charge.id, txHash };
}
