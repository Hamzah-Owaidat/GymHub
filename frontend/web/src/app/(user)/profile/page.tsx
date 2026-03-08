"use client";

import { useAuthStore } from "@/store/authStore";

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-stone-800 dark:text-stone-100">
        Profile
      </h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Manage your account settings. This page will be expanded with profile form and preferences.
      </p>
      {user && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800">
          <p className="text-sm text-stone-500 dark:text-stone-400">Email</p>
          <p className="font-medium text-stone-900 dark:text-stone-100">{user.email}</p>
          <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Name</p>
          <p className="font-medium text-stone-900 dark:text-stone-100">
            {user.first_name} {user.last_name}
          </p>
        </div>
      )}
    </div>
  );
}
