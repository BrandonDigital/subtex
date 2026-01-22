import type { Metadata } from "next";
import Link from "next/link";
import { VerifyEmailForm } from "@/components/verify-email-form";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address to complete sign up.",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ userId?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const userId = params.userId;

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 text-center">
          <h1 className="text-2xl font-bold">Invalid Verification Link</h1>
          <p className="text-muted-foreground">
            This verification link is invalid.
          </p>
          <Link
            href="/sign-up"
            className="text-primary hover:underline inline-block mt-4"
          >
            Sign up again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="text-muted-foreground mt-2">
            We&apos;ve sent a 6-digit verification code to your email. Enter it below to complete your sign up.
          </p>
        </div>

        <VerifyEmailForm userId={userId} />

        <p className="text-center text-sm text-muted-foreground">
          Wrong email?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Sign up with a different email
          </Link>
        </p>
      </div>
    </div>
  );
}
