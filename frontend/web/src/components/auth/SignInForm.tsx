"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/context/ToastContext";
import { login } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated } = useAuthStore();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If we were redirected here because of an expired / invalid / missing
    // session, do NOT show any toast – the user knows they need to sign in.
    // Also do not auto-redirect away from this page in those cases.
    const reason = searchParams.get("reason");
    if (reason) return;

    const token =
      window.localStorage.getItem("gymhub_token") ||
      window.sessionStorage.getItem("gymhub_token");
    if (token || isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    let hasError = false;
    if (!email) {
      setEmailError("Email is required.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      const data = await login(email, password, isChecked);
      setAuth({
        user: data.user,
        token: data.token,
        rememberMe: isChecked,
        permissions: data.permissions || [],
      });
      showSuccessToast("Login successful. Welcome back!");

      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("/auth") ? next : "/";
      router.push(safeNext);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full bg-white dark:bg-stone-950">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-neutral-900 text-title-sm dark:text-yellow-300 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-neutral-800 dark:text-gray-200">
              Enter your email and password to sign in!
            </p>
          </div>
          {error && (
            <div
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}
          <div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-orange-500">*</span>{" "}
                  </Label>
                  <Input
                    placeholder="info@gmail.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!emailError}
                    hint={emailError || undefined}
                  />
                </div>
                <div>
                  <Label>
                    Password <span className="text-orange-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!passwordError}
                      hint={passwordError || undefined}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block font-normal text-neutral-800 text-theme-sm dark:text-gray-200">
                      Keep me logged in
                    </span>
                  </div>
                  <Link
                    href="/auth/reset-password"
                    className="text-sm text-orange-500 hover:text-orange-600 dark:text-yellow-300"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-500 dark:hover:bg-orange-400"
                    size="sm"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-neutral-900 dark:text-gray-100 sm:text-start">
                Don&apos;t have an account? {""}
                <Link
                  href="/auth/signup"
                  className="text-orange-500 hover:text-orange-600 dark:text-yellow-300"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
