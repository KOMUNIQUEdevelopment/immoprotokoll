import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sessionsTable, usersTable, accountsTable, type SafeUser, type Account } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "immo_session";

export interface AuthRequest extends Request {
  user?: SafeUser;
  account?: Account;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
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

  const { passwordHash: _pw, ...safeUser } = user;
  req.user = safeUser;
  req.account = accounts[0];
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (req.user.isSuperAdmin) {
      next();
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Superadmin access required" });
    return;
  }
  next();
}
