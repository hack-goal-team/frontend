import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type { Prediction } from "@/modules/predictions/types";
import { useNotificationsStore } from "./store";

function prediction(id: string, targetRef: string, incidentType = "FLOOD"): Prediction {
  return { id, targetKind: "channel", targetRef, incidentType, status: "NEW" } as Prediction;
}

describe("notifications store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("recalculation of the same sensor event gives no second toast", () => {
    const store = useNotificationsStore();
    expect(store.onSnapshot([prediction("1", "100")]).toasts).toHaveLength(1);

    const next = store.onSnapshot([prediction("2", "100")]);

    expect(next.fresh).toHaveLength(1);
    expect(next.toasts).toHaveLength(0);
    expect(store.recentNotifications).toHaveLength(0);
  });

  it("new sensor or incident type is a new event", () => {
    const store = useNotificationsStore();
    store.onSnapshot([prediction("1", "100")]);

    const next = store.onSnapshot([prediction("2", "100"), prediction("3", "200"), prediction("4", "100", "FIRE")]);

    expect(next.toasts.map((p) => p.id)).toEqual(["3", "4"]);
    expect(store.recentNotifications).toHaveLength(2);
  });

  it("one toast per event inside a snapshot", () => {
    const store = useNotificationsStore();

    expect(store.onSnapshot([prediction("1", "100"), prediction("2", "100")]).toasts).toHaveLength(1);
  });

  it("event that left the snapshot toasts again on return", () => {
    const store = useNotificationsStore();
    store.onSnapshot([prediction("1", "100")]);
    store.onSnapshot([]);

    expect(store.onSnapshot([prediction("2", "100")]).toasts).toHaveLength(1);
  });
});
