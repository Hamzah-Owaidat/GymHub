"use client";

import Link from "next/link";
import React from "react";
import ErrorPageLayout from "./ErrorPageLayout";

export default function Unauthorized() {
  return (
    <ErrorPageLayout
      code="401"
      title="You're Not Signed In"
      description="You need to sign in to access this page. Please log in to continue."
      actions={
        <>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400"
          >
            Sign In
          </Link>
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
