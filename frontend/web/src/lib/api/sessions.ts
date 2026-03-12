import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type Session = {
  id: number;
  user_id: number;
  gym_id: number;
  coach_id: number | null;
  session_date: string;
  start_time: string;
  end_time: string;
  price: number | null;
  status: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  gym_name?: string;
  coach_first_name?: string;
  coach_last_name?: string;
};

export type SessionListResponse = {
  success: boolean;
  data: Session[];
  pagination: Pagination;
};

export async function getSessions(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  gym_id?: number;
  coach_id?: number;
  user_id?: number;
  status?: string;
}) {
  const res = await apiClient.get<any>(`${BASE}/sessions`, { params });
  const { pagination, ...rest } = res.data;
  return { ...rest, pagination: normalizePagination(pagination) } as SessionListResponse;
}

export async function getSessionById(id: number) {
  const res = await apiClient.get<{ success: boolean; session: Session }>(`${BASE}/sessions/${id}`);
  return res.data;
}

export async function getMySessions(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  status?: string;
}) {
  const res = await apiClient.get<any>(`${BASE}/coach/sessions`, { params });
  const { pagination, ...rest } = res.data;
  return { ...rest, pagination: normalizePagination(pagination) } as SessionListResponse;
}

export async function createSession(body: {
  user_id: number;
  gym_id: number;
  coach_id?: number | null;
  session_date: string;
  start_time: string;
  end_time: string;
  price?: number | null;
  status?: string;
  is_private?: boolean;
}) {
  const res = await apiClient.post<{ success: boolean; session: Session }>(`${BASE}/sessions`, body);
  return res.data;
}

export async function updateSession(
  id: number,
  body: Partial<{
    user_id: number;
    gym_id: number;
    coach_id: number | null;
    session_date: string;
    start_time: string;
    end_time: string;
    price: number | null;
    status: string;
    is_private: boolean;
  }>,
) {
  const res = await apiClient.put<{ success: boolean; session: Session }>(`${BASE}/sessions/${id}`, body);
  return res.data;
}

export async function deleteSession(id: number) {
  await apiClient.delete(`${BASE}/sessions/${id}`);
}

export async function exportSessions(params?: {
  search?: string;
  gym_id?: number;
  status?: string;
}) {
  const res = await apiClient.get<Blob>(`${BASE}/sessions/export`, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sessions.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
