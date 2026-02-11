import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "@/components/auth-form";

const productionUrls = ["https://subtex.com.au", "https://www.subtex.com.au"];
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const isDevSite = appUrl !== "" && !productionUrls.includes(appUrl);

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Subtex account to manage orders and track deliveries.",
};

export default function SignInPage() {
  return (
    <div className='min-h-full flex flex-col items-center justify-center py-12 px-4'>
      <div className='w-full max-w-md space-y-8'>
        {/* Logo */}
        <div className='flex flex-col items-center'>
          <Link href='/' className='flex items-center gap-2 mb-6'>
            <Image
              src='/Subtex_Crown_Logo.svg'
              alt='Subtex'
              width={48}
              height={48}
              className='h-12 w-12'
            />
          </Link>
          <h1 className='text-2xl font-bold'>
            {isDevSite ? "Admin Sign In" : "Welcome back"}
          </h1>
          <p className='text-muted-foreground mt-2'>
            {isDevSite
              ? "This site is restricted to administrators"
              : "Sign in to your account to continue"}
          </p>
        </div>

        {/* Auth Form */}
        <AuthForm mode='sign-in' />

        {/* Sign up link - hidden on dev site */}
        {!isDevSite && (
          <p className='text-center text-sm text-muted-foreground'>
            Don&apos;t have an account?{" "}
            <Link
              href='/sign-up'
              className='text-primary hover:underline font-medium'
            >
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
