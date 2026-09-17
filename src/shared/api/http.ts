import axios, { AxiosError } from "axios";
import type { Problem } from "./types";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || import.meta.env.VITE_API_TOKEN;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<Problem>) => {
    if (error.response?.status === 401) {
      console.warn("[http] 401 Unauthorized");
    }
    return Promise.reject(error);
  },
);

export async function get<T>(url: string, params?: object): Promise<T> {
  const { data } = await http.get<T>(url, { params });
  return data;
}
