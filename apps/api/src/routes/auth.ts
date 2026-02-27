import { Router } from "express";

const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";

const authRouter: import("express").Router = Router();

// POST /auth/login — 校验账号密码，写入 session，返回 200
authRouter.post("/login", (req, res) => {
  const { user, pass } = req.body as { user?: string; pass?: string };
  if (!user || !pass) {
    res.status(400).json({ error: "user and pass required" });
    return;
  }
  if (user !== ADMIN_USER || pass !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const s = (req.session as unknown) as Record<string, unknown>;
  s.admin = true;
  s.adminUser = user;
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session save failed" });
      return;
    }
    res.json({ ok: true });
  });
});

// GET /auth/me — 有 admin session 则 200，否则 401
authRouter.get("/me", (req, res) => {
  if (((req.session as unknown) as Record<string, unknown>)?.admin) {
    res.json({ ok: true });
    return;
  }
  res.status(401).json({ error: "Not authenticated" });
});

// POST /auth/logout
authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

export { authRouter };
