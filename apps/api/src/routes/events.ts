import { Router } from "express";
import { prisma } from "@dapp/db";
import { requireAdmin } from "../middleware/adminAuth.js";
import { requireSiwe, getSessionAddress } from "../middleware/session.js";

export const eventsRouter: import("express").Router = Router();

// POST /events — 客户端上报事件（如 APPROVE 成功/失败），需 SIWE
eventsRouter.post("/", requireSiwe, async (req, res) => {
  try {
    const address = getSessionAddress(req);
    if (!address) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    const { type, status, txHash, errorSummary } = req.body as {
      type?: string;
      status?: string;
      txHash?: string;
      errorSummary?: string;
    };
    if (!type || !status) {
      res.status(400).json({ error: "type and status required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { address } });
    const ev = await prisma.event.create({
      data: {
        type,
        status,
        address,
        txHash: txHash ?? null,
        errorSummary: errorSummary ?? null,
        userId: user?.id ?? null,
      },
    });
    res.json(ev);
  } catch (e) {
    res.status(500).json({ error: "Failed to create event" });
  }
});

// GET /events — 列表，仅 admin
eventsRouter.get("/", requireAdmin, async (req, res) => {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const cursor = req.query.cursor as string | undefined;

    const where: { type?: string; status?: string } = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const list = await prisma.event.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: { user: { select: { address: true } } },
    });

    const hasMore = list.length > limit;
    const items = hasMore ? list.slice(0, limit) : list;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    res.json({ items, nextCursor });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list events";
    res.status(500).json({ error: msg });
  }
});
