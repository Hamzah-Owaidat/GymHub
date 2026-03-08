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

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: ({ user, token }) => {
    // Persist only the raw token as a plain string
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gymhub_token", token);
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
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
}));

