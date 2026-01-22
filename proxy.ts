import { auth } from "@/server/auth";
import { NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = [
  "/account",
  "/orders",
  "/checkout",
  "/notifications",
];

// Routes that require admin role
const adminRoutes = [
  "/dashboard",
];

// Routes that should redirect to home if already authenticated
const authRoutes = [
  "/sign-in",
  "/sign-up",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "admin";

  const pathname = nextUrl.pathname;

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
});

export const config = {
  matcher: [
    // Match all routes except static files and api routes that don't need auth
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
