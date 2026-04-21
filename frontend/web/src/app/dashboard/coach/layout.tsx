"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import React from "react";

export default function CoachDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard roles={["coach"]}>{children}</AuthGuard>;
}
