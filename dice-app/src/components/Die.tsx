import { useLayoutEffect, useRef, useState } from "react";
import type { DieValue } from "../game/types";
import { DieFace } from "./SetupDie";
import {
  FACE_PLACEMENT,
  TUMBLE_VARIATION,
  orientationTransform,
  planTumble,
  restingOrientation,
  type Orientation,
} from "./dieTumble";

interface Props {
  value: DieValue;
  held: boolean;
  /** Whether the die responds to taps (Advanced mode after roll 1). */
  interactive: boolean;
  onToggle?: () => void;
  size?: number;
  /** Hide the dots — for the placeholder state before any roll. */
  blank?: boolean;
  /** Bumped by the reducer on every roll; a change tumbles this die if `rolled`. */
  rollId?: number;
  /** Whether the roll identified by `rollId` re-rolled this die. */
  rolled?: boolean;
  /** When this die lands within the throw (0–1). Called once per roll. */
  finish?: () => number;
  /** True until every die in the current throw has landed. */
  settling?: boolean;
  stayed?: boolean;
  newlyMatched?: boolean;
  /** Called once this die's tumble has landed. */
  onLanded?: () => void;
}

const VALUES: DieValue[] = [1, 2, 3, 4, 5, 6];
// Planes through the middle of the cube fill the gaps at its rounded corners.
const CORE_PLANES = ["", "rotateY(90deg)", "rotateX(90deg)"];
const PRESERVE_3D = { transformStyle: "preserve-3d" } as const;
const RISE = "cubic-bezier(.3,.7,.5,1)";
const FALL = "cubic-bezier(.5,0,.8,.4)";

function motionAllowed(): boolean {
  if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") {
    return false;
  }
  return !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

/**
 * A 3D die. Rolls tumble it with the Web Animations API rather than
 * Framer Motion: the tumble needs rotateZ applied after rotateX/rotateY
 * (so the landing quarter-turn never changes the face shown), and
 * Framer's fixed transform order puts rotateZ last.
 */
