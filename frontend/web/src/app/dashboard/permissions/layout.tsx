"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import React from "react";

export default function PermissionsLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard roles={["admin"]}>{children}</AuthGuard>;
}
