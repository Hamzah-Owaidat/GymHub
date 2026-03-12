import { apiClient } from "../axios";
import { normalizePagination, type Pagination } from "./types";
import type { Session } from "./sessions";

export type UserSessionListResponse = {
  success: boolean;
  data: Session[];
  pagination: Pagination;
};

const BASE = "/api/user";

export async function getUserSessions(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  status?: string;
}) {
  const res = await apiClient.get<any>(`${BASE}/sessions`, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...(rest as Omit<UserSessionListResponse, "pagination">),
    pagination: normalizePagination(pagination),
  } as UserSessionListResponse;
}

export type BookSessionBody = {
  gym_id: number;
  coach_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  payment_method?: "cash" | "card";
  card_last4?: string;
};

export type BookSessionResponse = {
  success: boolean;
  session: Session;
  payment_required: boolean;
  amount_charged: number;
};

export async function bookSession(body: BookSessionBody) {
  const res = await apiClient.post<BookSessionResponse>(`${BASE}/sessions/book`, body);
  return res.data;
}

