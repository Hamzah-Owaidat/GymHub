import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/dashboard";

export type Permission = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type PermissionListResponse = {
  success: boolean;
  data: Permission[];
  pagination: Pagination;
};

export async function getPermissions(params?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
  search?: string;
}) {
  const res = await apiClient.get<any>(`${BASE}/permissions`, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...rest,
    pagination: normalizePagination(pagination),
  } as PermissionListResponse;
}

export async function getPermissionById(id: number) {
  const res = await apiClient.get<{ success: boolean; permission: Permission }>(
    `${BASE}/permissions/${id}`,
  );
  return res.data;
}

export async function createPermission(body: {
  code: string;
  name: string;
  description?: string;
}) {
  const res = await apiClient.post<{ success: boolean; permission: Permission }>(
    `${BASE}/permissions`,
    body,
  );
  return res.data;
}

export async function updatePermission(id: number, body: {
  code?: string;
  name?: string;
  description?: string;
}) {
  const res = await apiClient.put<{ success: boolean; permission: Permission }>(
    `${BASE}/permissions/${id}`,
    body,
  );
  return res.data;
}

export async function deletePermission(id: number) {
  await apiClient.delete(`${BASE}/permissions/${id}`);
}

export async function exportPermissions(params?: { search?: string }) {
  const res = await apiClient.get<Blob>(`${BASE}/permissions/export`, {
    params,
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "permissions.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

