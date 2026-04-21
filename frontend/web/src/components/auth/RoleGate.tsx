"use client";

import React from "react";
import { useAuthStore } from "@/store/authStore";
import Forbidden from "@/components/errors/Forbidden";

type Mode = "all" | "any";

type RoleGateProps = {
  children: React.ReactNode;
  /** Required roles. User must be one of these roles. */
  roles?: string[];
  /** Required permission codes. Default mode: "any". */
  permissions?: string[];
  permissionMode?: Mode;
  /** When provided, render this instead of the Forbidden page when the check fails. */
  fallback?: React.ReactNode;
};

/**
 * Lightweight, client-only access gate that checks role / permission from the
 * authStore and renders either the children or a 403 view. Unlike <AuthGuard>,
 * this does NOT validate the session against the server, so it's safe to nest
 * inside pages that are already wrapped by an outer <AuthGuard>.
 */
export default function RoleGate({
  children,
  roles,
  permissions,
  permissionMode = "any",
  fallback,
}: RoleGateProps) {
  const user = useAuthStore((s) => s.user);
  const storedPerms = useAuthStore((s) => s.permissions);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;
  if (!user) return fallback ?? <Forbidden />;

  if (roles && roles.length > 0) {
    if (!user.role || !roles.includes(user.role)) {
      return fallback ?? <Forbidden requiredRoles={roles} />;
    }
  }

  if (permissions && permissions.length > 0) {
    const ok =
      permissionMode === "all"
        ? permissions.every((p) => storedPerms.includes(p))
        : permissions.some((p) => storedPerms.includes(p));
    if (!ok) {
      return fallback ?? <Forbidden requiredPermissions={permissions} />;
    }
  }

  return <>{children}</>;
}
