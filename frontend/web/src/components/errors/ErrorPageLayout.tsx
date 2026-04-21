"use client";

import GridShape from "@/components/common/GridShape";
import Image from "next/image";
import Link from "next/link";
import React from "react";

type ErrorPageLayoutProps = {
  /** Big error code shown at the top, e.g. "404", "403", "500". */
  code: string;
  /** Short, user-friendly title, e.g. "Page Not Found". */
  title: string;
  /** Longer description explaining the situation. */
  description: string;
  /** Optional illustration (light/dark variant). Falls back to text-only when omitted. */
  illustration?: {
    light: string;
    dark: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  /** Optional action buttons to render below the description. */
  actions?: React.ReactNode;
};

/**
 * Shared, theme-aware layout for 403 / 404 / 500 / 503 error pages.
 * Matches the auth/dashboard orange-on-stone aesthetic of GymHub.
 */
export default function ErrorPageLayout({
  code,
  title,
  description,
  illustration,
  actions,
}: ErrorPageLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-stone-50 p-6 dark:bg-stone-950">
      <GridShape />

      <div className="relative z-10 mx-auto w-full max-w-xl text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-orange-500 dark:text-yellow-300">
          Error {code}
        </p>

        <h1 className="mb-5 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text font-extrabold tracking-tight text-transparent text-title-lg sm:text-title-2xl [text-shadow:0_0_16px_rgba(249,115,22,0.35)]">
          {title}
        </h1>

        {illustration && (
          <div className="mx-auto mb-6 flex items-center justify-center">
            <Image
              src={illustration.light}
              alt={illustration.alt || title}
              width={illustration.width || 420}
              height={illustration.height || 180}
              className="dark:hidden"
            />
            <Image
              src={illustration.dark}
              alt={illustration.alt || title}
              width={illustration.width || 420}
              height={illustration.height || 180}
              className="hidden dark:block"
            />
          </div>
        )}

        <p className="mx-auto mb-8 max-w-md text-base text-stone-600 dark:text-stone-300">
          {description}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions ?? (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400"
            >
              Back to Home
            </Link>
          )}
        </div>
      </div>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-stone-500 dark:text-stone-400">
        &copy; {new Date().getFullYear()} GymHub
      </p>
    </div>
  );
}
