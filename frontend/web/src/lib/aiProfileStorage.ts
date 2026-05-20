import type { AiProfile } from "@/lib/api/aiAssistant";

/** Cleared when the browser tab closes (sessionStorage) or on logout. */
const STORAGE_KEY = "gymhub_ai_assistant_profile";

export function loadAiProfile(): AiProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiProfile;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAiProfile(profile: AiProfile): void {
  if (typeof window === "undefined") return;
  try {
    const hasValue = Object.values(profile).some(
      (v) => v !== undefined && v !== null && v !== "",
    );
    if (!hasValue) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // quota or private mode — ignore
  }
}

export function clearAiProfileStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
