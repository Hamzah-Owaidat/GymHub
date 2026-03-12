"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastContext";
import {
  getUserSessions,
  type UserSessionListResponse,
} from "@/lib/api/userSessions";

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  booked: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 border-blue-200/60 dark:bg-blue-950/30 dark:border-blue-800/40",
    label: "Booked",
  },
  completed: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800/40",
    label: "Completed",
  },
  cancelled: {
    color: "text-red-500 dark:text-red-400",
    bg: "bg-red-50 border-red-200/60 dark:bg-red-950/30 dark:border-red-800/40",
    label: "Cancelled",
  },
};

const FALLBACK_META = {
  color: "text-stone-600 dark:text-stone-300",
  bg: "bg-stone-50 border-stone-200 dark:bg-stone-800 dark:border-stone-700",
  label: "Unknown",
};

const DOT_COLORS: Record<string, string> = {
  booked: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

type DayColumn = { date: string; label: string; dayNum: string; dayName: string; isToday: boolean };

function buildWeek(start: Date): DayColumn[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days: DayColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    days.push({
      date: dateStr,
      label: `${weekday[d.getDay()]} ${dd}/${mm}`,
      dayNum: dd,
      dayName: weekday[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }
  return days;
}

function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export default function SessionsPage() {
  const { error: showError } = useToast();
  const [data, setData] = useState<UserSessionListResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getUserSessions({
          page: 1,
          limit: 200,
          sortBy: "session_date",
          sortDir: "asc",
          status: statusFilter || undefined,
        });
        setData(res.data);
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    })();
  }, [statusFilter, showError]);

  const days = useMemo(() => buildWeek(weekStart), [weekStart]);

  const sessionsByDate: Record<string, typeof data> = {};
  data.forEach((s) => {
    const day = s.session_date.slice(0, 10);
    if (!sessionsByDate[day]) sessionsByDate[day] = [];
    sessionsByDate[day].push(s);
  });

  const moveWeek = (delta: number) =>
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });

  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${weekStart.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
  })();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
            Calendar
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl dark:text-white">
            My Sessions
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Weekly view of your booked, completed, and cancelled sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            <option value="">All statuses</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white px-3 py-1.5 dark:border-stone-800 dark:bg-stone-900">
            {Object.entries(DOT_COLORS).map(([status, dotColor]) => (
              <span
                key={status}
                className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400"
              >
                <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="mt-8">
          {/* Week navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveWeek(-1)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              Previous
            </button>

            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                {weekLabel}
              </span>
              <button
                type="button"
                onClick={() => setWeekStart(getMonday(new Date()))}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600 transition hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-400"
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={() => moveWeek(1)}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Next
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          {/* Calendar grid */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-white dark:border-stone-800 dark:bg-stone-900">
            <div className="grid min-w-[720px] grid-cols-7">
              {/* Day headers */}
              {days.map((day) => (
                <div
                  key={day.date}
                  className={`flex flex-col items-center border-b border-r border-stone-100 px-2 py-3 last:border-r-0 dark:border-stone-800 ${
                    day.isToday ? "bg-brand-50/50 dark:bg-brand-950/20" : ""
                  }`}
                >
                  <span className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
                    {day.dayName}
                  </span>
                  <span
                    className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      day.isToday
                        ? "bg-brand-500 text-white"
                        : "text-stone-800 dark:text-stone-200"
                    }`}
                  >
                    {day.dayNum}
                  </span>
                </div>
              ))}

              {/* Day columns with sessions */}
              {days.map((day) => {
                const sessions = sessionsByDate[day.date] || [];
                return (
                  <div
                    key={`col-${day.date}`}
                    className={`min-h-[180px] border-r border-stone-100 p-2 last:border-r-0 dark:border-stone-800 ${
                      day.isToday ? "bg-brand-50/30 dark:bg-brand-950/10" : ""
                    }`}
                  >
                    {sessions.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-[11px] text-stone-300 dark:text-stone-700">
                          —
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {sessions.map((s) => {
                          const meta = STATUS_META[s.status] || FALLBACK_META;
                          return (
                            <div
                              key={s.id}
                              className={`rounded-lg border p-2 text-[11px] ${meta.bg}`}
                            >
                              <p className={`font-semibold ${meta.color}`}>
                                {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                              </p>
                              <p className="mt-0.5 truncate text-stone-600 dark:text-stone-300">
                                {s.gym_name}
                              </p>
                              <p className="truncate text-stone-400 dark:text-stone-500">
                                {s.coach_first_name && s.coach_last_name
                                  ? `${s.coach_first_name} ${s.coach_last_name}`
                                  : "No coach"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
