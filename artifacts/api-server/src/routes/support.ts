import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  supportTicketsTable,
  supportAgentsTable,
  supportTicketStatusEnum,
} from "@workspace/db";
import { eq, desc, count, ilike, or } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, type AuthRequest } from "../middleware/auth";
import { sendSupportTicketEmail, sendSupportTicketAssignedEmail } from "../lib/email";

const router = Router();

// ── POST /api/support — public ticket submission ────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { name, email, subject, message, accountId } = req.body as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    accountId?: string;
  };

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email.trim())) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  try {
    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        accountId: accountId ?? null,
      })
      .returning();

    await sendSupportTicketEmail({
      ticketId: ticket.id,
      name: ticket.name,
      email: ticket.email,
      subject: ticket.subject,
      message: ticket.message,
      accountId: ticket.accountId ?? undefined,
    });

    res.json({ ok: true, ticketId: ticket.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to create support ticket" });
  }
});

// ── Everything below requires superadmin ─────────────────────────────────────
const adminRouter = Router();
adminRouter.use(requireAuth, requireSuperAdmin);

// GET /api/superadmin/support/tickets
adminRouter.get("/tickets", async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim() ?? "";
  const status = (req.query.status as string | undefined)?.trim() ?? "";
  const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
  const limit = 25;
  const offset = (page - 1) * limit;

  try {
    const validStatuses = ["open", "in_progress", "closed"] as const;
    const statusFilter = validStatuses.includes(status as typeof validStatuses[number])
      ? (status as typeof validStatuses[number])
      : null;

    let query = db.select().from(supportTicketsTable).$dynamic();

    if (statusFilter) {
      query = query.where(eq(supportTicketsTable.status, statusFilter));
    } else if (search) {
      query = query.where(
        or(
          ilike(supportTicketsTable.name, `%${search}%`),
          ilike(supportTicketsTable.email, `%${search}%`),
          ilike(supportTicketsTable.subject, `%${search}%`),
        )
      );
    }

    const [tickets, totalRows] = await Promise.all([
      query.orderBy(desc(supportTicketsTable.createdAt)).limit(limit).offset(offset),
      db.select({ cnt: count() }).from(supportTicketsTable),
    ]);

    res.json({ tickets, total: totalRows[0]?.cnt ?? 0, page, limit });
  } catch {
    res.status(500).json({ error: "Failed to load tickets" });
  }
});

// PATCH /api/superadmin/support/tickets/:id
adminRouter.patch("/tickets/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const { status, assignedToAgentId } = req.body as {
    status?: string;
    assignedToAgentId?: string | null;
  };

  const validStatuses = ["open", "in_progress", "closed"];
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (assignedToAgentId !== undefined) updates.assignedToAgentId = assignedToAgentId;

    const [ticket] = await db
      .update(supportTicketsTable)
      .set(updates)
      .where(eq(supportTicketsTable.id, id))
      .returning();

    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    if (assignedToAgentId) {
      const agents = await db
        .select()
        .from(supportAgentsTable)
        .where(eq(supportAgentsTable.id, assignedToAgentId))
        .limit(1);
      const agent = agents[0];
      if (agent) {
        await sendSupportTicketAssignedEmail({
          agentName: agent.name,
          agentEmail: agent.email,
          ticketId: ticket.id,
          senderName: ticket.name,
          senderEmail: ticket.email,
          subject: ticket.subject,
          message: ticket.message,
        });
      }
    }

    res.json({ ticket });
  } catch {
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// GET /api/superadmin/support/agents
adminRouter.get("/agents", async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await db
      .select()
      .from(supportAgentsTable)
      .orderBy(supportAgentsTable.createdAt);
    res.json({ agents });
  } catch {
    res.status(500).json({ error: "Failed to load agents" });
  }
});

// POST /api/superadmin/support/agents
adminRouter.post("/agents", async (req: AuthRequest, res: Response) => {
  const { name, email } = req.body as { name?: string; email?: string };
  if (!name?.trim() || !email?.trim()) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }
  try {
    const [agent] = await db
      .insert(supportAgentsTable)
      .values({ name: name.trim(), email: email.trim().toLowerCase() })
      .returning();
    res.json({ agent });
  } catch {
    res.status(500).json({ error: "Failed to create agent (email may already exist)" });
  }
});

// DELETE /api/superadmin/support/agents/:id
adminRouter.delete("/agents/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await db.delete(supportAgentsTable).where(eq(supportAgentsTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete agent" });
  }
});

export { router as supportPublicRouter, adminRouter as supportAdminRouter };
