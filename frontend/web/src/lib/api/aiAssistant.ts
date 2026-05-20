import { apiClient } from "../axios";

export type AiProfile = {
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  gender?: string;
  training_type?: string;
  work_schedule?: string;
  free_time?: string;
  location?: string;
  max_budget?: number;
  goals?: string;
};

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiRecommendations = {
  gym: { name: string; location: string | null; path: string } | null;
  plan: { name: string; price: number; duration_days: number } | null;
  coach: { name: string; specialization: string | null } | null;
  training_plan: string | null;
};

export type AiChatResponse = {
  success: boolean;
  reply: string;
  recommendations: AiRecommendations | null;
};

export async function sendAiAssistantMessage(body: {
  message: string;
  profile?: AiProfile;
  history?: AiChatMessage[];
}) {
  const res = await apiClient.post<AiChatResponse>("/api/user/ai-assistant/chat", body);
  return res.data;
}
