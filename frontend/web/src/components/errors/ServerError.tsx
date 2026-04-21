"use client";

import Link from "next/link";
import React from "react";
import ErrorPageLayout from "./ErrorPageLayout";

type ServerErrorProps = {
  onRetry?: () => void;
  /** Optional error details shown in dev only. */
  details?: string | null;
};

export default function ServerError({ onRetry, details }: ServerErrorProps) {
  return (
    <ErrorPageLayout
      code="500"
      title="Something Went Wrong"
      description="An unexpected error occurred on our servers. Our team has been notified. Please try again in a moment."
      illustration={{
        light: "/images/error/500.svg",
        dark: "/images/error/500-dark.svg",
        width: 472,
        height: 200,
      }}
      actions={
        <>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400"
            >
              Try Again
            </button>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to Home
          </Link>
          {details && process.env.NODE_ENV !== "production" && (
            <pre className="mt-6 w-full overflow-auto rounded-lg border border-stone-200 bg-white p-4 text-left text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
              {details}
            </pre>
          )}
        </>
      }
    />
  );
}
