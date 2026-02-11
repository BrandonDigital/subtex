"use client";

import Image from "next/image";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export default function NotAuthorizedPage() {
  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/sign-in";
        },
      },
    });
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center py-12 px-4 bg-background'>
      <div className='w-full max-w-md space-y-8 text-center'>
        {/* Logo */}
        <div className='flex flex-col items-center'>
          <Image
            src='/Subtex_Crown_Logo.svg'
            alt='Subtex'
            width={48}
            height={48}
            className='h-12 w-12 mb-6'
          />
        </div>

        {/* Icon */}
        <div className='flex justify-center'>
          <div className='rounded-full bg-destructive/10 p-4'>
            <ShieldX className='h-10 w-10 text-destructive' />
          </div>
        </div>

        {/* Message */}
        <div className='space-y-2'>
          <h1 className='text-2xl font-bold'>Access Restricted</h1>
          <p className='text-muted-foreground'>
            This site is restricted to administrators only. If you believe you
            should have access, please contact an admin.
          </p>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleSignOut}
          variant='outline'
          className='w-full max-w-xs'
        >
          Sign out and try a different account
        </Button>
      </div>
    </div>
  );
}
