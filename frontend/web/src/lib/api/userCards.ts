import { apiClient } from "../axios";

export type SavedCard = {
  id: number;
  user_id: number;
  card_label: string;
  card_holder: string;
  card_last4: string;
  card_brand: string;
  card_expiry: string;
  is_default: boolean;
  created_at: string;
};

export type CardListResponse = {
  success: boolean;
  data: SavedCard[];
  max: number;
};

const BASE = "/api/user";

export async function getUserCards() {
  const res = await apiClient.get<CardListResponse>(`${BASE}/cards`);
  return res.data;
}

export async function createUserCard(body: {
  card_label?: string;
  card_holder: string;
  card_number: string;
  card_expiry: string;
  is_default?: boolean;
}) {
  const res = await apiClient.post<{ success: boolean; card: SavedCard }>(`${BASE}/cards`, body);
  return res.data;
}

export async function setDefaultCard(id: number) {
  const res = await apiClient.patch<{ success: boolean }>(`${BASE}/cards/${id}/default`);
  return res.data;
}

export async function deleteUserCard(id: number) {
  const res = await apiClient.delete<{ success: boolean }>(`${BASE}/cards/${id}`);
  return res.data;
}
