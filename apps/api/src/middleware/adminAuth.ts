import type { Request } from "express";

const ALLOW_BASIC_AUTH = process.env.ALLOW_BASIC_AUTH === "true";
const ADMIN_USER = process.env.ADMIN_USER ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";

function getSession(req: Request): Record<string, unknown> {
  return (req.session as unknown) as Record<string, unknown>;
}

export function adminAuth(req: Request): boolean {
  if (getSession(req)?.admin) return true;
  if (!ALLOW_BASIC_AUTH) return false;
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Basic ")) return false;
  const b64 = auth.slice(6);
  const decoded = Buffer.from(b64, "base64").toString("utf8");
  const [user, pass] = decoded.split(":");
  return user === ADMIN_USER && pass === ADMIN_PASSWORD;
}

export function requireAdmin(req: Request, res: import("express").Response, next: import("express").NextFunction) {
  if (!adminAuth(req)) {
    res.status(401).json({ error: "Admin required" });
    return;
  }
  (req as unknown as { adminUser: string }).adminUser =
    (getSession(req)?.adminUser as string) ?? ADMIN_USER;
  next();
}
