import type { FlowResult, Inputs } from "./model";

export interface SceneFrame {
  inputs: Inputs;
  result?: FlowResult;
}
export const SCENE_TRANSITION_MS = 1200;

// Intermediate frames are visual only. They are never calculation records.
export function canBlendScenes(a: SceneFrame, b: SceneFrame) {
  return (
    a.result?.status === "ok" &&
    b.result?.status === "ok" &&
    a.result.bridge.length === 4 &&
    b.result.bridge.length === 4 &&
    a.result.bridge.every((s) => Number.isFinite(s.wsel)) &&
    b.result.bridge.every((s) => Number.isFinite(s.wsel)) &&
    a.inputs.sections.every(
      (s, i) =>
        JSON.stringify(s.points) ===
        JSON.stringify(b.inputs.sections[i]?.points),
    ) &&
    JSON.stringify(a.inputs.bridge.piers) ===
      JSON.stringify(b.inputs.bridge.piers) &&
    (["deckLength", "expansionLength", "contractionLength"] as const).every(
      (key) => a.inputs.bridge[key] === b.inputs.bridge[key],
    )
  );
}
export function blendScenes(
  a: SceneFrame,
  b: SceneFrame,
  fraction: number,
): SceneFrame {
  if (fraction <= 0) return a;
  if (fraction >= 1) return b;
  const t = fraction * fraction * (3 - 2 * fraction);
  const mix = (x: number, y: number) => x + (y - x) * t;
  const bridge = { ...b.inputs.bridge };
  for (const key of ["left", "right", "soffit", "deck", "blockage"] as const)
    bridge[key] = mix(a.inputs.bridge[key], b.inputs.bridge[key]);
  return {
    inputs: { ...b.inputs, bridge },
    result: {
      ...b.result!,
      bridge: b.result!.bridge.map((step, i) => ({
        ...step,
        wsel: mix(a.result!.bridge[i].wsel, step.wsel),
      })),
    },
  };
}
export class SceneTransition {
  private from: SceneFrame;
  private current: SceneFrame;
  target: SceneFrame;
  private start = 0;
  private blending = false;
  constructor(initial: SceneFrame) {
    this.from = this.current = this.target = initial;
  }
  retarget(target: SceneFrame, now: number) {
    // Resume from the last frame actually supplied to the renderer.
    this.from = this.current;
    this.target = target;
    this.start = now;
    this.blending = canBlendScenes(this.from, target);
  }
  sample(now: number, reducedMotion = false): SceneFrame {
    const fraction = (now - this.start) / SCENE_TRANSITION_MS;
    this.current =
      reducedMotion || !this.blending || fraction >= 1
        ? this.target
        : blendScenes(this.from, this.target, Math.max(0, fraction));
    return this.current;
  }
}
