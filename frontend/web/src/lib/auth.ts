import { apiClient } from "./axios";

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

export type LoginResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
  permissions?: string[];
  remember_me?: boolean;
};

export type RegisterResponse = {
  success: boolean;
  user: {
    id: number;
    email: string;
  };
  message?: string;
};

export type MeResponse = {
  success: boolean;
  user: AuthUser;
  permissions?: string[];
};

export async function login(email: string, password: string, rememberMe = false) {
  const res = await apiClient.post<LoginResponse>("/api/auth/login", {
    email,
    password,
    rememberMe,
  });
  return res.data;
}

export async function fetchMe() {
  const res = await apiClient.get<MeResponse>("/api/auth/me");
  return res.data;
}

export async function registerUser(params: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob?: string;
  phone: string;
  phone_country_code: string;
}) {
  const res = await apiClient.post<RegisterResponse>(
    "/api/auth/register",
    params
  );
  return res.data;
}

export async function requestForgotPasswordOtp(email: string) {
  const res = await apiClient.post<{ success: boolean; message: string; expires_in_minutes?: number }>(
    "/api/auth/forgot-password/request-otp",
    { email },
  );
  return res.data;
}

export async function resetPasswordWithOtp(params: {
  email: string;
  otp: string;
  new_password: string;
}) {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    "/api/auth/forgot-password/reset",
    params,
  );
  return res.data;
}
