"use client";

import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { ShoppingCart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPopover } from "@/components/notification-popover";
import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger";
import type { Notification } from "@/server/schemas/notifications";

interface NavbarProps {
  notifications?: Notification[];
  unreadCount?: number;
  cartCount?: number;
  user?: {
    name: string;
    email: string;
    image?: string;
    isAdmin?: boolean;
  } | null;
  onCartClick?: () => void;
  onSignOut?: () => void;
}

const navLinks = [
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({
  notifications = [],
  unreadCount = 0,
  cartCount = 0,
  user,
  onCartClick,
  onSignOut,
}: NavbarProps) {
  return (
    <header className='w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'>
      <div className='container mx-auto flex h-16 items-center justify-between px-4'>
        {/* Left: Logo Group + Nav Links */}
        <div className='flex items-center gap-6'>
          {/* Mobile admin sidebar trigger */}
          {user?.isAdmin && (
            <div className='lg:hidden'>
              <MobileSidebarTrigger />
            </div>
          )}

          {/* Logo Group: Crown + Text */}
          <Link href='/' className='flex items-center gap-2'>
            <Image
              src='/Subtex_Crown_Logo.svg'
              alt='Subtex Crown'
              width={36}
              height={36}
              className='h-9 w-9'
            />
            <Image
              src='/Subtex_Text_Logo.svg'
              alt='Subtex'
              width={90}
              height={22}
              className='h-[22px] w-auto'
            />
          </Link>
        </div>

        {/* Right: Nav Links, Notifications, Cart, User */}
        <div className='flex items-center gap-4'>
          {/* Nav Links - desktop (hidden when mobile nav is showing) */}
          <nav className='hidden lg:flex items-center gap-6'>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className='text-sm font-medium text-foreground/70 transition-colors hover:text-foreground'
              >
                {link.label}
              </Link>
            ))}
            {user?.isAdmin && (
              <Link
                href='/dashboard'
                className='text-sm font-medium text-foreground/70 transition-colors hover:text-foreground'
              >
                Dashboard
              </Link>
            )}
          </nav>
          {/* Notifications */}
          {user && (
            <NotificationPopover
              notifications={notifications}
              unreadCount={unreadCount}
            />
          )}

          {/* Cart - triggers the cart sheet (hidden on mobile, shown on lg+) */}
          <Button
            variant='ghost'
            size='icon'
            className='relative hidden lg:inline-flex'
            onClick={onCartClick}
          >
            <ShoppingCart className='h-5 w-5' />
            {cartCount > 0 && (
              <Badge
                variant='default'
                className='absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs'
              >
                {cartCount > 9 ? "9+" : cartCount}
              </Badge>
            )}
            <span className='sr-only'>Cart</span>
          </Button>

          {/* User Menu (hidden on mobile, shown on lg+) */}
          {user ? (
            <div className='hidden lg:block'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={`rounded-full ring-2 ring-offset-2 ring-offset-background ${
                      user.isAdmin ? "ring-yellow-500" : "ring-white"
                    }`}
                  >
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={32}
                        height={32}
                        className='h-8 w-8 rounded-full object-cover'
                      />
                    ) : (
                      <div className='h-8 w-8 rounded-full bg-primary flex items-center justify-center'>
                        <span className='text-sm font-medium text-primary-foreground'>
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className='sr-only'>User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-56'>
                  <div className='flex flex-col gap-1 p-2'>
                    <p className='text-sm font-medium'>{user.name}</p>
                    <p className='text-xs text-muted-foreground'>
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href='/account'>Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/orders'>Orders</Link>
                  </DropdownMenuItem>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href='/dashboard'>Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className='text-destructive cursor-pointer'
                    onClick={async () => {
                      // Clear cart before signing out
                      onSignOut?.();
                      await authClient.signOut();
                      window.location.href = "/";
                    }}
                  >
                    <LogOut className='h-4 w-4 mr-2' />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className='hidden lg:flex items-center gap-2'>
              <Link href='/sign-in'>
                <Button variant='ghost' size='sm'>
                  Sign in
                </Button>
              </Link>
              <Link href='/sign-up'>
                <Button size='sm'>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
