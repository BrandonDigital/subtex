"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/clients/auth-client";
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
import { MobileSidebarTrigger } from "./mobile-sidebar-trigger";
import type { Notification } from "@/server/schemas/notifications";
import { cn } from "@/lib/utils";

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
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

const EMPTY_NOTIFICATIONS: Notification[] = [];

export function Navbar({
  notifications = EMPTY_NOTIFICATIONS,
  unreadCount = 0,
  cartCount = 0,
  user,
  onCartClick,
  onSignOut,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const scrollEl = document.getElementById("main-scroll-area");
    if (!scrollEl) return;

    const handleScroll = () => {
      setIsScrolled(scrollEl.scrollTop > 50);
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "w-full px-3 py-2 transition-all duration-500",
        isScrolled ? "bg-transparent shadow-none pointer-events-none" : "bg-background shadow-sm"
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between h-12 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-auto",
          isScrolled
            ? "max-w-5xl rounded-full bg-background/50 backdrop-blur-xl text-foreground shadow-sm px-6 border border-border"
            : "max-w-[1440px] rounded-none bg-transparent text-foreground px-4 sm:px-6 lg:px-8 border border-transparent"
        )}
      >
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-6">
          {user?.isAdmin && (
            <div className="lg:hidden">
              <MobileSidebarTrigger />
            </div>
          )}

          <Link href="/" className="flex items-center gap-3 group">
            <div className="transition-all duration-500">
              <Image
                src="/Subtex_Crown_Logo.svg"
                alt="Subtex Crown"
                width={32}
                height={32}
                className="h-8 w-8 transition-transform group-hover:scale-105 dark:invert"
              />
            </div>
            <Image
              src="/Subtex_Text_Logo.svg"
              alt="Subtex"
              width={100}
              height={24}
              className="h-4 hidden sm:block dark:invert"
              style={{ width: "auto" }}
            />
          </Link>
        </div>

        {/* Right: Nav Links, Notifications, Cart, User */}
        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-8 mr-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold tracking-wide uppercase text-foreground hover:opacity-70"
              >
                {link.label}
              </Link>
            ))}
            {user?.isAdmin && (
              <Link
                href="/dashboard"
                className="text-sm font-semibold tracking-wide uppercase text-foreground hover:opacity-70"
              >
                Dashboard
              </Link>
            )}
          </nav>

          {user && (
            <div>
              <NotificationPopover
                notifications={notifications}
                unreadCount={unreadCount}
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative hidden lg:inline-flex rounded-full text-foreground hover:bg-foreground/5"
            onClick={onCartClick}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full bg-foreground text-background"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </Badge>
            )}
            <span className="sr-only">Cart</span>
          </Button>

          {user ? (
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full ring-2 ring-offset-2 ring-foreground/10 ring-offset-background",
                      user.isAdmin ? "ring-yellow-500" : ""
                    )}
                  >
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-foreground text-background">
                        <span className="text-sm font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl border-border"
                >
                  <div className="flex flex-col gap-1 p-2">
                    <p className="text-sm font-bold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer font-medium"
                  >
                    <Link href="/account">Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer font-medium"
                  >
                    <Link href="/orders">Orders</Link>
                  </DropdownMenuItem>
                  {user.isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer font-medium"
                      >
                        <Link href="/dashboard">Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer font-medium"
                    onClick={async () => {
                      onSignOut?.();
                      await authClient.signOut();
                      window.location.href = "/";
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-3">
              <Link href="/sign-in">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-bold uppercase tracking-wide text-foreground hover:bg-foreground/5"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="font-bold uppercase tracking-wide rounded-full px-6 bg-foreground text-background hover:bg-foreground/90"
                >
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
