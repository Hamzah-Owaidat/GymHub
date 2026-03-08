"use client";

import { useAuthStore } from "@/store/authStore";
import LandingPage from "./landing/page";
import UserLayout from "@/components/layout/UserLayout";
import HomeContent from "@/components/home/HomeContent";

export default function RootPage() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return (
      <UserLayout>
        <HomeContent />
      </UserLayout>
    );
  }

  return <LandingPage />;
}