export function Die({
  value,
  held,
  interactive,
  onToggle,
  size = 64,
  blank = false,
  rollId = 0,
  rolled = false,
  finish,
  settling = false,
  stayed = false,
  newlyMatched = false,
  onLanded,
}: Props) {
  const hopRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const orientation = useRef<Orientation>(restingOrientation(value));
  const seenRollId = useRef(rollId);
  const wasStayed = useRef(stayed);
  const [landedRollId, setLandedRollId] = useState(rollId);

  const animates = motionAllowed();
  const tumbling = animates && rolled && rollId !== landedRollId;
  // Mid-throw, a die that sat out was held — keep it lit until everything lands.
  const showHeld = tumbling ? false : !rolled && settling ? true : held;

  useLayoutEffect(() => {
    if (cubeRef.current) {
      cubeRef.current.style.transform = orientationTransform(orientation.current);
    }
  }, []);

  useLayoutEffect(() => {
    if (rollId === seenRollId.current) return;
    seenRollId.current = rollId;
    const cube = cubeRef.current;
    const hop = hopRef.current;
    const shadow = shadowRef.current;
    if (!rolled || !cube || !hop || !shadow) return;

    const from = orientation.current;
    const plan = planTumble(from, value, finish?.() ?? 0.5, TUMBLE_VARIATION);
    orientation.current = plan.to;
    cube.style.transform = orientationTransform(plan.to);
    if (!animates) {
      onLanded?.();
      return;
    }

    // All dice leave together; `fill: backwards` holds the start pose until then.
    const timing: KeyframeAnimationOptions = { duration: plan.durationMs, fill: "backwards" };
    const path: [number, number, string, number][] = [
      [0, 0, RISE, 0],
      [plan.driftPx, -plan.hopPx, FALL, plan.apex],
      [plan.driftPx * 0.3, 0, RISE, 0.6],
      [0, -plan.bouncePx, FALL, 0.74],
      [0, 0, "linear", 0.86],
      [0, 0, "linear", 1],
    ];
    const animations = [
      cube.animate(
        [
          { transform: orientationTransform(from), easing: "cubic-bezier(.2,.6,.35,1)" },
          { transform: orientationTransform(plan.overshoot), offset: 0.8, easing: "ease-in-out" },
          { transform: orientationTransform(plan.to) },
        ],
        timing,
      ),
      hop.animate(
        path.map(([x, y, easing, offset]) => ({ transform: `translate(${x}px, ${y}px)`, easing, offset })),
        timing,
      ),
      shadow.animate(
        path.map(([x, y, easing, offset]) => ({
          transform: `translateX(${x}px) scale(${1 + y / (plan.hopPx * 2.2)})`,
          opacity: 1 + y / (plan.hopPx * 1.6),
          easing,
          offset,
        })),
        timing,
      ),
    ];

    let cancelled = false;
    Promise.all(animations.map((a) => a.finished)).then(
      () => {
        if (cancelled) return;
        setLandedRollId(rollId);
        if (newlyMatched) {
          ringRef.current?.animate(
            [
              { boxShadow: "0 0 0 0 rgba(245, 191, 90, 0)" },
              { boxShadow: "0 0 0 6px rgba(245, 191, 90, 0.55)" },
              { boxShadow: "0 0 0 0 rgba(245, 191, 90, 0)" },
            ],
            { duration: 700, easing: "ease-out" },
          );
        }
        onLanded?.();
      },
      () => {},
    );
    return () => {
      cancelled = true;
      animations.forEach((a) => a.cancel());
    };
    // A new roll is the only thing that starts a tumble.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  // Stay: a quick lock-in snap instead of a tumble.
  useLayoutEffect(() => {
    const justStayed = stayed && !wasStayed.current;
    wasStayed.current = stayed;
    if (!justStayed || !animates || !hopRef.current) return;
    hopRef.current.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }],
      { duration: 400, easing: "ease-out" },
    );
  }, [stayed, animates]);

  const half = size / 2;
  const faceColors = showHeld
    ? "bg-bar-amberPanel border-bar-amber"
    : "bg-bar-panel2 border-bar-line";

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size, perspective: 520 }}
      data-held={showHeld}
    >
      <div
        ref={shadowRef}
        aria-hidden
        className="absolute left-1.5 right-1.5 -bottom-3 h-1.5 rounded-full bg-bar-line"
      />
      <div ref={hopRef} className="absolute inset-0" style={PRESERVE_3D}>
        <div ref={cubeRef} data-cube className="absolute inset-0" style={PRESERVE_3D}>
          {CORE_PLANES.map((transform) => (
            <div
              key={transform}
              className={`absolute inset-0.5 rounded ${showHeld ? "bg-bar-amberPanel" : "bg-bar-panel2"}`}
              style={{ transform }}
            />
          ))}
          {VALUES.map((v) => (
            <div
              key={v}
              className={`absolute inset-0 rounded-xl border-2 flex items-center justify-center transition-colors ${faceColors}`}
              style={{
                transform: `rotateX(${FACE_PLACEMENT[v].x}deg) rotateY(${FACE_PLACEMENT[v].y}deg) translateZ(${half}px)`,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <DieFace value={blank ? null : v} size={size} highlight={showHeld} />
            </div>
          ))}
        </div>
        <div
          ref={ringRef}
          aria-hidden
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ transform: `translateZ(${half + 1}px)` }}
        >
          {showHeld && !blank && (
            <span className="absolute top-1 right-1 text-[10px] font-bold text-bar-amber">
              ✓
            </span>
          )}
        </div>
      </div>
      {/* Laid over the die rather than wrapped around it: swapping the wrapper
          would rebuild the cube and drop the rotation that shows its face. */}
      {interactive && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={held}
          aria-label={`Die showing ${value}, ${held ? "held" : "not held"}`}
          className="absolute inset-0 bg-transparent border-0 p-0 tap-target focus-ring rounded-xl cursor-pointer"
        />
      )}
    </div>
  );
}
