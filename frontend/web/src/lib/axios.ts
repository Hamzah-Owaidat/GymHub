import axios, { AxiosError } from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

/**
 * Typed error payload returned from our backend errorHandler.
 * See backend/middleware/errorHandler.js and backend/utils/AppError.js.
 */
export type ApiErrorPayload = {
  success: false;
  error: string;
  code?: string | null;
  stack?: string;
};

/**
 * Error thrown by the axios response interceptor.
 * Includes the HTTP status and the backend error code so callers / UI
 * can branch on it (e.g. TOKEN_EXPIRED => show "session expired" toast).
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  original: unknown;

  constructor(message: string, status: number, code: string | null, original?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.original = original;
  }
}

function redirectToSignIn(reason: "expired" | "invalid" | "missing") {
  if (typeof window === "undefined") return;
  const current = window.location.pathname + window.location.search;
  const isOnAuthPage = current.startsWith("/auth/");

  try {
    window.localStorage.removeItem("gymhub_token");
    window.localStorage.removeItem("gymhub_user");
    window.sessionStorage.removeItem("gymhub_token");
    window.sessionStorage.removeItem("gymhub_user");
    window.localStorage.removeItem("gymhub_permissions");
    window.sessionStorage.removeItem("gymhub_permissions");
  } catch {
    /* ignore storage errors */
  }

  if (isOnAuthPage) return;
  const target = `/auth/signin?reason=${reason}&next=${encodeURIComponent(current)}`;
  window.location.replace(target);
}

function redirectToErrorPage(path: string) {
  if (typeof window === "undefined") return;
  const current = window.location.pathname;
  if (current === path) return;
  window.location.replace(path);
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      window.localStorage.getItem("gymhub_token") ||
      window.sessionStorage.getItem("gymhub_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const status = error?.response?.status ?? 0;
    const data = error?.response?.data;
    const code = data?.code ?? null;
    const message =
      data?.error ||
      (data as unknown as { message?: string })?.message ||
      error.message ||
      "Something went wrong";

    // Handle global auth errors
    if (status === 401) {
      if (code === "TOKEN_EXPIRED") {
        redirectToSignIn("expired");
      } else if (code === "INVALID_TOKEN") {
        redirectToSignIn("invalid");
      } else if (code === "NO_TOKEN") {
        redirectToSignIn("missing");
      }
    } else if (status === 403) {
      // Only route to the forbidden page for navigation-style requests
      // (GET list / detail screens). Mutations can still show the toast.
      if (
        typeof window !== "undefined" &&
        (code === "FORBIDDEN_ROLE" || code === "FORBIDDEN_PERMISSION") &&
        (error.config?.method || "get").toLowerCase() === "get"
      ) {
        redirectToErrorPage("/errors/403");
      }
    } else if (status >= 500 && status !== 503) {
      // Network / server errors – leave UI toast to callers, no auto-redirect.
    } else if (status === 503) {
      redirectToErrorPage("/errors/503");
    }

    return Promise.reject(new ApiError(message, status, code, error));
  },
);
