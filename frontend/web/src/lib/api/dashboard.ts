import { apiClient } from "../axios";

const BASE = "/api/dashboard";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function normalizePagination(raw: any): Pagination {
  const page = Number(raw?.page || 1);
  const limit = Number(raw?.limit || 5);
  const total = Number(raw?.total || 0);
  const pagesFromBackend =
    typeof raw?.totalPages === "number"
      ? raw.totalPages
      : typeof raw?.pages === "number"
      ? raw.pages
      : Math.ceil(total / (limit || 1)) || 0;

  return {
    page,
    limit,
    total,
    totalPages: pagesFromBackend,
  };
}

// Roles
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
  const res = await apiClient.get<{ success: boolean; role: Role; permissions: { id: number; code: string; name: string }[] }>(`${BASE}/roles/${id}`);
  return res.data;
}

export async function createRole(body: { name: string; description?: string; permission_ids?: number[] }) {
  const res = await apiClient.post<{ success: boolean; role: Role; permissions: unknown[] }>(`${BASE}/roles`, body);
  return res.data;
}

export async function updateRole(id: number, body: { name?: string; description?: string; permission_ids?: number[] }) {
  const res = await apiClient.put<{ success: boolean; role: Role; permissions: unknown[] }>(`${BASE}/roles/${id}`, body);
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

// Permissions
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
  const res = await apiClient.get<{ success: boolean; permission: Permission }>(`${BASE}/permissions/${id}`);
  return res.data;
}

export async function createPermission(body: { code: string; name: string; description?: string }) {
  const res = await apiClient.post<{ success: boolean; permission: Permission }>(`${BASE}/permissions`, body);
  return res.data;
}

export async function updatePermission(id: number, body: { code?: string; name?: string; description?: string }) {
  const res = await apiClient.put<{ success: boolean; permission: Permission }>(`${BASE}/permissions/${id}`, body);
  return res.data;
}

export async function deletePermission(id: number) {
  await apiClient.delete(`${BASE}/permissions/${id}`);
}

export async function exportPermissions(params?: { search?: string }) {
  const res = await apiClient.get<Blob>(`${BASE}/permissions/export`, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "permissions.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

// Users
export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
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

export async function updateUser(id: number, body: Partial<{ first_name: string; last_name: string; email: string; role_id: number; is_active: boolean; dob: string; phone: string; phone_country_code: string }>) {
  const res = await apiClient.put<{ success: boolean; user: User }>(`${BASE}/users/${id}`, body);
  return res.data;
}

export async function deleteUser(id: number) {
  await apiClient.delete(`${BASE}/users/${id}`);
}

export async function exportUsers(params?: { search?: string; role_id?: number; is_active?: boolean }) {
  const res = await apiClient.get<Blob>(`${BASE}/users/export`, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

// Gyms
export type Gym = {
  id: number;
  name: string;
  address: string | null;
  description: string | null;
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
  const res = await apiClient.post<{ success: boolean; gym: Gym }>(`${BASE}/gyms`, body);
  return res.data;
}

export async function updateGym(id: number, body: FormData) {
  const res = await apiClient.put<{ success: boolean; gym: Gym }>(`${BASE}/gyms/${id}`, body);
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
