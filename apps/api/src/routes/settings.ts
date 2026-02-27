import { Router } from "express";
import { prisma } from "@dapp/db";
import { adminAuth } from "../middleware/adminAuth.js";

export const settingsRouter: import("express").Router = Router();

// GET /settings — 获取所有配置（admin 或公开只读 keys）
settingsRouter.get("/", async (req, res) => {
  try {
    const isAdmin = adminAuth(req);
    const list = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    const map: Record<string, string> = {};
    for (const s of list) {
      map[s.key] = s.value;
    }
    res.json(map);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load settings";
    console.error("[GET /settings]", e);
    res.status(500).json({ error: msg });
  }
});

// PUT /settings — 更新配置（仅 admin），写审计
settingsRouter.put("/", async (req, res) => {
  if (!adminAuth(req)) {
    res.status(401).json({ error: "Admin required" });
    return;
  }
  try {
    const body = req.body as Record<string, string>;
    const updatedBy = (req as unknown as { adminUser?: string }).adminUser ?? "admin";
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "string") continue;
      await prisma.setting.upsert({
        where: { key },
        create: { key, value, updatedBy },
        update: { value, updatedBy },
      });
    }
    const list = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    const map: Record<string, string> = {};
    for (const s of list) {
      map[s.key] = s.value;
    }
    res.json(map);
  } catch (e) {
    console.error("[PUT /settings]", e);
    const msg = e instanceof Error ? e.message : "Failed to update settings";
    res.status(500).json({ error: msg });
  }
});
