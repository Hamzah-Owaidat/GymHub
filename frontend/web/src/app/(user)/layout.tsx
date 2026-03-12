"use client";

import UserLayout from "@/components/layout/UserLayout";

export default function UserAppLayout({ children }: { children: React.ReactNode }) {
  return <UserLayout>{children}</UserLayout>;
}

