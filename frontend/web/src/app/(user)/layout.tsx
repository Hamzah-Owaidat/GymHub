"use client";

import UserLayout from "@/components/layout/UserLayout";
import AuthGuard from "@/components/auth/AuthGuard";

/**
 * Layout for authenticated-user-only pages: /profile, /sessions, /chat, etc.
 * The public landing page (/) and auth pages are NOT wrapped by this layout.
 */
export default function UserAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard roles={["user", "admin", "owner", "coach"]}>
      <UserLayout>{children}</UserLayout>
    </AuthGuard>
  );
}
