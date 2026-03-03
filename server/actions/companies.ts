"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { companies } from "../schemas/companies";
import { users } from "../schemas/users";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  url: z.string().max(500).optional().nullable(),
});

const updateCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  url: z.string().max(500).optional().nullable(),
});

export type CompanyWithMemberCount = {
  id: string;
  name: string;
  url: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
};

export async function getCompanies(): Promise<CompanyWithMemberCount[]> {
  await requireAdmin();

  const result = await db
    .select({
      id: companies.id,
      name: companies.name,
      url: companies.url,
      createdBy: companies.createdBy,
      createdAt: companies.createdAt,
      updatedAt: companies.updatedAt,
      memberCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM "users"
        WHERE "users"."company_id" = "companies"."id"
      )`.as("member_count"),
    })
    .from(companies)
    .orderBy(desc(companies.createdAt));

  return result;
}

export async function getCompanyById(companyId: string) {
  await requireAdmin();

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });

  return company ?? null;
}

export async function getCompanyStats() {
  await requireAdmin();

  const allCompanies = await db.select().from(companies);
  const usersWithCompany = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.companyId} IS NOT NULL`);

  return {
    totalCompanies: allCompanies.length,
    usersWithCompany: usersWithCompany.length,
  };
}

export async function adminCreateCompany(data: {
  name: string;
  url?: string | null;
}) {
  const admin = await requireAdmin();

  const parsed = createCompanySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  }

  const [newCompany] = await db
    .insert(companies)
    .values({
      name: parsed.data.name,
      url: parsed.data.url || null,
      createdBy: admin.id,
    })
    .returning();

  revalidatePath("/dashboard/companies");
  return newCompany;
}

export async function adminUpdateCompany(
  companyId: string,
  data: { name: string; url?: string | null }
) {
  await requireAdmin();

  const parsed = updateCompanySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  }

  const [updatedCompany] = await db
    .update(companies)
    .set({
      name: parsed.data.name,
      url: parsed.data.url || null,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId))
    .returning();

  revalidatePath("/dashboard/companies");
  return updatedCompany;
}

export async function adminDeleteCompany(companyId: string) {
  await requireAdmin();

  // Unlink all users from this company first
  await db
    .update(users)
    .set({ companyId: null, updatedAt: new Date() })
    .where(eq(users.companyId, companyId));

  await db.delete(companies).where(eq(companies.id, companyId));

  revalidatePath("/dashboard/companies");
  return { success: true };
}

// Used during sign-up and checkout for users to create/join a company
export async function createOrJoinCompany(data: {
  name: string;
  url?: string | null;
}) {
  const user = await requireAuth();

  const parsed = createCompanySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid input");
  }

  const [newCompany] = await db
    .insert(companies)
    .values({
      name: parsed.data.name,
      url: parsed.data.url || null,
      createdBy: user.id,
    })
    .returning();

  // Link the user to this company
  await db
    .update(users)
    .set({ companyId: newCompany.id, company: parsed.data.name, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return newCompany;
}

export async function getUserCompany() {
  const user = await requireAuth();

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { companyId: true },
  });

  if (!dbUser?.companyId) return null;

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, dbUser.companyId),
  });

  return company ?? null;
}
