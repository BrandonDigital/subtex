"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { resetPasswordAction, type AuthState } from "@/server/actions/auth";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    resetPasswordAction,
    null
  );

  useEffect(() => {
    if (state?.success) {
      // Redirect to sign in after a short delay
      const timer = setTimeout(() => {
        router.push("/sign-in?reset=success");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  if (state?.success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Password reset successful</h2>
            <p className="text-muted-foreground text-sm">
              Your password has been changed. Redirecting you to sign in...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                required
                disabled={isPending}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                disabled={isPending}
                className="pl-10"
              />
            </div>
          </div>

          {state?.error && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
              {state.error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
