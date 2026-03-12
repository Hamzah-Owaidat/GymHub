"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { getMyCoachProfile } from "@/lib/api/coaches";
import { getMySessions, type Session } from "@/lib/api/sessions";

export default function CoachOverviewPage() {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [coachName, setCoachName] = useState<string>("");
  const [gymName, setGymName] = useState<string>("");
  const [upcoming, setUpcoming] = useState<Session[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await getMyCoachProfile();
        const c = profileRes.coach;
        setCoachName(`${c.user_first_name ?? ""} ${c.user_last_name ?? ""}`.trim());
        setGymName(c.gym_name ?? "");

        const sessionsRes = await getMySessions({ page: 1, limit: 5, sortBy: "session_date", sortDir: "asc" });
        setUpcoming(sessionsRes.data);
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "Failed to load coach overview");
      } finally {
        setLoading(false);
      }
    })();
  }, [showError]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Coach Dashboard" />
      <div className="flex min-h-0 flex-1 flex-col gap-6 rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800 md:p-8">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-stone-500 dark:text-stone-400">
            Loading...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/40">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Coach
                </p>
                <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">
                  {coachName || "Coach"}
                </p>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  Gym: {gymName || "N/A"}
                </p>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/40">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  Next sessions
                </p>
                <p className="mt-1 text-3xl font-semibold text-stone-900 dark:text-stone-50">
                  {upcoming.length}
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Upcoming booked sessions (next few records)
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-4 dark:border-stone-700 dark:bg-stone-900/60">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
                  Upcoming sessions
                </h3>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">No upcoming sessions.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-stone-100 bg-stone-50 text-xs font-medium text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Client</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcoming.map((s) => (
                        <tr key={s.id} className="border-b border-stone-100 dark:border-stone-800">
                          <td className="px-3 py-2 text-stone-800 dark:text-stone-100">
                            {s.session_date}
                          </td>
                          <td className="px-3 py-2 text-stone-600 dark:text-stone-300">
                            {s.start_time} - {s.end_time}
                          </td>
                          <td className="px-3 py-2 text-stone-600 dark:text-stone-300">
                            {s.user_first_name} {s.user_last_name}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-500 dark:bg-emerald-500/20">
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

