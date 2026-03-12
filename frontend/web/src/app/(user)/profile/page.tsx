"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getUserSubscriptions, type UserSubscription } from "@/lib/api/userSubscriptions";

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserSubscriptions();
        setSubscriptions(res.data || []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const initials =
    ((user?.first_name || "")[0] || "") + ((user?.last_name || "")[0] || "");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Profile card */}
        <div className="flex flex-col items-center rounded-2xl border border-stone-200/80 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-500 text-2xl font-bold text-white shadow-lg shadow-brand-500/25">
            {initials.toUpperCase() || "?"}
          </div>
          <h2 className="mt-4 text-lg font-bold text-stone-900 dark:text-white">
            {user?.first_name} {user?.last_name}
          </h2>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {user?.email}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            {user?.role || "member"}
          </span>

          <div className="mt-6 w-full space-y-3 border-t border-stone-200/80 pt-6 dark:border-stone-800">
            <div className="flex justify-between text-xs">
              <span className="text-stone-400 dark:text-stone-500">
                Subscriptions
              </span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {subscriptions.length}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-400 dark:text-stone-500">
                Status
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Account info */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
              Account Details
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { label: "First name", value: user?.first_name || "—" },
                { label: "Last name", value: user?.last_name || "—" },
                { label: "Email", value: user?.email || "—" },
                { label: "Role", value: user?.role || "member" },
              ].map((field) => (
                <div
                  key={field.label}
                  className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    {field.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-white">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Subscriptions */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                My Subscriptions
              </h3>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                {subscriptions.length} total
              </span>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="mt-6 flex flex-col items-center py-8 text-center">
                <svg className="mb-2 h-10 w-10 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  No subscriptions yet.
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                  Browse gyms to subscribe to a plan.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {subscriptions.map((sub) => {
                  const isActive = sub.status === "active";
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-500 dark:bg-brand-950/40">
                          {(sub.gym_name || "G").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900 dark:text-white">
                            {sub.plan_name}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            {sub.gym_name} &middot; {sub.duration_days} days
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-stone-900 dark:text-white">
                          ${Number(sub.plan_price).toFixed(2)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
