"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  sendAiAssistantMessage,
  type AiChatMessage,
  type AiProfile,
  type AiRecommendations,
} from "@/lib/api/aiAssistant";
import { loadAiProfile, saveAiProfile } from "@/lib/aiProfileStorage";

const TRAINING_TYPES = [
  { value: "", label: "Training type" },
  { value: "bodybuilding", label: "Bodybuilding" },
  { value: "calisthenics", label: "Calisthenics" },
  { value: "cardio", label: "Cardio" },
  { value: "crossfit", label: "CrossFit" },
  { value: "yoga", label: "Yoga" },
  { value: "general_fitness", label: "General fitness" },
  { value: "weight_loss", label: "Weight loss" },
  { value: "strength", label: "Strength" },
];

const GENDERS = [
  { value: "", label: "Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const FREE_TIME = [
  { value: "", label: "Free time to train" },
  { value: "early_morning", label: "Early morning" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "weekends", label: "Weekends" },
  { value: "flexible", label: "Flexible" },
];

type ChatEntry = AiChatMessage & { recommendations?: AiRecommendations | null };

function buildProfilePayload(form: AiProfile): AiProfile | undefined {
  const p: AiProfile = {};
  if (form.age) p.age = Number(form.age);
  if (form.weight_kg) p.weight_kg = Number(form.weight_kg);
  if (form.height_cm) p.height_cm = Number(form.height_cm);
  if (form.gender) p.gender = form.gender;
  if (form.training_type) p.training_type = form.training_type;
  if (form.work_schedule?.trim()) p.work_schedule = form.work_schedule.trim();
  if (form.free_time) p.free_time = form.free_time;
  if (form.location?.trim()) p.location = form.location.trim();
  if (form.max_budget != null && form.max_budget !== ("" as unknown as number)) {
    p.max_budget = Number(form.max_budget);
  }
  if (form.goals?.trim()) p.goals = form.goals.trim();
  return Object.keys(p).length ? p : undefined;
}

export default function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [profile, setProfile] = useState<AiProfile>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your GymHub fitness assistant. Fill in your profile (optional) and ask me to pick the best gym, coach, plan, or build a weekly training plan for you.",
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const profileHydrated = useRef(false);

  useEffect(() => {
    const saved = loadAiProfile();
    if (saved) setProfile(saved);
    profileHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!profileHydrated.current) return;
    saveAiProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError(null);
    const userMsg: ChatEntry = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.filter((m) => m.role === "user" || m.role === "assistant");
      const res = await sendAiAssistantMessage({
        message: text,
        profile: buildProfilePayload(profile),
        history,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          recommendations: res.recommendations,
        },
      ]);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : e instanceof Error
            ? e.message
            : "Something went wrong";
      setError(msg || "Failed to get a response");
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, profile]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open fitness assistant"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-emerald-600 text-white shadow-lg shadow-brand-500/30 transition hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 dark:focus:ring-offset-stone-950"
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-stone-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">Fit Assistant</h2>
                <p className="text-xs text-stone-500">Powered by AI · picks from real GymHub data</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowProfile((v) => !v)}
              className="flex items-center justify-between border-b border-stone-100 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-brand-600 dark:border-stone-800"
            >
              Your profile {showProfile ? "▲" : "▼"}
            </button>

            {showProfile && (
              <div className="grid max-h-48 gap-2 overflow-y-auto border-b border-stone-100 px-4 py-3 dark:border-stone-800 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="Age"
                  min={13}
                  max={100}
                  value={profile.age ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value ? Number(e.target.value) : undefined }))}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                />
                <input
                  type="number"
                  placeholder="Weight (kg)"
                  min={30}
                  max={300}
                  value={profile.weight_kg ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, weight_kg: e.target.value ? Number(e.target.value) : undefined }))
                  }
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                />
                <input
                  type="number"
                  placeholder="Height (cm)"
                  min={100}
                  max={250}
                  value={profile.height_cm ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, height_cm: e.target.value ? Number(e.target.value) : undefined }))
                  }
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 sm:col-span-2"
                />
                <select
                  value={profile.gender ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value || undefined }))}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                >
                  {GENDERS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={profile.training_type ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, training_type: e.target.value || undefined }))}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                >
                  {TRAINING_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  value={profile.free_time ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, free_time: e.target.value || undefined }))}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 sm:col-span-2"
                >
                  {FREE_TIME.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Work schedule (e.g. 9–5 office)"
                  value={profile.work_schedule ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, work_schedule: e.target.value }))}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Your city / area (nearest gym)"
                  value={profile.location ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                />
                <input
                  type="number"
                  placeholder="Max budget ($)"
                  min={0}
                  value={profile.max_budget ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, max_budget: e.target.value ? Number(e.target.value) : undefined }))
                  }
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800"
                />
                <textarea
                  placeholder="Goals (optional)"
                  rows={2}
                  value={profile.goals ?? ""}
                  onChange={(e) => setProfile((p) => ({ ...p, goals: e.target.value }))}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 sm:col-span-2"
                />
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-brand-500 text-white"
                        : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.recommendations && (
                      <div className="mt-2 space-y-1 border-t border-stone-200/50 pt-2 text-xs dark:border-stone-600">
                        {m.recommendations.gym && (
                          <p>
                            <span className="font-semibold">Gym:</span>{" "}
                            <Link
                              href={m.recommendations.gym.path}
                              className="text-brand-600 underline dark:text-brand-400"
                              onClick={() => setOpen(false)}
                            >
                              {m.recommendations.gym.name}
                              {m.recommendations.gym.location
                                ? ` · ${m.recommendations.gym.location}`
                                : ""}
                            </Link>
                          </p>
                        )}
                        {m.recommendations.plan && (
                          <p>
                            <span className="font-semibold">Plan:</span> {m.recommendations.plan.name}
                            {m.recommendations.plan.price != null
                              ? ` · $${Number(m.recommendations.plan.price).toFixed(2)}`
                              : ""}
                          </p>
                        )}
                        {m.recommendations.coach && (
                          <p>
                            <span className="font-semibold">Coach:</span> {m.recommendations.coach.name}
                            {m.recommendations.coach.specialization
                              ? ` (${m.recommendations.coach.specialization})`
                              : ""}
                          </p>
                        )}
                        {m.recommendations.training_plan && (
                          <p className="mt-1 whitespace-pre-wrap text-stone-600 dark:text-stone-300">
                            <span className="font-semibold">Training plan:</span>
                            <br />
                            {m.recommendations.training_plan}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <p className="text-xs text-stone-400">Assistant is thinking…</p>
              )}
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="border-t border-stone-200 p-3 dark:border-stone-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Ask for gym, coach, plan, or training advice…"
                  disabled={sending}
                  className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-800"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-stone-400">
                Not medical advice. Recommendations use live GymHub catalog only.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
