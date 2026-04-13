"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/context/ToastContext";
import {
  getChatConversations,
  getChatMessages,
  markChatRead,
  sendChatMessage,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/api/userChats";
import { getPusherClient } from "@/lib/pusher";

const CHAT_EVENT = "chat.message.created";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

function formatDateTime(value: string | null) {
  if (!value) return "No messages yet";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function ChatInbox({ compact = false }: { compact?: boolean }) {
  const { user } = useAuthStore();
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🔥", "🎉", "💪", "😎", "🤝"];

  const resolveAttachmentUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.session_id === selectedSessionId) || null,
    [conversations, selectedSessionId],
  );

  const loadConversations = async () => {
    const res = await getChatConversations();
    setConversations(res.data || []);
    if (!selectedSessionId && res.data?.length) {
      setSelectedSessionId(res.data[0].session_id);
    }
  };

  const loadMessages = async (sessionId: number) => {
    const res = await getChatMessages(sessionId);
    setMessages(res.data || []);
    await markChatRead(sessionId);
    setConversations((prev) =>
      prev.map((c) => (c.session_id === sessionId ? { ...c, unread_count: 0 } : c)),
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getChatConversations();
        if (cancelled) return;
        setConversations(res.data || []);
        if (res.data?.length) {
          const firstId = res.data[0].session_id;
          setSelectedSessionId(firstId);
          const messagesRes = await getChatMessages(firstId);
          if (cancelled) return;
          setMessages(messagesRes.data || []);
          await markChatRead(firstId);
        }
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "Failed to load chats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showError]);

  useEffect(() => {
    if (!user?.id) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channelName = `chat-user-${user.id}`;
    const channel = pusher.subscribe(channelName);
    const handler = async (payload: { session_id: number }) => {
      await loadConversations();
      if (selectedSessionId && Number(payload.session_id) === Number(selectedSessionId)) {
        await loadMessages(selectedSessionId);
      }
    };
    channel.bind(CHAT_EVENT, handler);
    return () => {
      channel.unbind(CHAT_EVENT, handler);
      pusher.unsubscribe(channelName);
    };
  }, [user?.id, selectedSessionId]);

  const onSelectConversation = async (sessionId: number) => {
    setSelectedSessionId(sessionId);
    try {
      await loadMessages(sessionId);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load messages");
    }
  };

  const onSend = async () => {
    if (!selectedSessionId) return;
    const text = messageText.trim();
    if (!text && !attachmentFile) return;
    setSending(true);
    try {
      await sendChatMessage(selectedSessionId, { message: text, attachment: attachmentFile });
      setMessageText("");
      setAttachmentFile(null);
      setEmojiOpen(false);
      await loadMessages(selectedSessionId);
      await loadConversations();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${compact ? "" : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"}`}>
      <div className="rounded-2xl border border-stone-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h1 className="text-lg font-bold text-stone-900 dark:text-white">Chats</h1>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Message the coach/user for sessions you booked together.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-stone-500">Loading chats...</div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-sm text-stone-500">No chats yet. Book a session to start chatting.</div>
        ) : (
          <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[320px_1fr]">
            <aside className="border-r border-stone-200 dark:border-stone-800">
              <ul className="max-h-[520px] overflow-auto">
                {conversations.map((c) => {
                  const active = c.session_id === selectedSessionId;
                  return (
                    <li key={c.session_id}>
                      <button
                        type="button"
                        onClick={() => onSelectConversation(c.session_id)}
                        className={`w-full border-b border-stone-100 px-4 py-3 text-left transition dark:border-stone-800 ${
                          active
                            ? "bg-brand-50 dark:bg-brand-950/30"
                            : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">
                              {c.participant.first_name} {c.participant.last_name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                              Session #{c.session_id} - {c.session_date}
                            </p>
                            <p className="mt-1 truncate text-xs text-stone-600 dark:text-stone-300">
                              {c.last_message || "No messages yet"}
                            </p>
                          </div>
                          {c.unread_count > 0 && (
                            <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className="flex min-h-[520px] flex-col">
              <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-800">
                {selectedConversation ? (
                  <>
                    <p className="text-sm font-semibold text-stone-900 dark:text-white">
                      {selectedConversation.participant.first_name} {selectedConversation.participant.last_name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Session #{selectedConversation.session_id} - {selectedConversation.session_date}{" "}
                      {selectedConversation.start_time} to {selectedConversation.end_time}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-stone-500">Select a conversation</p>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-auto p-4">
                {messages.map((m) => {
                  const mine = Number(m.sender_user_id) === Number(user?.id);
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mine
                            ? "bg-brand-500 text-white"
                            : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                        }`}
                      >
                        {m.message ? <p className="whitespace-pre-wrap break-words">{m.message}</p> : null}
                        {m.attachment_url && (
                          <div className="mt-2">
                            {(m.attachment_mime || "").startsWith("image/") ? (
                              <img
                                src={resolveAttachmentUrl(m.attachment_url)}
                                alt={m.attachment_name || "attachment"}
                                className="max-h-56 rounded-lg border border-white/20 object-contain"
                              />
                            ) : (m.attachment_mime || "").startsWith("video/") ? (
                              <video
                                controls
                                src={resolveAttachmentUrl(m.attachment_url)}
                                className="max-h-56 rounded-lg border border-white/20"
                              />
                            ) : (
                              <a
                                href={resolveAttachmentUrl(m.attachment_url)}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs underline ${
                                  mine ? "bg-white/15 text-white" : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-100"
                                }`}
                              >
                                {m.attachment_name || "Open attachment"}
                              </a>
                            )}
                          </div>
                        )}
                        <p className={`mt-1 text-[10px] ${mine ? "text-white/80" : "text-stone-500"}`}>
                          {formatDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-stone-200 p-3 dark:border-stone-800">
                {!!attachmentFile && (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-800">
                    <span className="truncate text-stone-700 dark:text-stone-200">
                      Attachment: {attachmentFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachmentFile(null)}
                      className="ml-2 rounded px-1 text-stone-500 hover:text-red-500"
                    >
                      x
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((v) => !v)}
                    className="h-10 w-10 rounded-xl border border-stone-200 text-lg dark:border-stone-700"
                    title="Add emoji"
                  >
                    🙂
                  </button>
                  <label
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-stone-200 text-sm dark:border-stone-700"
                    title="Attach file"
                  >
                    📎
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    placeholder="Write a message..."
                    className="h-10 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={sending || !selectedSessionId || (!messageText.trim() && !attachmentFile)}
                    className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
                {emojiOpen && (
                  <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-900">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="rounded px-2 py-1 text-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        onClick={() => setMessageText((prev) => `${prev}${emoji}`)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
