"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, Fingerprint, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  signUpAction,
  signInAction,
  type AuthState,
} from "@/server/actions/auth";
import { authClient } from "@/lib/clients/auth-client";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24'>
      <path
        fill='#4285F4'
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
      />
      <path
        fill='#34A853'
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      />
      <path
        fill='#FBBC05'
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
      />
      <path
        fill='#EA4335'
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      />
    </svg>
  );
}

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const autofillActiveRef = useRef(false);
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState<
    AuthState | null,
    FormData
  >(action, null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch {
      setIsGoogleLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setIsPasskeyLoading(true);
    setPasskeyError(null);
    // Mark that we're starting a manual passkey flow (autofill will be aborted)
    autofillActiveRef.current = false;
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) {
        // Ignore abort errors - they're expected when user cancels or another ceremony starts
        const errorCode = (result.error as { code?: string })?.code;
        if (
          result.error.message?.includes("abort") ||
          errorCode === "ABORT_ERROR"
        ) {
          return;
        }
        setPasskeyError(
          result.error.message || "Passkey authentication failed"
        );
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Passkey error:", error);
      setPasskeyError(
        "Passkey authentication failed. Please try another method."
      );
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  // Enable passkey autofill on sign-in page
  const passkeyInitiatedRef = useRef(false);

  useEffect(() => {
    if (mode !== "sign-in") return;

    // Prevent double-invocation from React Strict Mode
    if (passkeyInitiatedRef.current) return;
    passkeyInitiatedRef.current = true;

    let cancelled = false;

    // Check if browser supports passkey conditional UI
    if (
      typeof PublicKeyCredential !== "undefined" &&
      PublicKeyCredential.isConditionalMediationAvailable
    ) {
      PublicKeyCredential.isConditionalMediationAvailable().then(
        (available) => {
          if (available && !cancelled) {
            autofillActiveRef.current = true;
            // Trigger autofill
            authClient.signIn
              .passkey({ autoFill: true })
              .then((result) => {
                if (cancelled) return;
                autofillActiveRef.current = false;
                if (result && !result.error) {
                  router.push("/");
                  router.refresh();
                }
              })
              .catch(() => {
                // Silently fail for autofill - abort errors are expected
                autofillActiveRef.current = false;
              });
          }
        }
      );
    }

    return () => {
      cancelled = true;
    };
  }, [mode, router]);

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
      <CardContent className='pt-6'>
        {/* Success messages */}
        {verified && (
          <div className='mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3'>
            <CheckCircle className='h-5 w-5 text-green-600 shrink-0' />
            <p className='text-sm text-green-800 dark:text-green-200'>
              Email verified! You can now sign in.
            </p>
          </div>
        )}

        {resetSuccess && (
          <div className='mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3'>
            <CheckCircle className='h-5 w-5 text-green-600 shrink-0' />
            <p className='text-sm text-green-800 dark:text-green-200'>
              Password reset successful! Sign in with your new password.
            </p>
          </div>
        )}

        {/* Passkey Sign In (only on sign-in) */}
        {mode === "sign-in" && (
          <>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              size='lg'
              onClick={handlePasskeySignIn}
              disabled={isPending || isPasskeyLoading || isGoogleLoading}
            >
              {isPasskeyLoading ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Fingerprint className='mr-2 h-5 w-5' />
              )}
              Sign in with Passkey
            </Button>

            {passkeyError && (
              <p className='text-sm text-destructive mt-2 text-center'>
                {passkeyError}
              </p>
            )}

            <div className='relative my-4'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-card px-2 text-muted-foreground'>Or</span>
              </div>
            </div>
          </>
        )}

        {/* Google Sign In */}
        <Button
          type='button'
          variant='outline'
          className='w-full'
          size='lg'
          onClick={handleGoogleSignIn}
          disabled={isPending || isGoogleLoading || isPasskeyLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <GoogleIcon className='mr-2 h-5 w-5' />
          )}
          Continue with Google
        </Button>

        {/* Divider */}
        <div className='relative my-6'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-card px-2 text-muted-foreground'>
              Or continue with email
            </span>
          </div>
        </div>

        <form
          action={formAction}
          onSubmit={(e) => {
            if (mode === "sign-up") {
              const form = e.currentTarget;
              const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
              const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement)?.value;
              if (password !== confirmPassword) {
                e.preventDefault();
                setClientError("Passwords do not match");
                return;
              }
              setClientError(null);
            }
          }}
          className='space-y-4'
        >
          {mode === "sign-up" && (
            <div className='space-y-2'>
              <Label htmlFor='name'>Full Name</Label>
              <Input
                id='name'
                name='name'
                type='text'
                placeholder='John Smith'
                required
                disabled={isPending}
              />
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              name='email'
              type='email'
              placeholder='you@example.com'
              autoComplete={mode === "sign-in" ? "username webauthn" : "email"}
              required
              disabled={isPending}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='password'>Password</Label>
            <div className='relative'>
              <Input
                id='password'
                name='password'
                type={showPassword ? "text" : "password"}
                placeholder={
                  mode === "sign-up"
                    ? "Minimum 8 characters"
                    : "Enter your password"
                }
                autoComplete={
                  mode === "sign-in"
                    ? "current-password webauthn"
                    : "new-password"
                }
                required
                disabled={isPending}
                className='pr-10'
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className='h-4 w-4' />
                ) : (
                  <Eye className='h-4 w-4' />
                )}
              </button>
            </div>
          </div>

          {mode === "sign-up" && (
            <>
              <div className='space-y-2'>
                <Label htmlFor='confirmPassword'>Confirm Password</Label>
                <div className='relative'>
                  <Input
                    id='confirmPassword'
                    name='confirmPassword'
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder='Confirm your password'
                    autoComplete='new-password'
                    required
                    disabled={isPending}
                    className='pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </div>

              <Separator />

              {/* Company Onboarding */}
              <div className='space-y-4'>
                <div>
                  <p className='text-sm font-medium'>Company Details</p>
                  <p className='text-xs text-muted-foreground'>
                    Optional. Set up your company profile.
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='companyName'>Company Name</Label>
                  <Input
                    id='companyName'
                    name='companyName'
                    type='text'
                    placeholder='Acme Corporation'
                    disabled={isPending}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='companyUrl'>Company Website</Label>
                  <Input
                    id='companyUrl'
                    name='companyUrl'
                    type='url'
                    placeholder='https://example.com'
                    disabled={isPending}
                  />
                </div>
              </div>

              <Separator />

              <div className='space-y-3 pt-2'>
                <div className='flex items-start gap-2'>
                  <Checkbox
                    id='emailNotifications'
                    name='emailNotifications'
                    defaultChecked
                    disabled={isPending}
                  />
                  <Label
                    htmlFor='emailNotifications'
                    className='text-sm font-normal leading-tight'
                  >
                    Send me email updates about my orders and back-in-stock
                    alerts
                  </Label>
                </div>

                <div className='flex items-start gap-2'>
                  <Checkbox
                    id='acceptTerms'
                    name='acceptTerms'
                    required
                    disabled={isPending}
                  />
                  <Label
                    htmlFor='acceptTerms'
                    className='text-sm font-normal leading-tight'
                  >
                    I agree to the{" "}
                    <Link
                      href='/terms'
                      className='text-primary hover:underline'
                      target='_blank'
                    >
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                      href='/privacy'
                      className='text-primary hover:underline'
                      target='_blank'
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
              </div>
            </>
          )}

          {mode === "sign-in" && (
            <div className='flex justify-end'>
              <Link
                href='/forgot-password'
                className='text-sm text-primary hover:underline'
              >
                Forgot password?
              </Link>
            </div>
          )}

          {clientError && (
            <div className='text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md'>
              {clientError}
            </div>
          )}

          {state?.error && !state?.requiresVerification && !clientError && (
            <div className='text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md'>
              {state.error}
            </div>
          )}

          <Button
            type='submit'
            className='w-full'
            size='lg'
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
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
