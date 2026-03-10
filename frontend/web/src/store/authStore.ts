import { create } from "zustand";

export type AuthUser = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_id?: number;
  profile_image?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (payload: { user: AuthUser; token: string }) => void;
  clearAuth: () => void;
};

function getInitialAuthState(): Pick<AuthState, "user" | "token" | "isAuthenticated"> {
  if (typeof window === "undefined") {
    return { user: null, token: null, isAuthenticated: false };
  }

  const token = window.localStorage.getItem("gymhub_token");
  const rawUser = window.localStorage.getItem("gymhub_user");

  let user: AuthUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as AuthUser;
    } catch {
      user = null;
    }
  }

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
  };
}

export const useAuthStore = create<AuthState>()((set) => {
  const initial = getInitialAuthState();

  return {
    ...initial,
    setAuth: ({ user, token }) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("gymhub_token", token);
        window.localStorage.setItem("gymhub_user", JSON.stringify(user));
      }
      set({
        user,
        token,
        isAuthenticated: true,
      });
    },
    clearAuth: () => {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("gymhub_token");
        window.localStorage.removeItem("gymhub_user");
      }
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    },
  };
});


