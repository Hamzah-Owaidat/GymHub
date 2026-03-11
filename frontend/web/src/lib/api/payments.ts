import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type Payment = {
  id: number;
  user_id: number;
  gym_id: number;
  subscription_id: number | null;
  session_id: number | null;
  amount: number;
  method: string | null;
  status: string;
  created_at: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  gym_name?: string;
};

export type PaymentListResponse = {
  success: boolean;
  data: Payment[];
  pagination: Pagination;
};

export async function getPayments(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  gym_id?: number;
  user_id?: number;
  status?: string;
  method?: string;
}) {
  const res = await apiClient.get<any>(`${BASE}/payments`, { params });
  const { pagination, ...rest } = res.data;
  return { ...rest, pagination: normalizePagination(pagination) } as PaymentListResponse;
}

export async function getPaymentById(id: number) {
  const res = await apiClient.get<{ success: boolean; payment: Payment }>(`${BASE}/payments/${id}`);
  return res.data;
}

export async function createPayment(body: {
  user_id: number;
  gym_id: number;
  subscription_id?: number | null;
  session_id?: number | null;
  amount: number;
  method?: string;
  status?: string;
}) {
  const res = await apiClient.post<{ success: boolean; payment: Payment }>(`${BASE}/payments`, body);
  return res.data;
}

export async function updatePayment(
  id: number,
  body: Partial<{
    user_id: number;
    gym_id: number;
    subscription_id: number | null;
    session_id: number | null;
    amount: number;
    method: string;
    status: string;
  }>,
) {
  const res = await apiClient.put<{ success: boolean; payment: Payment }>(`${BASE}/payments/${id}`, body);
  return res.data;
}

export async function deletePayment(id: number) {
  await apiClient.delete(`${BASE}/payments/${id}`);
}

export async function exportPayments(params?: {
  search?: string;
  gym_id?: number;
  status?: string;
  method?: string;
}) {
  const res = await apiClient.get<Blob>(`${BASE}/payments/export`, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "payments.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
