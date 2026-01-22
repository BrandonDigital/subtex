"use client";

import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpAction, signInAction, type AuthState } from "@/server/actions/auth";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    action,
    null
  );

  // Check for success messages
  const verified = searchParams.get("verified") === "true";
  const resetSuccess = searchParams.get("reset") === "success";

  useEffect(() => {
    // Handle verification redirect
    if (state?.requiresVerification && state?.userId) {
      router.push(`/verify-email?userId=${state.userId}`);
      return;
    }

    // Handle successful sign in
    if (state?.success && !state?.requiresVerification) {
      router.push(mode === "sign-in" ? "/" : "/account");
      router.refresh();
    }
  }, [state, mode, router]);

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Success messages */}
        {verified && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Email verified! You can now sign in.
            </p>
          </div>
        )}

        {resetSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Password reset successful! Sign in with your new password.
            </p>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {mode === "sign-up" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Smith"
                required
                disabled={isPending}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={mode === "sign-up" ? "Minimum 8 characters" : "Enter your password"}
              required
              disabled={isPending}
            />
          </div>

          {mode === "sign-up" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="emailNotifications"
                    name="emailNotifications"
                    defaultChecked
                    disabled={isPending}
                  />
                  <Label htmlFor="emailNotifications" className="text-sm font-normal leading-tight">
                    Send me email updates about my orders and back-in-stock alerts
                  </Label>
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="acceptTerms"
                    name="acceptTerms"
                    required
                    disabled={isPending}
                  />
                  <Label htmlFor="acceptTerms" className="text-sm font-normal leading-tight">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary hover:underline" target="_blank">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
              </div>
            </>
          )}

          {mode === "sign-in" && (
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          {state?.error && !state?.requiresVerification && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
              {state.error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "sign-in" ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              <>{mode === "sign-in" ? "Sign in" : "Create account"}</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
