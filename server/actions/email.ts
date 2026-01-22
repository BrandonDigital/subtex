"use server";

import { resend, FROM_EMAIL } from "@/lib/resend";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!resend) {
    console.log("Email skipped (Resend not configured):", { to, subject });
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Email error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// Welcome email template
export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to Subtex!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Welcome to Subtex, ${name}!</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for creating an account with us. We're Perth's local supplier of premium ACM sheets for signage, cladding, and architectural applications.
              </p>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                You can now:
              </p>
              <ul style="color: #52525b; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li>Browse our range of ACM sheets</li>
                <li>Track your orders</li>
                <li>Get notified when products are back in stock</li>
                <li>Manage your delivery preferences</li>
              </ul>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                Start Shopping
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                16 Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to Subtex, ${name}!\n\nThank you for creating an account with us. We're Perth's local supplier of premium ACM sheets.\n\nVisit ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'} to start shopping.`,
  });
}

// Order confirmation email
export async function sendOrderConfirmationEmail(
  email: string,
  name: string,
  orderId: string,
  items: { name: string; quantity: number; price: string }[],
  total: string
) {
  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">${item.name}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7; text-align: right;">${item.price}</td>
        </tr>
      `
    )
    .join("");

  return sendEmail({
    to: email,
    subject: `Order Confirmation #${orderId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Order Confirmed!</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${name}, thank you for your order. We've received your payment and are processing your order.
              </p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; color: #52525b;"><strong>Order ID:</strong> ${orderId}</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr>
                    <th style="text-align: left; padding: 12px 0; border-bottom: 2px solid #e4e4e7; color: #52525b;">Item</th>
                    <th style="text-align: center; padding: 12px 0; border-bottom: 2px solid #e4e4e7; color: #52525b;">Qty</th>
                    <th style="text-align: right; padding: 12px 0; border-bottom: 2px solid #e4e4e7; color: #52525b;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding: 16px 0; font-weight: bold;">Total (inc. GST)</td>
                    <td style="padding: 16px 0; text-align: right; font-weight: bold;">${total}</td>
                  </tr>
                </tfoot>
              </table>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/orders" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                View Order
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                16 Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

// Back in stock notification
export async function sendBackInStockEmail(
  email: string,
  productName: string,
  productUrl: string
) {
  return sendEmail({
    to: email,
    subject: `${productName} is back in stock!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Good news! 🎉</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${productName}</strong> is back in stock and ready to ship.
              </p>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                Don't miss out – stock is limited!
              </p>
              <a href="${productUrl}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                Shop Now
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                You received this email because you signed up for stock notifications. 
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/account" style="color: #52525b;">Manage preferences</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

// Low stock alert for admins
export async function sendLowStockAlertEmail(
  email: string,
  productName: string,
  sku: string,
  currentStock: number
) {
  return sendEmail({
    to: email,
    subject: `⚠️ Low Stock Alert: ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
                <h1 style="color: #dc2626; margin: 0 0 8px 0; font-size: 20px;">Low Stock Alert</h1>
                <p style="color: #7f1d1d; margin: 0;">Inventory is running low and needs attention.</p>
              </div>
              <table style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; color: #52525b;"><strong>Product:</strong></td>
                  <td style="padding: 8px 0; color: #18181b;">${productName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #52525b;"><strong>SKU:</strong></td>
                  <td style="padding: 8px 0; color: #18181b;">${sku}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #52525b;"><strong>Current Stock:</strong></td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${currentStock} units</td>
                </tr>
              </table>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/dashboard/inventory" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                Manage Inventory
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

// Email verification code
export async function sendVerificationCodeEmail(email: string, code: string) {
  return sendEmail({
    to: email,
    subject: `Your Subtex verification code: ${code}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Verify your email</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                Enter this code to complete your sign up:
              </p>
              <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #18181b;">${code}</span>
              </div>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                This code expires in 10 minutes.
              </p>
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                16 Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your Subtex verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
  });
}

// Launch notification email for subscribers
export async function sendLaunchNotificationEmail(email: string) {
  return sendEmail({
    to: email,
    subject: "Subtex is Now Live! 🎉",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">We're Live! 🎉</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Subtex is now officially live and ready to serve you.
              </p>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                As Perth's trusted supplier of premium ACM sheets, we're excited to offer:
              </p>
              <ul style="color: #52525b; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li>High-quality aluminium composite panels</li>
                <li>White and black options in gloss and matte finishes</li>
                <li>Competitive trade pricing with bulk discounts</li>
                <li>Fast local delivery across Western Australia</li>
              </ul>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://subtex.com.au'}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                Start Shopping
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                16 Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin: 16px 0 0 0;">
                You received this email because you signed up for launch notifications.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `We're Live! 🎉\n\nGreat news! Subtex is now officially live and ready to serve you.\n\nVisit ${process.env.NEXT_PUBLIC_APP_URL || 'https://subtex.com.au'} to start shopping.\n\nSubtex - Perth's trusted supplier of premium ACM sheets.`,
  });
}

// Password reset email
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  return sendEmail({
    to: email,
    subject: "Reset your Subtex password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Reset your password</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset your password. Click the button below to choose a new password:
              </p>
              <a href="${resetUrl}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin-bottom: 20px;">
                Reset Password
              </a>
              <p style="color: #52525b; line-height: 1.6; margin: 20px 0;">
                This link expires in 1 hour.
              </p>
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                16 Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Reset your Subtex password\n\nWe received a request to reset your password. Visit this link to choose a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
  });
}
