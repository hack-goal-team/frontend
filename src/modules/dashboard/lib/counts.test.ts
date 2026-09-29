import { describe, expect, it } from "vitest";
import { atRisk } from "./counts";

describe("atRisk", () => {
  it("counts MEDIUM and HIGH, skips LOW", () => {
    expect(atRisk({ LOW: 300, MEDIUM: 40, HIGH: 16 })).toBe(56);
  });

  it("is zero when only LOW is active", () => {
    expect(atRisk({ LOW: 356, MEDIUM: 0, HIGH: 0 })).toBe(0);
  });
});
