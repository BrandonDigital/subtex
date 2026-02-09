"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { announcements, type NewAnnouncement } from "../schemas/announcements";
import { eq, and, or, lte, gte, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Auth helper
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// ============ PUBLIC ============

/**
 * Get active announcements that should be displayed to users
 * - Must be active
 * - Start date must be null or in the past
 * - End date must be null or in the future
 */
export async function getActiveAnnouncements() {
  const now = new Date();

  const activeAnnouncements = await db.query.announcements.findMany({
    where: and(
      eq(announcements.active, true),
      or(isNull(announcements.startDate), lte(announcements.startDate, now)),
      or(isNull(announcements.endDate), gte(announcements.endDate, now))
    ),
    orderBy: (announcements, { desc }) => [desc(announcements.createdAt)],
  });

  return activeAnnouncements;
}

// ============ ADMIN ============

/**
 * Get all announcements for the dashboard
 */
export async function getAnnouncements() {
  await requireAdmin();

  return db.query.announcements.findMany({
    orderBy: (announcements, { desc }) => [desc(announcements.createdAt)],
  });
}

/**
 * Get a single announcement by ID
 */
export async function getAnnouncementById(id: string) {
  await requireAdmin();

  return db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  });
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  data: Omit<NewAnnouncement, "id" | "createdAt" | "updatedAt">
) {
  await requireAdmin();

  const [announcement] = await db
    .insert(announcements)
    .values(data)
    .returning();
  revalidatePath("/dashboard/announcements");
  revalidatePath("/"); // Revalidate to show new banner
  return announcement;
}

/**
 * Update an existing announcement
 */
export async function updateAnnouncement(
  id: string,
  data: Partial<Omit<NewAnnouncement, "id" | "createdAt">>
) {
  await requireAdmin();

  const [announcement] = await db
    .update(announcements)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();

  revalidatePath("/dashboard/announcements");
  revalidatePath("/"); // Revalidate to update banner
  return announcement;
}

/**
 * Toggle announcement active status
 */
export async function toggleAnnouncementActive(id: string) {
  await requireAdmin();

  const existing = await db.query.announcements.findFirst({
    where: eq(announcements.id, id),
  });

  if (!existing) {
    throw new Error("Announcement not found");
  }

  const [announcement] = await db
    .update(announcements)
    .set({ active: !existing.active, updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();

  revalidatePath("/dashboard/announcements");
  revalidatePath("/");
  return announcement;
}

/**
 * Delete an announcement (soft delete by setting active to false)
 */
export async function deleteAnnouncement(id: string) {
  await requireAdmin();

  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/dashboard/announcements");
  revalidatePath("/");
}
