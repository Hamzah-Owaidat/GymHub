"use client";

import UserNavbar from "./UserNavbar";
import UserFooter from "./UserFooter";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <UserNavbar />
      <main className="pt-16 flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex-1">{children}</div>
        <UserFooter />
      </main>
    </div>
  );
}
