import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type CoachAvailability = {
  id?: number;
  coach_id?: number;
  day: string;
  start_time: string | null;
  end_time: string | null;
  slot_mode?: "private_only" | "public_only" | "both";
  is_private?: boolean;
};

export type Coach = {
  id: number;
  user_id: number;
  gym_id: number;
  specialization: string | null;
  bio: string | null;
  price_per_session: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
  gym_name?: string;
  availability?: CoachAvailability[];
};

export type CoachListResponse = {
  success: boolean;
  data: Coach[];
  pagination: Pagination;
};

export async function getCoaches(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  gym_id?: number;
  is_active?: boolean;
}) {
  const res = await apiClient.get<any>(`${BASE}/coaches`, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...rest,
    pagination: normalizePagination(pagination),
  } as CoachListResponse;
}

export async function getCoachById(id: number) {
  const res = await apiClient.get<{ success: boolean; coach: Coach }>(`${BASE}/coaches/${id}`);
  return res.data;
}

export async function createCoach(body: {
  user_id: number;
  gym_id: number;
  specialization?: string;
  bio?: string;
  price_per_session?: number;
  is_active?: boolean;
  availability?: { day: string; start_time: string | null; end_time: string | null; slot_mode?: "private_only" | "public_only" | "both"; is_private?: boolean }[];
}) {
  const res = await apiClient.post<{ success: boolean; coach: Coach }>(`${BASE}/coaches`, body);
  return res.data;
}

export async function updateCoach(
  id: number,
  body: Partial<{
    user_id: number;
    gym_id: number;
    specialization: string;
    bio: string;
    price_per_session: number;
    is_active: boolean;
    availability: { day: string; start_time: string | null; end_time: string | null; slot_mode?: "private_only" | "public_only" | "both"; is_private?: boolean }[];
  }>,
) {
  const res = await apiClient.put<{ success: boolean; coach: Coach }>(`${BASE}/coaches/${id}`, body);
  return res.data;
}

export async function deleteCoach(id: number) {
  await apiClient.delete(`${BASE}/coaches/${id}`);
}

export type CoachUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
};

export async function getCoachUsers() {
  const res = await apiClient.get<{ success: boolean; data: CoachUser[] }>(`${BASE}/coach-users`);
  return res.data;
}

export async function exportCoaches(params?: {
  search?: string;
  gym_id?: number;
  is_active?: boolean;
}) {
  const res = await apiClient.get<Blob>(`${BASE}/coaches/export`, {
    params,
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "coaches.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export async function getMyCoachProfile() {
  const res = await apiClient.get<{ success: boolean; coach: Coach }>(`${BASE}/coach/me`);
  return res.data;
}

export async function updateMyAvailability(slots: { day: string; start_time: string | null; end_time: string | null; slot_mode?: "private_only" | "public_only" | "both"; is_private?: boolean }[]) {
  const res = await apiClient.put<{ success: boolean; availability: CoachAvailability[] }>(
    `${BASE}/coach/availability`,
    { availability: slots },
  );
  return res.data;
}

