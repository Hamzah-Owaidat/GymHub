import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type Role = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  permissions?: { id: number; code: string; name: string }[];
};

export type RoleListResponse = {
  success: boolean;
  data: Role[];
  pagination: Pagination;
};

export async function getRoles(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
}) {
  const res = await apiClient.get<any>(`${BASE}/roles`, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...rest,
    pagination: normalizePagination(pagination),
  } as RoleListResponse;
}

export async function getRoleById(id: number) {
  const res = await apiClient.get<{
    success: boolean;
    role: Role;
    permissions: { id: number; code: string; name: string }[];
  }>(`${BASE}/roles/${id}`);
  return res.data;
}

export async function createRole(body: {
  name: string;
  description?: string;
  permission_ids?: number[];
}) {
  const res = await apiClient.post<{ success: boolean; role: Role; permissions: unknown[] }>(
    `${BASE}/roles`,
    body,
  );
  return res.data;
}

export async function updateRole(id: number, body: {
  name?: string;
  description?: string;
  permission_ids?: number[];
}) {
  const res = await apiClient.put<{ success: boolean; role: Role; permissions: unknown[] }>(
    `${BASE}/roles/${id}`,
    body,
  );
  return res.data;
}

export async function deleteRole(id: number) {
  await apiClient.delete(`${BASE}/roles/${id}`);
}

export async function exportRoles(params?: { search?: string }) {
  const res = await apiClient.get<Blob>(`${BASE}/roles/export`, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roles.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

