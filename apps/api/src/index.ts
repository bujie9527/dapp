import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import { siweRouter } from "./routes/siwe.js";
import { settingsRouter } from "./routes/settings.js";
import { eventsRouter } from "./routes/events.js";
import { chargeRouter } from "./routes/charge.js";
import { usersRouter } from "./routes/users.js";
import { authRouter } from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const sessionSecret = process.env.SESSION_SECRET ?? "dev-secret-change-in-prod";
// 本地/内网 HTTP 时不要 Secure，否则浏览器不会带 Cookie
const cookieSecure = process.env.COOKIE_SECURE === "true";
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: cookieSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

app.use("/auth", authRouter);
app.use("/siwe", siweRouter);
app.use("/settings", settingsRouter);
app.use("/events", eventsRouter);
app.use("/charge", chargeRouter);
app.use("/users", usersRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
