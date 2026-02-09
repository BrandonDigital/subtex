import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "RESEND_API_KEY is not set. Email functionality will be disabled.",
  );
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Default sender email - uses verified domain subtex.com.au
export const FROM_EMAIL =
  process.env.FROM_EMAIL || "Subtex <noreply@subtex.com.au>";
