import { apiClient } from "../axios";
import { Pagination, normalizePagination } from "./types";

const BASE = "/api/notifications";

export type Notification = {
  id: number;
  user_id: number;
  title: string | null;
  message: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type NotificationListResponse = {
  success: boolean;
  data: Notification[];
  pagination: Pagination;
  unreadCount: number;
};

export async function getNotifications(params?: { page?: number; limit?: number }) {
  const res = await apiClient.get<any>(BASE, { params });
  const { pagination, ...rest } = res.data;
  return {
    ...rest,
    pagination: normalizePagination(pagination),
  } as NotificationListResponse;
}

export async function markNotificationRead(id: number) {
  const res = await apiClient.post<{ success: boolean; unreadCount: number }>(
    `${BASE}/${id}/read`,
  );
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await apiClient.post<{ success: boolean; unreadCount: number }>(
    `${BASE}/read-all`,
  );
  return res.data;
}

