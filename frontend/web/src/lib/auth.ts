import { apiClient } from "./axios";

export type AuthUser = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_id?: number;
};

export type LoginResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
};

export type RegisterResponse = {
  success: boolean;
  user: {
    id: number;
    email: string;
  };
  message?: string;
};

export async function login(email: string, password: string) {
  const res = await apiClient.post<LoginResponse>("/api/auth/login", {
    email,
    password,
  });
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

