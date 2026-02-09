"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { addresses } from "../schemas/users";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Auth helper
async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Validation schema
const addressSchema = z.object({
  recipientName: z.string().min(2, "Recipient name is required"),
  phone: z.string().optional(),
  label: z.string().optional(),
  street: z.string().min(1, "Street address is required"),
  unit: z.string().optional(),
  suburb: z.string().min(1, "Suburb is required"),
  state: z.string().min(1, "State is required"),
  postcode: z.string().min(1, "Postcode is required"),
  country: z.string().default("Australia"),
  placeId: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

// Get all addresses for the current user
export async function getAddresses() {
  const user = await requireAuth();

  const userAddresses = await db.query.addresses.findMany({
    where: eq(addresses.userId, user.id),
    orderBy: (addr, { desc }) => [desc(addr.isDefault), desc(addr.createdAt)],
  });

  return userAddresses;
}

// Get a single address by ID
export async function getAddressById(addressId: string) {
  const user = await requireAuth();

  const address = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, user.id)),
  });

  return address;
}

// Create a new address
export async function createAddress(input: AddressInput) {
  const user = await requireAuth();

  const validatedData = addressSchema.parse(input);

  // If this address is set as default, unset other defaults
  if (validatedData.isDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, user.id));
  }

  // If this is the first address, make it default
  const existingAddresses = await db.query.addresses.findMany({
    where: eq(addresses.userId, user.id),
  });

  const isFirstAddress = existingAddresses.length === 0;

  const [newAddress] = await db
    .insert(addresses)
    .values({
      userId: user.id,
      recipientName: validatedData.recipientName,
      phone: validatedData.phone || null,
      label: validatedData.label || null,
      street: validatedData.street,
      unit: validatedData.unit || null,
      suburb: validatedData.suburb,
      state: validatedData.state,
      postcode: validatedData.postcode,
      country: validatedData.country,
      placeId: validatedData.placeId || null,
      isDefault: isFirstAddress || validatedData.isDefault,
    })
    .returning();

  revalidatePath("/account");
  revalidatePath("/checkout");

  return { success: true, address: newAddress };
}

// Update an existing address
export async function updateAddress(addressId: string, input: AddressInput) {
  const user = await requireAuth();

  const validatedData = addressSchema.parse(input);

  // Verify the address belongs to the user
  const existingAddress = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, user.id)),
  });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  // If this address is set as default, unset other defaults
  if (validatedData.isDefault) {
    await db
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, user.id));
  }

  const [updatedAddress] = await db
    .update(addresses)
    .set({
      recipientName: validatedData.recipientName,
      phone: validatedData.phone || null,
      label: validatedData.label || null,
      street: validatedData.street,
      unit: validatedData.unit || null,
      suburb: validatedData.suburb,
      state: validatedData.state,
      postcode: validatedData.postcode,
      country: validatedData.country,
      placeId: validatedData.placeId || null,
      isDefault: validatedData.isDefault,
      updatedAt: new Date(),
    })
    .where(eq(addresses.id, addressId))
    .returning();

  revalidatePath("/account");
  revalidatePath("/checkout");

  return { success: true, address: updatedAddress };
}

// Delete an address
export async function deleteAddress(addressId: string) {
  const user = await requireAuth();

  // Verify the address belongs to the user
  const existingAddress = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, user.id)),
  });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  const wasDefault = existingAddress.isDefault;

  await db.delete(addresses).where(eq(addresses.id, addressId));

  // If we deleted the default address, make the most recent one default
  if (wasDefault) {
    const remainingAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, user.id),
      orderBy: (addr, { desc }) => [desc(addr.createdAt)],
      limit: 1,
    });

    if (remainingAddresses.length > 0) {
      await db
        .update(addresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(addresses.id, remainingAddresses[0].id));
    }
  }

  revalidatePath("/account");
  revalidatePath("/checkout");

  return { success: true };
}

// Set an address as default
export async function setDefaultAddress(addressId: string) {
  const user = await requireAuth();

  // Verify the address belongs to the user
  const existingAddress = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, user.id)),
  });

  if (!existingAddress) {
    throw new Error("Address not found");
  }

  // Unset all other defaults
  await db
    .update(addresses)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(eq(addresses.userId, user.id));

  // Set this address as default
  await db
    .update(addresses)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(addresses.id, addressId));

  revalidatePath("/account");
  revalidatePath("/checkout");

  return { success: true };
}
