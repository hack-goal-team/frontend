import axios, { isAxiosError } from "axios";
import { getCsrfToken } from "./csrf";
import type { Problem } from "./types";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers["X-XSRF-TOKEN"] = token;
    }
  }
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (error: unknown) => {
    if (isAxiosError<Problem>(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? "";
      if (status === 401 && !url.includes("/auth/logout")) {
        // TODO: редирект на /login
      }
      if (status === 403) {
        console.warn("[http] 403 Forbidden");
      }
    }
    return Promise.reject(error);
  },
);

export async function get<T>(url: string, params?: object): Promise<T> {
  const { data } = await http.get<T>(url, { params });
  return data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await http.post<T>(url, body);
  return data;
}

export async function getWithHeaders<T>(
  url: string,
  params?: object,
): Promise<{ data: T; headers: Record<string, string> }> {
  const response = await http.get<T>(url, { params });
  return {
    data: response.data,
    headers: response.headers as Record<string, string>,
  };
}
