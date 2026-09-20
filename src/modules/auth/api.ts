import { http } from "@/shared/api/http";
import type { CurrentUser, LoginRequest } from "./types";

export const authApi = {
  async login(body: LoginRequest): Promise<CurrentUser> {
    const { data } = await http.post<CurrentUser>("/auth/login", body);
    return data;
  },
  async logout(): Promise<void> {
    await http.post("/auth/logout");
  },
  async me(): Promise<CurrentUser> {
    const { data } = await http.get<CurrentUser>("/auth/me");
    return data;
  },
};
