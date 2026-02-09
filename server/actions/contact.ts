"use server";

import { db } from "../db";
import { users } from "../schemas/users";
import { notifications, type NewNotification } from "../schemas/notifications";
import { eq } from "drizzle-orm";
import { sendContactFormToSales, sendContactFormConfirmation } from "./email";

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export async function submitContactForm(data: ContactFormData) {
  const { name, email, phone, message } = data;

  // Validate required fields
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return { success: false, error: "Name, email, and message are required" };
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  try {
    // Send emails in parallel
    const [salesEmailResult, userEmailResult] = await Promise.allSettled([
      // 1. Send email to sales team
      sendContactFormToSales({
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim(),
        message: message.trim(),
      }),
      // 2. Send confirmation email to user
      sendContactFormConfirmation({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      }),
    ]);

    // Log any email failures (but don't fail the request)
    if (salesEmailResult.status === "rejected") {
      console.error("Failed to send email to sales:", salesEmailResult.reason);
    }
    if (userEmailResult.status === "rejected") {
      console.error(
        "Failed to send confirmation email:",
        userEmailResult.reason,
      );
    }

    // 3. Create in-app notifications for all admin users
    await notifyAdminsOfContactMessage({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      message: message.trim(),
    });

    return {
      success: true,
      message:
        "Your message has been sent successfully. We'll be in touch soon!",
    };
  } catch (error) {
    console.error("Contact form submission error:", error);
    return {
      success: false,
      error:
        "Failed to send message. Please try again or email us directly at sales@subtex.com.au",
    };
  }
}

async function notifyAdminsOfContactMessage(data: ContactFormData) {
  try {
    // Get all admin users
    const adminUsers = await db.query.users.findMany({
      where: eq(users.role, "admin"),
      columns: {
        id: true,
      },
    });

    if (adminUsers.length === 0) {
      console.warn("No admin users found to notify");
      return;
    }

    // Create notification for each admin
    const notificationsToInsert: NewNotification[] = adminUsers.map(
      (admin) => ({
        userId: admin.id,
        type: "system" as const,
        title: `New Contact Message from ${data.name}`,
        message: `${data.email}${data.phone ? ` • ${data.phone}` : ""}\n\n${data.message.substring(0, 200)}${data.message.length > 200 ? "..." : ""}`,
        link: null,
        read: false,
        emailSent: false,
      }),
    );

    await db.insert(notifications).values(notificationsToInsert);
  } catch (error) {
    // Don't throw - we don't want notification failure to break the form submission
    console.error("Failed to create admin notifications:", error);
  }
}
