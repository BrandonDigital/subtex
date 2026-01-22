"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToLaunchNotification } from "@/server/actions/subscribers";
import { Loader2, Check, Mail } from "lucide-react";

export function ComingSoon() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setStatus("error");
      setMessage("Please enter your email address");
      return;
    }

    setStatus("loading");

    const result = await subscribeToLaunchNotification(email);

    if (result.success) {
      setStatus("success");
      setMessage(result.message || "Thanks! We'll notify you when we launch.");
      setEmail("");
    } else {
      setStatus("error");
      setMessage(result.error || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-zinc-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12 text-center">
        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/Subtex_Logo_Combined.svg"
            alt="Subtex"
            width={320}
            height={120}
            className="mx-auto h-32 sm:h-40 w-auto"
            priority
          />
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-zinc-900 mb-6 tracking-tight">
          Coming Soon
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-zinc-600 mb-10 max-w-lg mx-auto leading-relaxed">
          Perth&apos;s trusted supplier of premium ACM sheets for signage, cladding, and architectural applications.
        </p>

        {/* Email Signup Form */}
        <div className="max-w-md mx-auto">
          {status === "success" ? (
            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-zinc-900 text-white">
              <Check className="h-6 w-6 shrink-0 stroke-[3]" />
              <span>{message}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    className="h-11 pl-10 pr-4 bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-zinc-900 rounded-none text-sm"
                    disabled={status === "loading"}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="h-11 px-6 bg-zinc-900 text-white hover:bg-zinc-800 font-semibold rounded-none text-sm transition-all duration-200 disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    "Notify Me"
                  )}
                </Button>
              </div>
              {status === "error" && message && (
                <p className="text-sm text-red-600 text-center">{message}</p>
              )}
            </form>
          )}

          <p className="text-xs text-zinc-500 mt-4">
            We&apos;ll only email you once when we launch.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-sm text-zinc-400">
          &copy; {new Date().getFullYear()} Subtex. All rights reserved.
        </p>
      </div>
    </div>
  );
}
