import { describe, expect, it } from "vitest";
import type { DieValue } from "../game/types";
import {
  FACE_PLACEMENT,
  TUMBLE_VARIATION,
  finishFractions,
  orientationTransform,
  planTumble,
  restingOrientation,
  type Orientation,
} from "./dieTumble";

type Vec = [number, number, number];
const rad = (deg: number) => (deg * Math.PI) / 180;

// CSS rotation matrices (y points down, z points at the viewer).
function rotX(a: number, [x, y, z]: Vec): Vec {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return [x, y * c - z * s, y * s + z * c];
}
function rotY(a: number, [x, y, z]: Vec): Vec {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return [x * c + z * s, y, -x * s + z * c];
}
function rotZ(a: number, [x, y, z]: Vec): Vec {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  return [x * c - y * s, x * s + y * c, z];
}

/** Direction a face points once the cube is at `o` — mirrors the CSS transform lists. */
function faceNormal(value: DieValue, o: Orientation): Vec {
  const p = FACE_PLACEMENT[value];
  const onCube = rotX(p.x, rotY(p.y, [0, 0, 1]));
  return rotZ(o.z, rotX(o.x, rotY(o.y, onCube)));
}

function expectFacingViewer(value: DieValue, o: Orientation) {
  const [x, y, z] = faceNormal(value, o);
  expect(x).toBeCloseTo(0, 6);
  expect(y).toBeCloseTo(0, 6);
  expect(z).toBeCloseTo(1, 6);
}

const VALUES: DieValue[] = [1, 2, 3, 4, 5, 6];

describe("restingOrientation", () => {
  it.each(VALUES)("shows %i facing the viewer", (v) => {
    expectFacingViewer(v, restingOrientation(v));
  });
});

describe("planTumble", () => {
  it("always lands on the rolled face, from any starting orientation", () => {
    let from = restingOrientation(1);
    for (let i = 0; i < 300; i++) {
      const value = VALUES[i % 6];
      const plan = planTumble(from, value, Math.random(), TUMBLE_VARIATION);
      expectFacingViewer(value, plan.to);
      from = plan.to;
    }
  });

  it("lands square — the in-plane turn is a whole quarter, never crooked", () => {
    let from = restingOrientation(1);
    for (let i = 0; i < 300; i++) {
      const plan = planTumble(from, VALUES[i % 6], Math.random(), TUMBLE_VARIATION);
      expect(Math.abs(plan.to.z % 90)).toBe(0);
      from = plan.to;
    }
  });

  it("really tumbles — at least half a turn on both spin axes", () => {
    let from = restingOrientation(1);
    for (let i = 0; i < 300; i++) {
      const plan = planTumble(from, VALUES[i % 6], Math.random(), TUMBLE_VARIATION);
      expect(Math.abs(plan.to.x - from.x)).toBeGreaterThanOrEqual(180);
      expect(Math.abs(plan.to.y - from.y)).toBeGreaterThanOrEqual(180);
      from = plan.to;
    }
  });

  it("a later finish means a longer tumble, all inside 0.7–1.5 s", () => {
    const from = restingOrientation(1);
    const first = planTumble(from, 3, 0, TUMBLE_VARIATION);
    const last = planTumble(from, 3, 1, TUMBLE_VARIATION);
    expect(first.durationMs).toBeLessThan(last.durationMs);
    expect(first.durationMs).toBeGreaterThanOrEqual(700);
    expect(last.durationMs).toBeLessThanOrEqual(1500);
  });

  it("with no variation every die takes the same time", () => {
    const from = restingOrientation(1);
    expect(planTumble(from, 2, 0, 0).durationMs).toBe(
      planTumble(from, 5, 1, 0).durationMs,
    );
  });

  it("the bounce after landing is lower than the hop", () => {
    for (let i = 0; i < 100; i++) {
      const plan = planTumble(restingOrientation(1), 4, Math.random(), TUMBLE_VARIATION);
      expect(plan.bouncePx).toBeGreaterThan(0);
      expect(plan.bouncePx).toBeLessThan(plan.hopPx);
    }
  });
});

describe("finishFractions", () => {
  it("returns nothing for no dice", () => {
    expect(finishFractions(0)).toEqual([]);
  });

  it("spreads landings so each die gets its own slice of the window", () => {
    for (let n = 1; n <= 5; n++) {
      for (let i = 0; i < 50; i++) {
        const sorted = finishFractions(n).sort((a, b) => a - b);
        expect(sorted).toHaveLength(n);
        sorted.forEach((f, k) => {
          expect(f).toBeGreaterThanOrEqual(k / n);
          expect(f).toBeLessThanOrEqual((k + 1) / n);
        });
      }
    }
  });

  it("shuffles which die lands first", () => {
    const firstLander = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const f = finishFractions(5);
      firstLander.add(f.indexOf(Math.min(...f)));
    }
    expect(firstLander.size).toBeGreaterThan(1);
  });
});

describe("orientationTransform", () => {
  it("applies the in-plane turn last so it never changes the face shown", () => {
    expect(orientationTransform({ x: -90, y: 360, z: 180 })).toBe(
      "rotateZ(180deg) rotateX(-90deg) rotateY(360deg)",
    );
  });
});
