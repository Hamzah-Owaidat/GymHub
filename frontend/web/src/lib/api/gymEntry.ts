import { apiClient } from "../axios";

export type EntryQrData = {
  subscription_id: number;
  gym_id: number;
  gym_name: string;
  plan_name: string;
  end_date: string;
  qr_payload: string;
};

export async function getSubscriptionEntryQr(subscriptionId: number) {
  const res = await apiClient.get<{ success: boolean; data: EntryQrData }>(
    `/api/user/subscriptions/${subscriptionId}/entry-qr`,
  );
  return res.data;
}

export type GymEntryVerifyResponse = {
  success: boolean;
  allowed: boolean;
  message: string;
  member?: {
    user_id?: number;
    subscription_id?: number;
    name?: string;
    email?: string;
    gym_id?: number;
    gym_name?: string;
    plan_name?: string;
    end_date?: string;
  };
};

export async function verifyGymEntryQr(code: string) {
  const res = await apiClient.post<GymEntryVerifyResponse>(
    "/api/dashboard/gym-entry/verify",
    { code },
  );
  return res.data;
}
