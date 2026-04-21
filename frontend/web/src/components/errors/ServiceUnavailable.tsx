"use client";

import Link from "next/link";
import React from "react";
import ErrorPageLayout from "./ErrorPageLayout";

export default function ServiceUnavailable() {
  return (
    <ErrorPageLayout
      code="503"
      title="We'll Be Right Back"
      description="GymHub is currently undergoing maintenance or experiencing high load. Please try again in a few minutes."
      illustration={{
        light: "/images/error/503.svg",
        dark: "/images/error/503-dark.svg",
        width: 472,
        height: 210,
      }}
      actions={
        <>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400"
          >
            Reload Page
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Back to Home
          </Link>
        </>
      }
    />
  );
}
