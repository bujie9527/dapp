import { Router } from "express";
import { prisma } from "@dapp/db";
import { requireAdmin } from "../middleware/adminAuth.js";

export const usersRouter: import("express").Router = Router();

// GET /users — 用户列表，仅 admin
usersRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, address: true, createdAt: true },
    });
    res.json({ items: users });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list users";
    console.error("[GET /users]", e);
    res.status(500).json({ error: msg });
  }
});
