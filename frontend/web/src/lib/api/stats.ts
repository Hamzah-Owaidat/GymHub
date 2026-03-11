import { apiClient } from "../axios";

const BASE = "/api/dashboard";

export type OverviewMetrics = {
  totalUsers: number;
  totalGyms: number;
  activeCoaches: number;
  totalSessions: number;
  totalPayments: number;
  totalPlans: number;
  totalRevenue: number;
  activeUsers: number;
};

export type MonthPoint = { month: string; count: number };
export type RevenuePoint = { month: string; revenue: number; count: number };
export type StatusPoint = { status: string; count: number };
export type MethodPoint = { method: string; count: number };
export type TopGym = { name: string; sessionCount: number; revenue: number };

export type RecentPayment = {
  id: number;
  amount: number;
  method: string | null;
  status: string;
  created_at: string;
  user_first_name: string;
  user_last_name: string;
  gym_name: string;
};

export type RecentSession = {
  id: number;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  price: number | null;
  user_first_name: string;
  user_last_name: string;
  gym_name: string;
};

export type OverviewResponse = {
  success: boolean;
  metrics: OverviewMetrics;
  charts: {
    revenueByMonth: RevenuePoint[];
    sessionsByMonth: MonthPoint[];
    sessionsByStatus: StatusPoint[];
    paymentsByMethod: MethodPoint[];
    topGyms: TopGym[];
    userGrowth: MonthPoint[];
  };
  tables: {
    recentPayments: RecentPayment[];
    recentSessions: RecentSession[];
  };
};

export async function getOverviewStats() {
  const res = await apiClient.get<OverviewResponse>(`${BASE}/stats/overview`);
  return res.data;
}
