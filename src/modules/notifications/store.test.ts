import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { Prediction } from "@/modules/predictions/types";
import { EVENT_GRACE_MS, useNotificationsStore } from "./store";

function prediction(id: string, targetRef: string, incidentType = "FLOOD", status = "NEW"): Prediction {
  return { id, targetKind: "channel", targetRef, incidentType, status } as Prediction;
}

describe("notifications store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("first snapshot toasts NEW only, once per event", () => {
    const store = useNotificationsStore();

    const first = store.onSnapshot([
      prediction("1", "100"),
      prediction("2", "100"),
      prediction("3", "200", "FLOOD", "REVIEWED"),
    ]);

    expect(first.toasts.map((p) => p.id)).toEqual(["1"]);
    expect(store.recentNotifications).toHaveLength(0);
  });

  it("recalculation of the same sensor event gives no second toast", () => {
    const store = useNotificationsStore();
    store.onSnapshot([prediction("1", "100")]);

    const next = store.onSnapshot([prediction("2", "100")]);

    expect(next.fresh).toHaveLength(1);
    expect(next.toasts).toHaveLength(0);
  });

  it("new sensor or incident type is a new event", () => {
    const store = useNotificationsStore();
    store.onSnapshot([prediction("1", "100")]);

    const next = store.onSnapshot([prediction("2", "100"), prediction("3", "200"), prediction("4", "100", "FIRE")]);

    expect(next.toasts.map((p) => p.id)).toEqual(["3", "4"]);
    expect(store.recentNotifications).toHaveLength(2);
  });

  it("feed entry follows the latest recalculation", () => {
    const store = useNotificationsStore();
    store.onSnapshot([]);
    store.onSnapshot([prediction("1", "100")]);

    store.onSnapshot([prediction("2", "100")]);

    expect(store.recentNotifications).toHaveLength(1);
    expect(store.recentNotifications[0]!.prediction.id).toBe("2");
  });

  it("event flapping within the grace window does not toast again", () => {
    const store = useNotificationsStore();
    store.onSnapshot([prediction("1", "100")]);
    store.onSnapshot([]);

    vi.advanceTimersByTime(EVENT_GRACE_MS - 60_000);
    store.onSnapshot([]);

    expect(store.onSnapshot([prediction("2", "100")]).toasts).toHaveLength(0);
  });

  it("event gone longer than the grace window toasts again", () => {
    const store = useNotificationsStore();
    store.onSnapshot([prediction("1", "100")]);

    vi.advanceTimersByTime(EVENT_GRACE_MS + 60_000);
    store.onSnapshot([]);

    expect(store.onSnapshot([prediction("2", "100")]).toasts).toHaveLength(1);
  });

  it("truncated snapshot (hasMore) forgets nothing", () => {
    const store = useNotificationsStore();
    store.onSnapshot([prediction("1", "100"), prediction("2", "200")]);

    vi.advanceTimersByTime(EVENT_GRACE_MS + 60_000);
    // Пара 200 не влезла в хвост снимка — это не значит, что риск ушёл.
    store.onSnapshot([prediction("3", "100")], false);

    expect(store.onSnapshot([prediction("3", "100"), prediction("4", "200")], false).toasts).toHaveLength(0);
  });
});
