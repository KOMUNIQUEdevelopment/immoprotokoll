import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  accountsTable,
  usersTable,
  sessionsTable,
  passwordResetTokensTable,
  type SafeUser,
} from "@workspace/db";
import { eq, and, isNull, lt } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";
import {
  sendWelcomeEmail,
  sendTeamInviteEmail,
  sendPasswordResetEmail,
} from "../lib/email";

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

  // Send welcome email async (don't await — don't block the response)
  sendWelcomeEmail(normalizedEmail, user.firstName, account.name).catch(() => {});
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

  if (session.impersonatedAccountId && user.isSuperAdmin) {
    const impersonatedAccounts = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.id, session.impersonatedAccountId))
      .limit(1);
    const impersonatedAccount = impersonatedAccounts[0];
    if (impersonatedAccount) {
      res.json({
        user: { ...toSafeUser(user), accountId: impersonatedAccount.id },
        account: impersonatedAccount,
        isImpersonating: true,
        impersonatedAccountId: session.impersonatedAccountId,
      });
      return;
    }
  }

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, user.accountId))
    .limit(1);

  res.json({ user: toSafeUser(user), account: accounts[0] ?? null, isImpersonating: false });
});

// ── Update current user's preferred language ──────────────────────────────────
router.patch("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const { preferredLanguage } = req.body as { preferredLanguage?: string };
  const validLangs = ["de-CH", "de-DE", "en"];
  if (!preferredLanguage || !validLangs.includes(preferredLanguage)) {
    res.status(400).json({ error: "preferredLanguage must be one of: de-CH, de-DE, en" });
    return;
  }
  try {
    const [updated] = await db
      .update(usersTable)
      .set({ preferredLanguage, updatedAt: new Date() })
      .where(eq(usersTable.id, req.user!.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const { passwordHash: _pw, ...safe } = updated;
    res.json({ user: safe });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
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

    // Role assignment rules:
    // - Owners can invite with any role (owner, administrator, property_manager)
    // - Administrators can only invite administrator or property_manager — not owner
    //   (preventing privilege escalation to a higher tier)
    const callerRole = req.user!.role;
    const ownerOnly = callerRole === "owner";
    const validRoles: Array<"owner" | "administrator" | "property_manager"> = ownerOnly
      ? ["owner", "administrator", "property_manager"]
      : ["administrator", "property_manager"];

    if (role && !validRoles.includes(role as "owner" | "administrator" | "property_manager")) {
      res.status(403).json({ error: "You are not allowed to assign that role" });
      return;
    }

    const assignedRole: "owner" | "administrator" | "property_manager" =
      validRoles.includes(role as "owner" | "administrator" | "property_manager")
        ? (role as "owner" | "administrator" | "property_manager")
        : "property_manager";

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

    // Send team-invite email async (include temp password in plaintext once — they should change it)
    const inviterName = [req.user!.firstName, req.user!.lastName].filter(Boolean).join(" ") || req.user!.email;
    sendTeamInviteEmail(
      email.trim().toLowerCase(),
      firstName?.trim() ?? "",
      req.account?.name ?? "",
      inviterName,
      password,
    ).catch(() => {});
  }
);

// ── Forgot password — request a reset link ────────────────────────────────────
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Always respond with success to prevent user enumeration
  res.json({ ok: true });

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (users.length === 0) return; // Silently skip — don't reveal existence

    const user = users[0];

    // Expire any existing unused tokens for this user
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokensTable.userId, user.id),
          isNull(passwordResetTokensTable.usedAt),
        )
      );

    // Generate a secure random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      email: normalizedEmail,
      token,
      expiresAt,
    });

    const APP_APP_URL = process.env.APP_APP_URL ?? "https://app.immoprotokoll.com";
    const resetUrl = `${APP_APP_URL}/#/reset-password/${token}`;

    await sendPasswordResetEmail(normalizedEmail, user.firstName, resetUrl);
  } catch (err) {
    // Log but don't surface errors — response already sent
    console.error("forgot-password error:", err);
  }
});

// ── Reset password — consume token and set new password ───────────────────────
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };

  if (!token || !newPassword) {
    res.status(400).json({ error: "token and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const rows = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        isNull(passwordResetTokensTable.usedAt),
      )
    )
    .limit(1);

  const resetToken = rows[0];

  if (!resetToken) {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }

  if (resetToken.expiresAt < new Date()) {
    res.status(400).json({ error: "Reset link has expired — please request a new one" });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(usersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, resetToken.userId));

    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, resetToken.id));

    // Invalidate all active sessions for this user after password reset
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, resetToken.userId));

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

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
