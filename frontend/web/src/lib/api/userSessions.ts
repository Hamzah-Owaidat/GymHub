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

export type CoachDateAvailabilityResponse = {
  success: boolean;
  coach_id: number;
  gym_id: number;
  date: string;
  day: string;
  slot_windows: { start_time: string; end_time: string; is_private: boolean }[];
  busy_windows: { start_time: string; end_time: string }[];
  available_windows: { start_time: string; end_time: string }[];
  suggested_slots: { start_time: string; end_time: string; duration_minutes: number }[];
};

export async function getCoachDateAvailability(
  coachId: number,
  params: { gym_id: number; date: string },
) {
  const res = await apiClient.get<CoachDateAvailabilityResponse>(
    `${BASE}/coaches/${coachId}/availability`,
    { params },
  );
  return res.data;
}

export async function bookSession(body: BookSessionBody) {
  const res = await apiClient.post<BookSessionResponse>(`${BASE}/sessions/book`, body);
  return res.data;
}

