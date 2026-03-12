import { apiClient } from "../axios";
import type { Pagination } from "./types";

export type PublicGym = {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  working_hours: string | null;
  working_days: string | null;
  phone: string | null;
  email: string | null;
  rating_average: number | null;
  rating_count: number | null;
  is_active: boolean;
  images?: { id: number; image_url: string }[];
};

export type PublicGymListResponse = {
  success: boolean;
  data: PublicGym[];
  pagination: Pagination;
};

export type GymDetailsResponse = {
  success: boolean;
  gym: PublicGym & { session_price?: number | null };
  images: { id: number; image_url: string }[];
  plans: {
    id: number;
    gym_id: number;
    gym_name: string;
    name: string;
    duration_days: number;
    price: number;
    description: string | null;
  }[];
  coaches: any[];
  activeSubscription?: { id: number; plan_id: number; start_date: string; end_date: string; status: string } | null;
  userRating?: { id: number; rating: number; comment: string | null } | null;
};

const BASE = "/api/user";

export async function getPublicGyms(params?: { page?: number; limit?: number; search?: string }) {
  const res = await apiClient.get<any>(`${BASE}/gyms`, { params });
  const { pagination, ...rest } = res.data;
  return { ...(rest as Omit<PublicGymListResponse, "pagination">), pagination } as PublicGymListResponse;
}

export async function getGymDetails(id: number) {
  const res = await apiClient.get<GymDetailsResponse>(`${BASE}/gyms/${id}`);
  return res.data;
}

