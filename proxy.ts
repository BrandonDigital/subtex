import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Production URLs - any other NEXT_PUBLIC_APP_URL is treated as a dev site
const productionUrls = ["https://subtex.com.au", "https://www.subtex.com.au"];
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const isDevSite = appUrl !== "" && !productionUrls.includes(appUrl);

// Routes that require authentication
const protectedRoutes = ["/account", "/orders", "/notifications"];

// Routes that require admin role
const adminRoutes = ["/dashboard"];

// Routes that should redirect to home if already authenticated
const authRoutes = ["/sign-in", "/sign-up"];

// Routes that are always accessible (even in dev admin-only mode)
const devAllowedRoutes = [
  "/sign-in",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/not-authorized",
  "/api/auth",
];

export default async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Get session using BetterAuth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isLoggedIn = !!session?.user;
  const user = session?.user as { role?: string } | undefined;
  const isAdmin = user?.role === "admin";

  // ── Dev site admin-only mode ──
  // When not on production, gate the entire site behind admin authentication
  if (isDevSite) {
    const isAllowedRoute = devAllowedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Always allow access to auth-related routes
    if (isAllowedRoute) {
      // If logged in as admin and on sign-in page, redirect to home
      if (pathname.startsWith("/sign-in") && isLoggedIn && isAdmin) {
        return NextResponse.redirect(new URL("/", nextUrl));
      }
      // If logged in but not admin and on sign-in page, redirect to not-authorized
      if (pathname.startsWith("/sign-in") && isLoggedIn && !isAdmin) {
        return NextResponse.redirect(new URL("/not-authorized", nextUrl));
      }
      // Block sign-up in dev admin-only mode
      if (pathname.startsWith("/sign-up")) {
        return NextResponse.redirect(new URL("/sign-in", nextUrl));
      }
      return NextResponse.next();
    }

    // For all other routes, require admin authentication
    if (!isLoggedIn) {
      const signInUrl = new URL("/sign-in", nextUrl);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/not-authorized", nextUrl));
    }

    // Admin is logged in, allow access
    return NextResponse.next();
  }

  // ── Normal mode (production) ──

  // Check if trying to access auth routes while logged in
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Check if trying to access admin routes
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/sign-in", nextUrl);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Check if trying to access protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      const signInUrl = new URL("/sign-in", nextUrl);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and api routes that don't need auth
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
