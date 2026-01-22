import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a Subtex account to order ACM sheets and track your deliveries.",
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <Image
              src="/Subtex_Crown_Logo.svg"
              alt="Subtex"
              width={48}
              height={48}
              className="h-12 w-12"
            />
          </Link>
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground mt-2">
            Sign up to order ACM sheets and track deliveries
          </p>
        </div>

        {/* Auth Form */}
        <AuthForm mode="sign-up" />

        {/* Sign in link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
