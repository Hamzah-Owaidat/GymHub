import { apiClient } from "../axios";

const BASE = "/api/user";

export type ChatConversation = {
  session_id: number;
  session_date: string;
  start_time: string;
  end_time: string;
  session_status: string;
  participant: {
    id: number;
    first_name: string;
    last_name: string;
    role: "user" | "coach";
  };
  last_message: string | null;
  last_message_sender_user_id: number | null;
  last_message_at: string | null;
  unread_count: number;
};

export type ChatMessage = {
  id: number;
  session_id: number;
  sender_user_id: number;
  message_type?: "text" | "attachment";
  message: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  is_read: boolean | number;
  created_at: string;
};

export async function getChatConversations() {
  const res = await apiClient.get<{ success: boolean; data: ChatConversation[] }>(
    `${BASE}/chats`,
  );
  return res.data;
}

export async function getChatMessages(sessionId: number) {
  const res = await apiClient.get<{
    success: boolean;
    session: { id: number; status: string };
    participant: { id: number; first_name: string; last_name: string; role: "user" | "coach" };
    data: ChatMessage[];
  }>(`${BASE}/chats/${sessionId}/messages`);
  return res.data;
}

export async function sendChatMessage(
  sessionId: number,
  payload: { message?: string; attachment?: File | null },
) {
  const form = new FormData();
  if (payload.message && payload.message.trim()) form.append("message", payload.message.trim());
  if (payload.attachment) form.append("attachment", payload.attachment);
  const res = await apiClient.post<{ success: boolean; message: ChatMessage }>(
    `${BASE}/chats/${sessionId}/messages`,
    form,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return res.data;
}

export async function markChatRead(sessionId: number) {
  const res = await apiClient.post<{ success: boolean; updated: number }>(
    `${BASE}/chats/${sessionId}/read`,
  );
  return res.data;
}
