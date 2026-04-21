"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { fetchMe } from "@/lib/auth";
import { ApiError } from "@/lib/axios";
import Forbidden from "@/components/errors/Forbidden";

type Mode = "all" | "any";

type AuthGuardProps = {
  children: React.ReactNode;
  /** Required roles. User must be one of these roles. */
  roles?: string[];
  /** Required permission codes. Default mode: "any" (user needs at least one). */
  permissions?: string[];
  permissionMode?: Mode;
  /** When true, render a loading splash while we hydrate the auth state. */
  loadingFallback?: React.ReactNode;
  /**
   * When true (default), if the user has no session we redirect to /auth/signin.
   * When false, we render the fallback ("Not signed in") instead.
   */
  redirectOnMissingAuth?: boolean;
};

/**
 * Wraps a subtree that requires authentication (and optionally specific roles /
 * permissions). On mount it:
 *   1. Verifies a token exists – else redirects to /auth/signin.
 *   2. Calls /api/auth/me to refresh user + permissions (axios interceptor
 *      handles TOKEN_EXPIRED automatically by clearing storage and redirecting).
 *   3. Enforces role / permission gates before rendering children.
 */
export default function AuthGuard({
  children,
  roles,
  permissions,
  permissionMode = "any",
  loadingFallback,
  redirectOnMissingAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    token,
    permissions: storedPerms,
    isAuthenticated,
    setAuth,
    setPermissions,
    rememberMe,
  } = useAuthStore();

  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const hasToken =
      typeof window !== "undefined" &&
      !!(
        window.localStorage.getItem("gymhub_token") ||
        window.sessionStorage.getItem("gymhub_token")
      );

    if (!hasToken) {
      if (redirectOnMissingAuth) {
        const target = `/auth/signin?reason=missing&next=${encodeURIComponent(
          pathname || "/",
        )}`;
        router.replace(target);
      }
      setChecking(false);
      return;
    }

    // Validate the session against the backend. If the token is expired the
    // axios interceptor will clear storage and redirect to /auth/signin.
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMe();
        if (cancelled) return;
        if (data?.user) {
          setAuth({
            user: data.user,
            token: token || "",
            rememberMe,
            permissions: data.permissions || [],
          });
        } else if (data?.permissions) {
          setPermissions(data.permissions);
        }
      } catch (err) {
        // 401 is already handled by the axios interceptor (redirect + clear).
        // For other errors (e.g. offline), we keep the cached state.
        if (!(err instanceof ApiError) || err.status !== 401) {
          // Swallow; page will render with cached auth state.
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally only run this once, on mount. Re-running on every
    // pathname change would spam /api/auth/me during navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated || checking) {
    return (
      loadingFallback ?? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-stone-700 dark:border-t-orange-400" />
        </div>
      )
    );
  }

  if (!isAuthenticated || !user) {
    // The redirect effect will run; render nothing while it's in-flight.
    return null;
  }

  if (roles && roles.length > 0) {
    const role = user.role;
    if (!role || !roles.includes(role)) {
      return <Forbidden requiredRoles={roles} />;
    }
  }

  if (permissions && permissions.length > 0) {
    const ok =
      permissionMode === "all"
        ? permissions.every((p) => storedPerms.includes(p))
        : permissions.some((p) => storedPerms.includes(p));
    if (!ok) {
      return <Forbidden requiredPermissions={permissions} />;
    }
  }

  return <>{children}</>;
}
