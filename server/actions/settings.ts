"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { settings, settingsHistory, SETTING_KEYS } from "../schemas/settings";
import { notifications, type NewNotification } from "../schemas/notifications";
import { users } from "../schemas/users";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id: string; email: string; role?: string }
    | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

export async function getSetting(key: string): Promise<string | null> {
  const result = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });
  return result?.value ?? null;
}

export async function getSettingNumber(
  key: string,
  defaultValue: number = 0
): Promise<number> {
  const value = await getSetting(key);
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export async function updateSetting(key: string, value: string) {
  const admin = await requireAdmin();

  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });
  const oldValue = existing?.value ?? null;

  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });

  await db.insert(settingsHistory).values({
    key,
    oldValue,
    newValue: value,
    changedBy: admin.id,
    changedAt: new Date(),
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/checkout");
}

export async function getSettingHistory(key: string) {
  const rows = await db
    .select({
      id: settingsHistory.id,
      oldValue: settingsHistory.oldValue,
      newValue: settingsHistory.newValue,
      changedAt: settingsHistory.changedAt,
      changedByName: users.name,
      changedByEmail: users.email,
    })
    .from(settingsHistory)
    .leftJoin(users, eq(settingsHistory.changedBy, users.id))
    .where(eq(settingsHistory.key, key))
    .orderBy(desc(settingsHistory.changedAt))
    .limit(50);

  return rows;
}

export async function getCuttingFeePerSheet(): Promise<number> {
  return getSettingNumber(SETTING_KEYS.CUTTING_FEE_PER_SHEET_IN_CENTS, 2500);
}

export async function updateCuttingFeePerSheet(feeInCents: number) {
  const oldFee = await getCuttingFeePerSheet();

  await updateSetting(
    SETTING_KEYS.CUTTING_FEE_PER_SHEET_IN_CENTS,
    feeInCents.toString()
  );

  if (oldFee !== feeInCents) {
    const formatPrice = (cents: number) =>
      new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
      }).format(cents / 100);

    const direction = feeInCents > oldFee ? "increased" : "decreased";
    const title = "Cutting Service Fee Updated";
    const message =
      feeInCents === 0
        ? `The cutting service fee has been removed (was ${formatPrice(oldFee)} per sheet).`
        : `The cutting service fee has ${direction} from ${formatPrice(oldFee)} to ${formatPrice(feeInCents)} per sheet.`;

    await notifyAllUsersOfPriceChange(title, message, "/products");
  }
}

export async function notifyAllUsersOfPriceChange(
  title: string,
  message: string,
  link?: string
) {
  try {
    const allUsers = await db.query.users.findMany({
      columns: { id: true },
    });

    if (allUsers.length === 0) return;

    const notificationsToInsert: NewNotification[] = allUsers.map((user) => ({
      userId: user.id,
      type: "system" as const,
      title,
      message,
      link: link || null,
      read: false,
      emailSent: false,
    }));

    await db.insert(notifications).values(notificationsToInsert);
  } catch (error) {
    console.error("Failed to send price change notifications:", error);
  }
}
