import { create } from "zustand";

export type AuthUser = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_id?: number;
  profile_image?: string | null;
  is_active?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  rememberMe: boolean;
  setAuth: (payload: {
    user: AuthUser;
    token: string;
    rememberMe?: boolean;
    permissions?: string[];
  }) => void;
  setPermissions: (permissions: string[]) => void;
  clearAuth: () => void;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
};

const TOKEN_KEY = "gymhub_token";
const USER_KEY = "gymhub_user";
const PERMS_KEY = "gymhub_permissions";
const REMEMBER_KEY = "gymhub_remember";

function getInitialAuthState(): Pick<
  AuthState,
  "user" | "token" | "permissions" | "isAuthenticated" | "rememberMe"
> {
  if (typeof window === "undefined") {
    return {
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      rememberMe: false,
    };
  }

  const rememberMe =
    window.localStorage.getItem(REMEMBER_KEY) === "1" ||
    !!window.localStorage.getItem(TOKEN_KEY);

  const token =
    window.localStorage.getItem(TOKEN_KEY) ||
    window.sessionStorage.getItem(TOKEN_KEY);
  const rawUser =
    window.localStorage.getItem(USER_KEY) ||
    window.sessionStorage.getItem(USER_KEY);
  const rawPerms =
    window.localStorage.getItem(PERMS_KEY) ||
    window.sessionStorage.getItem(PERMS_KEY);

  let user: AuthUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as AuthUser;
    } catch {
      user = null;
    }
  }

  let permissions: string[] = [];
  if (rawPerms) {
    try {
      const parsed = JSON.parse(rawPerms);
      if (Array.isArray(parsed)) permissions = parsed.filter((x) => typeof x === "string");
    } catch {
      permissions = [];
    }
  }

  return {
    user,
    token,
    permissions,
    isAuthenticated: !!token && !!user,
    rememberMe,
  };
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const initial = getInitialAuthState();

  return {
    ...initial,
    setAuth: ({ user, token, rememberMe = false, permissions = [] }) => {
      if (typeof window !== "undefined") {
        const storage = rememberMe ? window.localStorage : window.sessionStorage;
        const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;
        storage.setItem(TOKEN_KEY, token);
        storage.setItem(USER_KEY, JSON.stringify(user));
        storage.setItem(PERMS_KEY, JSON.stringify(permissions));
        otherStorage.removeItem(TOKEN_KEY);
        otherStorage.removeItem(USER_KEY);
        otherStorage.removeItem(PERMS_KEY);
        if (rememberMe) window.localStorage.setItem(REMEMBER_KEY, "1");
        else window.localStorage.removeItem(REMEMBER_KEY);
      }
      set({
        user,
        token,
        permissions,
        rememberMe,
        isAuthenticated: true,
      });
    },
    setPermissions: (permissions) => {
      if (typeof window !== "undefined") {
        const storage = get().rememberMe ? window.localStorage : window.sessionStorage;
        storage.setItem(PERMS_KEY, JSON.stringify(permissions));
      }
      set({ permissions });
    },
    clearAuth: () => {
      if (typeof window !== "undefined") {
        [window.localStorage, window.sessionStorage].forEach((s) => {
          s.removeItem(TOKEN_KEY);
          s.removeItem(USER_KEY);
          s.removeItem(PERMS_KEY);
        });
        window.localStorage.removeItem(REMEMBER_KEY);
      }
      set({
        user: null,
        token: null,
        permissions: [],
        rememberMe: false,
        isAuthenticated: false,
      });
    },
    hasRole: (...roles) => {
      const role = get().user?.role;
      if (!role) return false;
      return roles.includes(role);
    },
    hasPermission: (code) => get().permissions.includes(code),
    hasAnyPermission: (...codes) => {
      const perms = get().permissions;
      return codes.some((c) => perms.includes(c));
    },
  };
});
