import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type SubscriptionPlan = {
  id: number;
  gym_id: number;
  gym_name?: string;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionPlanListResponse = {
  success: boolean;
  data: SubscriptionPlan[];
  pagination: Pagination;
};

export async function getSubscriptionPlans(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  gym_id?: number;
  is_active?: boolean;
}) {
  const res = await apiClient.get<any>(`${BASE}/subscription-plans`, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...rest,
    pagination: normalizePagination(pagination),
  } as SubscriptionPlanListResponse;
}

export async function getSubscriptionPlanById(id: number) {
  const res = await apiClient.get<{ success: boolean; plan: SubscriptionPlan }>(
    `${BASE}/subscription-plans/${id}`,
  );
  return res.data;
}

export async function createSubscriptionPlan(body: {
  gym_id: number;
  name: string;
  duration_days: number;
  price: number;
  description?: string;
  is_active?: boolean;
}) {
  const res = await apiClient.post<{ success: boolean; plan: SubscriptionPlan }>(
    `${BASE}/subscription-plans`,
    body,
  );
  return res.data;
}

export async function updateSubscriptionPlan(
  id: number,
  body: Partial<{
    gym_id: number;
    name: string;
    duration_days: number;
    price: number;
    description: string;
    is_active: boolean;
  }>,
) {
  const res = await apiClient.put<{ success: boolean; plan: SubscriptionPlan }>(
    `${BASE}/subscription-plans/${id}`,
    body,
  );
  return res.data;
}

export async function deleteSubscriptionPlan(id: number) {
  await apiClient.delete(`${BASE}/subscription-plans/${id}`);
}

export async function exportSubscriptionPlans(params?: {
  search?: string;
  gym_id?: number;
  is_active?: boolean;
}) {
  const res = await apiClient.get<Blob>(`${BASE}/subscription-plans/export`, {
    params,
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "subscription_plans.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

