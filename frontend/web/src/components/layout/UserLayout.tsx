"use client";

import UserNavbar from "./UserNavbar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <UserNavbar />
      <main className="pt-16">{children}</main>
    </div>
  );
}
