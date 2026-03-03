"use client";

import { useActionState } from "react";
import { useState } from "react";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { forgotPasswordAction, type AuthState } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    forgotPasswordAction,
    null
  );
  const [submitted, setSubmitted] = useState(false);

  if (state?.success || submitted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              If an account with that email exists, we&apos;ve sent a password reset link.
              Please check your inbox and spam folder.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          action={(formData) => {
            formAction(formData);
            setSubmitted(true);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
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
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
