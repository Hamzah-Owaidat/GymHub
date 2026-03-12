"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import UserLayout from "@/components/layout/UserLayout";
import HomeContent from "@/components/home/HomeContent";

export default function RootPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch: render a stable shell until mounted on the client.
  if (!mounted) {
    return <div className="min-h-screen bg-stone-50 dark:bg-stone-950" />;
  }

  return (
    <UserLayout>
      <HomeContent />
    </UserLayout>
  );
}
