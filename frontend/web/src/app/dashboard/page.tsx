"use client";

import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  getOverviewStats,
  type OverviewMetrics,
  type RevenuePoint,
  type MonthPoint,
  type StatusPoint,
  type MethodPoint,
  type TopGym,
  type RecentPayment,
  type RecentSession,
} from "@/lib/api/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
);

const BRAND = "#f97316";
const BRAND_LIGHT = "#fb923c";
const BRAND_BG = "rgba(249,115,22,0.12)";
const EMERALD = "#10b981";
const EMERALD_BG = "rgba(16,185,129,0.12)";
const BLUE = "#3b82f6";
const BLUE_BG = "rgba(59,130,246,0.12)";
const ROSE = "#f43f5e";
const AMBER = "#f59e0b";
const VIOLET = "#8b5cf6";
const STONE_200 = "#d6d3d1";
const STONE_400 = "#a8a29e";
const STONE_700 = "#44403c";

function shortMonth(ym: string) {
  const [y, m] = ym.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${y.slice(2)}`;
}

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  booked: BLUE,
  completed: EMERALD,
  cancelled: ROSE,
  pending: AMBER,
  paid: EMERALD,
  failed: ROSE,
};

const STATUS_BG: Record<string, string> = {
  booked: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  cancelled: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  pending: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  paid: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  failed: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

function MetricCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: accent + "18" }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">{value}</p>
        <p className="truncate text-xs text-stone-500 dark:text-stone-400">{label}</p>
      </div>
    </div>
  );
}

const chartGridColor = (dark: boolean) => dark ? "rgba(120,113,108,0.18)" : "rgba(214,211,209,0.6)";
const chartTickColor = (dark: boolean) => dark ? STONE_400 : STONE_700;

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenuePoint[]>([]);
  const [sessionsByMonth, setSessionsByMonth] = useState<MonthPoint[]>([]);
  const [sessionsByStatus, setSessionsByStatus] = useState<StatusPoint[]>([]);
  const [paymentsByMethod, setPaymentsByMethod] = useState<MethodPoint[]>([]);
  const [topGyms, setTopGyms] = useState<TopGym[]>([]);
  const [userGrowth, setUserGrowth] = useState<MonthPoint[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await getOverviewStats();
        setMetrics(res.metrics);
        setRevenueByMonth(res.charts.revenueByMonth);
        setSessionsByMonth(res.charts.sessionsByMonth);
        setSessionsByStatus(res.charts.sessionsByStatus);
        setPaymentsByMethod(res.charts.paymentsByMethod);
        setTopGyms(res.charts.topGyms);
        setUserGrowth(res.charts.userGrowth);
        setRecentPayments(res.tables.recentPayments);
        setRecentSessions(res.tables.recentSessions);
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-brand-500" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-stone-500">
        Failed to load statistics.
      </div>
    );
  }

  const baseLineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: chartGridColor(dark) }, ticks: { color: chartTickColor(dark), font: { size: 11 } } },
      y: { grid: { color: chartGridColor(dark) }, ticks: { color: chartTickColor(dark), font: { size: 11 } }, beginAtZero: true },
    },
  } as const;

  const revenueChartData = {
    labels: revenueByMonth.map((r) => shortMonth(r.month)),
    datasets: [
      {
        label: "Revenue",
        data: revenueByMonth.map((r) => r.revenue),
        borderColor: BRAND,
        backgroundColor: BRAND_BG,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: BRAND,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const sessionsChartData = {
    labels: sessionsByMonth.map((r) => shortMonth(r.month)),
    datasets: [
      {
        label: "Sessions",
        data: sessionsByMonth.map((r) => r.count),
        borderColor: EMERALD,
        backgroundColor: EMERALD_BG,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: EMERALD,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const userGrowthData = {
    labels: userGrowth.map((r) => shortMonth(r.month)),
    datasets: [
      {
        label: "New Users",
        data: userGrowth.map((r) => r.count),
        borderColor: BLUE,
        backgroundColor: BLUE_BG,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: BLUE,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const sessionStatusData = {
    labels: sessionsByStatus.map((s) => s.status.charAt(0).toUpperCase() + s.status.slice(1)),
    datasets: [
      {
        data: sessionsByStatus.map((s) => s.count),
        backgroundColor: sessionsByStatus.map((s) => STATUS_COLORS[s.status] || STONE_400),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const paymentMethodData = {
    labels: paymentsByMethod.map((p) => p.method.charAt(0).toUpperCase() + p.method.slice(1)),
    datasets: [
      {
        data: paymentsByMethod.map((p) => p.count),
        backgroundColor: [BRAND, EMERALD, BLUE, VIOLET, AMBER, ROSE],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const topGymsData = {
    labels: topGyms.map((g) => g.name.length > 16 ? g.name.slice(0, 14) + "..." : g.name),
    datasets: [
      {
        label: "Sessions",
        data: topGyms.map((g) => g.sessionCount),
        backgroundColor: BRAND,
        borderRadius: 8,
        barThickness: 28,
      },
      {
        label: "Revenue ($)",
        data: topGyms.map((g) => g.revenue),
        backgroundColor: EMERALD,
        borderRadius: 8,
        barThickness: 28,
      },
    ],
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: chartTickColor(dark), boxWidth: 12, padding: 16, font: { size: 12 } },
      },
    },
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: chartTickColor(dark), boxWidth: 12, padding: 16, font: { size: 12 } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: chartTickColor(dark), font: { size: 11 } } },
      y: { grid: { color: chartGridColor(dark) }, ticks: { color: chartTickColor(dark), font: { size: 11 } }, beginAtZero: true },
    },
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          accent={BRAND}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M7.5 6.5C7.5 8.981 9.519 11 12 11s4.5-2.019 4.5-4.5S14.481 2 12 2 7.5 4.019 7.5 6.5zM20 21h1v-1c0-3.859-3.141-7-7-7h-4c-3.86 0-7 3.141-7 7v1h17z"/></svg>}
        />
        <MetricCard
          label="Active Gyms"
          value={metrics.totalGyms.toLocaleString()}
          accent={EMERALD}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg>}
        />
        <MetricCard
          label="Active Coaches"
          value={metrics.activeCoaches.toLocaleString()}
          accent={BLUE}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>}
        />
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          accent={BRAND}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Sessions"
          value={metrics.totalSessions.toLocaleString()}
          accent={VIOLET}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>}
        />
        <MetricCard
          label="Total Payments"
          value={metrics.totalPayments.toLocaleString()}
          accent={ROSE}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.11-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>}
        />
        <MetricCard
          label="Subscription Plans"
          value={metrics.totalPlans.toLocaleString()}
          accent={AMBER}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-2 .89-2 2v11c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>}
        />
        <MetricCard
          label="Active Users"
          value={metrics.activeUsers.toLocaleString()}
          accent={EMERALD}
          icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>}
        />
      </div>

      {/* Revenue & Sessions Line Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-50">Revenue (Last 12 Months)</h3>
          <div className="h-[280px]">
            <Line data={revenueChartData} options={baseLineOpts} />
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-50">Sessions (Last 12 Months)</h3>
          <div className="h-[280px]">
            <Line data={sessionsChartData} options={baseLineOpts} />
          </div>
        </div>
      </div>

      {/* User Growth + Session Status + Payment Methods */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-50">User Growth</h3>
          <div className="h-[250px]">
            <Line data={userGrowthData} options={baseLineOpts} />
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-50">Sessions by Status</h3>
          <div className="h-[250px]">
            <Doughnut data={sessionStatusData} options={doughnutOpts} />
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-50">Payment Methods</h3>
          <div className="h-[250px]">
            <Doughnut data={paymentMethodData} options={doughnutOpts} />
          </div>
        </div>
      </div>

      {/* Top Gyms Bar Chart */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
        <h3 className="mb-4 text-sm font-semibold text-stone-900 dark:text-stone-50">Top Gyms (Sessions & Revenue)</h3>
        <div className="h-[300px]">
          <Bar data={topGymsData} options={barOpts} />
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Recent Sessions */}
        <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-700">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Recent Sessions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 dark:border-stone-700 dark:bg-stone-700/50">
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">User</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Gym</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Date</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Time</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s.id} className="border-b border-stone-50 last:border-0 dark:border-stone-700/50">
                    <td className="px-4 py-2.5 font-medium text-stone-800 dark:text-stone-100">{s.user_first_name} {s.user_last_name}</td>
                    <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">{s.gym_name}</td>
                    <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">{formatDate(s.session_date)}</td>
                    <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                      {s.start_time ? s.start_time.slice(0, 5) : "—"}{s.end_time ? ` - ${s.end_time.slice(0, 5)}` : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BG[s.status] || "bg-stone-100 text-stone-600"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentSessions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-stone-400">No sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-700">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Recent Payments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 dark:border-stone-700 dark:bg-stone-700/50">
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">User</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Gym</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Amount</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Method</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id} className="border-b border-stone-50 last:border-0 dark:border-stone-700/50">
                    <td className="px-4 py-2.5 font-medium text-stone-800 dark:text-stone-100">{p.user_first_name} {p.user_last_name}</td>
                    <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">{p.gym_name}</td>
                    <td className="px-4 py-2.5 font-medium text-stone-900 dark:text-stone-50">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-2.5 capitalize text-stone-600 dark:text-stone-300">{p.method || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BG[p.status] || "bg-stone-100 text-stone-600"}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentPayments.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-stone-400">No payments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
