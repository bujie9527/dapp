import type { Request, Response, NextFunction } from "express";

export interface SessionData {
  address?: string;
  siweVerified?: boolean;
}

export function requireSiwe(req: Request, res: Response, next: NextFunction) {
  const s = req.session as SessionData & { cookie: unknown };
  if (!s?.address || !s?.siweVerified) {
    res.status(401).json({ error: "SIWE required" });
    return;
  }
  next();
}

export function getSessionAddress(req: Request): string | undefined {
  const s = req.session as SessionData & { cookie: unknown };
  return s?.address;
}
