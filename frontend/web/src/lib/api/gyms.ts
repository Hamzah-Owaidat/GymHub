import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type Gym = {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  working_hours: string | null;
  working_days: string | null;
  phone: string | null;
  email: string | null;
  session_price: number | null;
  owner_id: number;
  owner_first_name?: string;
  owner_last_name?: string;
  rating_average: number | null;
  rating_count: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GymListResponse = {
  success: boolean;
  data: Gym[];
  pagination: Pagination;
};

export async function getGyms(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  is_active?: boolean;
}) {
  const res = await apiClient.get<any>(`${BASE}/gyms`, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...rest,
    pagination: normalizePagination(pagination),
  } as GymListResponse;
}

export async function getGymById(id: number) {
  const res = await apiClient.get<{ success: boolean; gym: Gym & { images?: string[]; coach_ids?: number[] } }>(`${BASE}/gyms/${id}`);
  return res.data;
}

export async function createGym(body: FormData) {
  const res = await apiClient.post<{ success: boolean; gym: Gym }>(`${BASE}/gyms`, body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function updateGym(id: number, body: FormData) {
  const res = await apiClient.put<{ success: boolean; gym: Gym }>(`${BASE}/gyms/${id}`, body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteGym(id: number) {
  await apiClient.delete(`${BASE}/gyms/${id}`);
}

export async function exportGyms(params?: { search?: string; is_active?: boolean }) {
  const res = await apiClient.get<Blob>(`${BASE}/gyms/export`, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gyms.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

