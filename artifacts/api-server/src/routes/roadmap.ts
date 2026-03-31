import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { roadmapItemsTable } from "@workspace/db";
import { eq, desc, asc, count, ne, and } from "drizzle-orm";
import { requireAuth, requireSuperAdmin, type AuthRequest } from "../middleware/auth";

const router = Router();

// ── GET /api/roadmap — public, returns published non-pending/non-rejected items ─
router.get("/", async (_req: Request, res: Response) => {
  try {
    const items = await db
      .select()
      .from(roadmapItemsTable)
      .where(
        and(
          eq(roadmapItemsTable.isPublished, true),
          ne(roadmapItemsTable.status, "pending"),
          ne(roadmapItemsTable.status, "rejected"),
        )
      )
      .orderBy(asc(roadmapItemsTable.sortOrder), desc(roadmapItemsTable.createdAt));
    res.json({ items });
  } catch {
    res.status(500).json({ error: "Failed to load roadmap" });
  }
});

// ── POST /api/roadmap/request — public feature request submission ──────────────
router.post("/request", async (req: Request, res: Response) => {
  const { name, email, title, description } = req.body as {
    name?: string;
    email?: string;
    title?: string;
    description?: string;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email?.trim() && !emailRe.test(email.trim())) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  try {
    const [item] = await db
      .insert(roadmapItemsTable)
      .values({
        title: title.trim(),
        description: description?.trim() ?? "",
        status: "pending",
        source: "feature_request",
        isPublished: false,
        requesterName: name?.trim() || null,
        requesterEmail: email?.trim().toLowerCase() || null,
      })
      .returning();
    res.json({ ok: true, id: item.id });
  } catch {
    res.status(500).json({ error: "Failed to submit feature request" });
  }
});

// ── Superadmin routes ─────────────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(requireAuth, requireSuperAdmin);

// GET /api/superadmin/roadmap
adminRouter.get("/", async (req: AuthRequest, res: Response) => {
  const status = (req.query.status as string | undefined)?.trim() ?? "";
  const source = (req.query.source as string | undefined)?.trim() ?? "";
  const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
  const limit = 30;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const validStatuses = ["pending", "planned", "in_progress", "done", "rejected"] as const;
    const validSources = ["manual", "feature_request"] as const;

    if (validStatuses.includes(status as typeof validStatuses[number])) {
      conditions.push(eq(roadmapItemsTable.status, status as typeof validStatuses[number]));
    }
    if (validSources.includes(source as typeof validSources[number])) {
      conditions.push(eq(roadmapItemsTable.source, source as typeof validSources[number]));
    }

    const [items, totalRows] = await Promise.all([
      conditions.length
        ? db.select().from(roadmapItemsTable).where(and(...conditions)).orderBy(asc(roadmapItemsTable.sortOrder), desc(roadmapItemsTable.createdAt)).limit(limit).offset(offset)
        : db.select().from(roadmapItemsTable).orderBy(asc(roadmapItemsTable.sortOrder), desc(roadmapItemsTable.createdAt)).limit(limit).offset(offset),
      db.select({ cnt: count() }).from(roadmapItemsTable),
    ]);

    res.json({ items, total: totalRows[0]?.cnt ?? 0, page, limit });
  } catch {
    res.status(500).json({ error: "Failed to load roadmap items" });
  }
});

// POST /api/superadmin/roadmap — manual creation
adminRouter.post("/", async (req: AuthRequest, res: Response) => {
  const { title, description, status, isPublished, category, sortOrder } = req.body as {
    title?: string;
    description?: string;
    status?: string;
    isPublished?: boolean;
    category?: string;
    sortOrder?: number;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const validStatuses = ["pending", "planned", "in_progress", "done", "rejected"];
  const safeStatus = validStatuses.includes(status ?? "") ? (status as typeof roadmapItemsTable.$inferInsert["status"]) : "planned";

  try {
    const [item] = await db
      .insert(roadmapItemsTable)
      .values({
        title: title.trim(),
        description: description?.trim() ?? "",
        status: safeStatus,
        source: "manual",
        isPublished: isPublished ?? false,
        category: category?.trim() || null,
        sortOrder: sortOrder ?? 0,
      })
      .returning();
    res.json({ item });
  } catch {
    res.status(500).json({ error: "Failed to create roadmap item" });
  }
});

// PATCH /api/superadmin/roadmap/:id
adminRouter.patch("/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const { title, description, status, isPublished, category, sortOrder } = req.body as {
    title?: string;
    description?: string;
    status?: string;
    isPublished?: boolean;
    category?: string;
    sortOrder?: number;
  };

  const validStatuses = ["pending", "planned", "in_progress", "done", "rejected"];
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (status !== undefined) updates.status = status;
    if (isPublished !== undefined) updates.isPublished = isPublished;
    if (category !== undefined) updates.category = category?.trim() || null;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [item] = await db
      .update(roadmapItemsTable)
      .set(updates)
      .where(eq(roadmapItemsTable.id, id))
      .returning();

    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    res.json({ item });
  } catch {
    res.status(500).json({ error: "Failed to update roadmap item" });
  }
});

// DELETE /api/superadmin/roadmap/:id
adminRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await db.delete(roadmapItemsTable).where(eq(roadmapItemsTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete roadmap item" });
  }
});

export { router as roadmapPublicRouter, adminRouter as roadmapAdminRouter };
