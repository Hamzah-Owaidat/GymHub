"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function HomeContent() {
  const { user } = useAuthStore();
  const firstName = user?.first_name || "there";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-stone-200/80 bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:border-stone-700/80 dark:bg-stone-800/80 md:p-12">
        <h1 className="text-3xl font-semibold text-stone-800 dark:text-stone-100 md:text-4xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-3 text-stone-600 dark:text-stone-400">
          Find gyms, book sessions, and track your fitness from one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/gyms"
            className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition hover:bg-brand-600"
          >
            Browse Gyms
          </Link>
          <Link
            href="/sessions"
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-stone-50 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            My Sessions
          </Link>
        </div>
      </div>
    </div>
  );
}
