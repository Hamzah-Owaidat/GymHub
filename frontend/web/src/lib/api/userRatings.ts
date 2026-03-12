import { apiClient } from "../axios";

const BASE = "/api/user";

export type GymRating = {
  id: number;
  user_id: number;
  gym_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  first_name?: string;
  last_name?: string;
};

export async function rateGym(gymId: number, body: { rating: number; comment?: string }) {
  const res = await apiClient.post<{
    success: boolean;
    rating_average: number;
    rating_count: number;
  }>(`${BASE}/gyms/${gymId}/rate`, body);
  return res.data;
}

export async function getMyGymRating(gymId: number) {
  const res = await apiClient.get<{ success: boolean; rating: GymRating | null }>(
    `${BASE}/gyms/${gymId}/my-rating`,
  );
  return res.data;
}

export async function getGymRatings(gymId: number, params?: { page?: number; limit?: number }) {
  const res = await apiClient.get<any>(`${BASE}/gyms/${gymId}/ratings`, { params });
  return res.data;
}
