import { get, post, put } from "@/shared/api/http";
import type {
  OdsPullResult,
  RegistryPullResult,
  RiverLevel,
  RiverPullResult,
  SettingsUpdate,
  SettingsView,
  WeatherPullResult,
} from "./types";

export function fetchSettings(): Promise<SettingsView> {
  return get<SettingsView>("/settings");
}

export function updateSettings(payload: SettingsUpdate): Promise<SettingsView> {
  return put<SettingsView>("/settings", payload);
}

export function refreshWeather(): Promise<WeatherPullResult> {
  return post<WeatherPullResult>("/admin/weather/refresh");
}

export function refreshRiver(): Promise<RiverPullResult> {
  return post<RiverPullResult>("/admin/river/refresh");
}

export function refreshRegistry(): Promise<RegistryPullResult> {
  return post<RegistryPullResult>("/admin/registry/refresh");
}

export function refreshOds(): Promise<OdsPullResult> {
  return post<OdsPullResult>("/admin/ods/refresh");
}

export function fetchRiverLevel(): Promise<RiverLevel> {
  return get<RiverLevel>("/river-level");
}
