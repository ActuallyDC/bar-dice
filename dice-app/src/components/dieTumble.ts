import type { DieValue } from "../game/types";

/** Cube rotation in degrees, applied as `rotateZ(z) rotateX(x) rotateY(y)`. */
export interface Orientation {
  x: number;
  y: number;
  z: number;
}

/**
 * How much the dice in one throw differ from each other (0 = identical).
 * 0.85 is the "Chaotic" setting picked from the playtest demo.
 */
export const TUMBLE_VARIATION = 0.85;

/** Rotation that places each face on the cube. Opposite faces sum to 7. */
export const FACE_PLACEMENT: Record<DieValue, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 90 },
  3: { x: 90, y: 0 },
  4: { x: -90, y: 0 },
  5: { x: 0, y: -90 },
  6: { x: 0, y: 180 },
};

/** Cube rotation that turns each face toward the viewer. */
const FRONT: Record<DieValue, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

const BASE_MS = 1000;
const BASE_HOP_PX = 26;

export function restingOrientation(value: DieValue): Orientation {
  return { ...FRONT[value], z: 0 };
}

/** rotateZ comes first in the list, so it spins the face in place after the tumble. */
export function orientationTransform(o: Orientation): string {
  return `rotateZ(${o.z}deg) rotateX(${o.x}deg) rotateY(${o.y}deg)`;
}

export interface TumblePlan {
  to: Orientation;
  /** Just past `to` — the die rocks over and settles back. */
  overshoot: Orientation;
  durationMs: number;
  hopPx: number;
  bouncePx: number;
  /** Sideways drift at the top of the hop; the die comes back to its slot. */
  driftPx: number;
  /** How far (0–1) through the tumble the hop peaks. */
  apex: number;
}

const between = (a: number, b: number) => a + Math.random() * (b - a);
const coinFlip = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);

/** The angle ≡ `base` (mod 360) that sits `turns` full turns past `from` in direction `dir`. */
function turnsPast(from: number, base: number, turns: number, dir: 1 | -1): number {
  return base + 360 * Math.round((from - base) / 360) + dir * 360 * turns;
}

/**
 * Plan one die's throw. Every die leaves at the same moment; `finish`
 * (0–1, from `finishFractions`) decides when this one lands. `variation`
 * scales how much spin direction, turns, hop, and timing differ per die.
 */
export function planTumble(
  from: Orientation,
  value: DieValue,
  finish: number,
  variation: number,
): TumblePlan {
  const lively = variation > 0.1;
  const dirX = lively ? coinFlip() : 1;
  const dirY = lively ? coinFlip() : 1;
  const turns = () => 1 + Math.floor(Math.random() * (1 + Math.round(variation * 2)));
  // Land square, but any of the four ways up — like a real die.
  const quarter = lively ? 90 * Math.floor(Math.random() * 4) : 0;
  const spinZ = Math.random() < variation * 0.6 ? coinFlip() : 0;

  const front = FRONT[value];
  const to: Orientation = {
    x: turnsPast(from.x, front.x, turns(), dirX),
    y: turnsPast(from.y, front.y, turns(), dirY),
    z: turnsPast(from.z, quarter, spinZ, 1),
  };
  const hopPx = BASE_HOP_PX * (1 + variation * between(-0.45, 0.6));

  return {
    to,
    overshoot: {
      x: to.x + dirX * variation * between(5, 15),
      y: to.y + dirY * variation * between(5, 15),
      z: to.z + variation * between(-6, 6),
    },
    durationMs: Math.round(BASE_MS * (1 + variation * (-0.3 + 0.75 * finish))),
    hopPx,
    bouncePx: hopPx * between(0.16, 0.32),
    driftPx: variation * between(-12, 12),
    apex: 0.28 + variation * between(-0.06, 0.06),
  };
}

/**
 * When each of `n` dice lands, as 0–1 fractions of the landing window.
 * Each die gets its own slice (shuffled), so landings clack one after
 * another instead of two dice landing together by chance.
 */
export function finishFractions(n: number): number[] {
  const slots = Array.from({ length: n }, (_, k) => k);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots.map((k) => (k + between(0.15, 0.85)) / n);
}
