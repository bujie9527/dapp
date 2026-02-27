import { Router } from "express";
import { randomBytes } from "crypto";
import { prisma } from "@dapp/db";
import { createSiweMessage, verifySiweMessage } from "@dapp/core";
import type { SessionData } from "../middleware/session.js";

export const siweRouter: import("express").Router = Router();

// GET /siwe/nonce — 获取 SIWE nonce
siweRouter.get("/nonce", async (_req, res) => {
  try {
    const nonce = randomBytes(16).toString("hex");
    res.json({ nonce });
  } catch (e) {
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

// POST /siwe/verify — 验证签名并建立 session
siweRouter.post("/verify", async (req, res) => {
  try {
    const { message, signature } = req.body as { message?: string; signature?: string };
    if (!message || !signature) {
      res.status(400).json({ error: "message and signature required" });
      return;
    }
    const verified = await verifySiweMessage({ message, signature });
    const address = verified.address.toLowerCase();

    (req.session as SessionData & { cookie: unknown }).address = address;
    (req.session as SessionData & { cookie: unknown }).siweVerified = true;

    let user = await prisma.user.findUnique({ where: { address } });
    if (!user) {
      user = await prisma.user.create({ data: { address } });
    }

    await prisma.event.create({
      data: {
        type: "SIWE",
        status: "SUCCESS",
        address,
        userId: user.id,
      },
    });

    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: "Session save failed" });
        return;
      }
      res.json({ ok: true, address });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verify failed";
    res.status(401).json({ error: msg });
  }
});

// GET /siwe/me — 当前 session 地址
siweRouter.get("/me", (req, res) => {
  const s = req.session as SessionData & { cookie: unknown };
  if (!s?.address) {
    res.status(401).json({ address: null });
    return;
  }
  res.json({ address: s.address, siweVerified: s.siweVerified });
});

// POST /siwe/logout
siweRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});
