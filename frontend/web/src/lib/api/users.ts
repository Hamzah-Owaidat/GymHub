import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string | null;
  role?: string;
  role_id: number;
  is_active: boolean;
  created_at: string;
  dob?: string | null;
  phone?: string | null;
  phone_country_code?: string | null;
};

export type UserListResponse = {
  success: boolean;
  data: User[];
  pagination: Pagination;
};

export async function getUsers(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
  role_id?: number;
  is_active?: boolean;
}) {
  const res = await apiClient.get<any>(`${BASE}/users`, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...rest,
    pagination: normalizePagination(pagination),
  } as UserListResponse;
}

export async function getUserById(id: number) {
  const res = await apiClient.get<{ success: boolean; user: User }>(`${BASE}/users/${id}`);
  return res.data;
}

export async function createUser(body: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role_id: number;
  dob?: string;
  phone?: string;
  phone_country_code?: string;
}) {
  const res = await apiClient.post<{ success: boolean; user: User }>(`${BASE}/users`, body);
  return res.data;
}

export async function updateUser(
  id: number,
  body: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    role_id: number;
    is_active: boolean;
    dob: string;
    phone: string;
    phone_country_code: string;
  }>,
) {
  const res = await apiClient.put<{ success: boolean; user: User }>(`${BASE}/users/${id}`, body);
  return res.data;
}

export async function deleteUser(id: number) {
  await apiClient.delete(`${BASE}/users/${id}`);
}

export async function exportUsers(params?: {
  search?: string;
  role_id?: number;
  is_active?: boolean;
}) {
  const res = await apiClient.get<Blob>(`${BASE}/users/export`, {
    params,
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

