import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import { chargeUser, ApiError } from "../services/chargeService.js";
import { prisma } from "@dapp/db";

export const chargeRouter: import("express").Router = Router();

// POST /charge — 创建扣费（admin），ref 可选，缺失则生成 uuid 并返回
chargeRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const body = req.body as { address?: string; amount?: string; ref?: string };
    const { address, amount } = body;
    let ref = typeof body.ref === "string" ? body.ref.trim() : undefined;
    if (!ref) {
      ref = crypto.randomUUID();
      // 前端需要 ref 时可由响应体拿到
    }
    if (!address || amount === undefined || amount === null) {
      res.status(400).json({ error: "address and amount required", errorCode: "VALIDATION_FAILED" });
      return;
    }
    const adminUser = (req as unknown as { adminUser: string }).adminUser;

    const result = await chargeUser({
      address: address as `0x${string}`,
      amount: String(amount),
      ref,
      adminUser,
    });

    res.json({ chargeId: result.chargeId, txHash: result.txHash, ref });
  } catch (e) {
    if (e instanceof ApiError) {
      res.status(e.statusCode).json({
        error: e.message,
        ...(e.errorCode && { errorCode: e.errorCode }),
      });
      return;
    }
    res.status(500).json({
      error: e instanceof Error ? e.message : "Charge failed",
      errorCode: "RPC_ERROR",
    });
  }
});

// GET /charge/status?chargeId=xxx — 保持不变，返回 status 为新枚举
chargeRouter.get("/status", requireAdmin, async (req, res) => {
  try {
    const chargeId = req.query.chargeId as string;
    if (!chargeId) {
      res.status(400).json({ error: "chargeId required" });
      return;
    }
    const charge = await prisma.charge.findUnique({ where: { id: chargeId } });
    if (!charge) {
      res.status(404).json({ error: "Charge not found" });
      return;
    }
    res.json(charge);
  } catch (e) {
    res.status(500).json({ error: "Failed to get charge status" });
  }
});
