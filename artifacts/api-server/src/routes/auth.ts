import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  accountsTable,
  usersTable,
  sessionsTable,
  type SafeUser,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";

const router = Router();

const SESSION_COOKIE = "immo_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sessionOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  };
}

function toSafeUser(user: typeof usersTable.$inferSelect): SafeUser {
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, accountName } = req.body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    accountName?: string;
  };

  if (!email || !password || !accountName) {
    res.status(400).json({ error: "email, password and accountName are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [account] = await db
    .insert(accountsTable)
    .values({ name: accountName.trim() })
    .returning();

  const [user] = await db
    .insert(usersTable)
    .values({
      accountId: account.id,
      email: normalizedEmail,
      passwordHash,
      firstName: firstName?.trim() ?? "",
      lastName: lastName?.trim() ?? "",
      role: "owner",
    })
    .returning();

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const [session] = await db
    .insert(sessionsTable)
    .values({ userId: user.id, expiresAt })
    .returning();

  res.cookie(SESSION_COOKIE, session.id, sessionOptions());
  res.status(201).json({ user: toSafeUser(user), account });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  const user = users[0];
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const [session] = await db
    .insert(sessionsTable)
    .values({ userId: user.id, expiresAt })
    .returning();

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, user.accountId))
    .limit(1);

  res.cookie(SESSION_COOKIE, session.id, sessionOptions());
  res.json({ user: toSafeUser(user), account: accounts[0] ?? null });
});

router.post("/logout", async (req: Request, res: Response) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/me", async (req: Request, res: Response) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);

  const session = sessions[0];
  if (!session || session.expiresAt < new Date()) {
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  const user = users[0];
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, user.accountId))
    .limit(1);

  res.json({ user: toSafeUser(user), account: accounts[0] ?? null });
});

// ── Account info (requires auth) ─────────────────────────────────────────────
router.get("/account", requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({ account: req.account ?? null });
});

// ── List account members (owner or administrator only) ────────────────────────
router.get(
  "/users",
  requireAuth,
  requireRole("owner", "administrator"),
  async (req: AuthRequest, res: Response) => {
    const members = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.accountId, req.user!.accountId));

    const safe: SafeUser[] = members.map(({ passwordHash: _pw, ...u }) => u);
    res.json({ users: safe });
  }
);

// ── Invite a new member to the account (owner or administrator only) ──────────
router.post(
  "/users/invite",
  requireAuth,
  requireRole("owner", "administrator"),
  async (req: AuthRequest, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const validRoles = ["owner", "administrator", "property_manager"];
    const assignedRole = validRoles.includes(role ?? "") ? role as "owner" | "administrator" | "property_manager" : "property_manager";

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.trim().toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({
        accountId: req.user!.accountId,
        email: email.trim().toLowerCase(),
        passwordHash,
        firstName: firstName?.trim() ?? "",
        lastName: lastName?.trim() ?? "",
        role: assignedRole,
      })
      .returning();

    const { passwordHash: _pw, ...safeUser } = user;
    res.status(201).json({ user: safeUser });
  }
);

// ── Remove an account member (owner only) ─────────────────────────────────────
router.delete(
  "/users/:userId",
  requireAuth,
  requireRole("owner"),
  async (req: AuthRequest, res: Response) => {
    const userId = req.params.userId as string;

    if (userId === req.user!.id) {
      res.status(400).json({ error: "Cannot remove yourself" });
      return;
    }

    const rows = await db
      .select({ id: usersTable.id, accountId: usersTable.accountId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!rows[0] || rows[0].accountId !== req.user!.accountId) {
      res.status(404).json({ error: "User not found in your account" });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ ok: true });
  }
);

export default router;
