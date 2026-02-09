import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Subtex account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className='min-h-full flex items-center justify-center px-4 py-12'>
      <div className='w-full max-w-md space-y-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold'>Forgot your password?</h1>
          <p className='text-muted-foreground mt-2'>
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>
        </div>

        <ForgotPasswordForm />

        <p className='text-center text-sm text-muted-foreground'>
          Remember your password?{" "}
          <Link href='/sign-in' className='text-primary hover:underline'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
