import { apiClient } from "../axios";

export type UserSubscription = {
  id: number;
  user_id: number;
  gym_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  status: string;
  gym_name: string;
  plan_name: string;
  plan_price: number;
  duration_days: number;
};

export type UserSubscriptionListResponse = {
  success: boolean;
  data: UserSubscription[];
};

const BASE = "/api/user";

export async function getUserSubscriptions() {
  const res = await apiClient.get<UserSubscriptionListResponse>(`${BASE}/subscriptions`);
  return res.data;
}

export async function createUserSubscription(body: {
  plan_id: number;
  payment_method: "cash" | "card";
  card_last4?: string;
}) {
  const res = await apiClient.post<{ success: boolean; subscriptions: UserSubscription[] }>(
    `${BASE}/subscriptions`,
    body,
  );
  return res.data;
}

