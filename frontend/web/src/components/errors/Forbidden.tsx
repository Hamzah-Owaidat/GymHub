"use client";

import Link from "next/link";
import React from "react";
import ErrorPageLayout from "./ErrorPageLayout";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

type ForbiddenProps = {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  title?: string;
  description?: string;
};

/**
 * 403 – Forbidden page. Used both as a standalone route (/errors/403) and as
 * an inline fallback rendered by <AuthGuard /> when the signed-in user lacks
 * the required role or permission.
 */
export default function Forbidden({
  requiredRoles,
  requiredPermissions,
  title = "Access Denied",
  description,
}: ForbiddenProps) {
  const router = useRouter();
  const { clearAuth, user } = useAuthStore();

  const reasonParts: string[] = [];
  if (requiredRoles && requiredRoles.length) {
    reasonParts.push(`role${requiredRoles.length > 1 ? "s" : ""}: ${requiredRoles.join(", ")}`);
  }
  if (requiredPermissions && requiredPermissions.length) {
    reasonParts.push(
      `permission${requiredPermissions.length > 1 ? "s" : ""}: ${requiredPermissions.join(", ")}`,
    );
  }

  const resolvedDescription =
    description ??
    (reasonParts.length
      ? `Your account${user?.role ? ` (${user.role})` : ""} does not have the required ${reasonParts.join(" and ")} to view this page.`
      : "You don't have permission to access this page. If you believe this is a mistake, contact an administrator.");

  return (
    <ErrorPageLayout
      code="403"
      title={title}
      description={resolvedDescription}
      actions={
        <>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400"
          >
            Back to Home
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={() => {
              clearAuth();
              router.push("/auth/signin");
            }}
            className="inline-flex items-center justify-center rounded-lg border border-transparent px-5 py-3 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-500/10 dark:text-yellow-300 dark:hover:bg-yellow-300/10"
          >
            Sign in as another user
          </button>
        </>
      }
    />
  );
}
