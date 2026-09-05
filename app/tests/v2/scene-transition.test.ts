import { describe, expect, it } from "vitest";
import { createProject } from "@/v2/model";
import { calculate } from "@/v2/hydraulics";
import {
  SceneTransition,
  SCENE_TRANSITION_MS,
  type SceneFrame,
} from "@/v2/scene-transition";
import { sceneGeometry } from "@/v2/scene-geometry";
function frames(): [SceneFrame, SceneFrame] {
  const p = createProject(true);
  const inputs = structuredClone(p.inputs);
  inputs.bridge.blockage = 25;
  inputs.bridge.soffit += 1;
  inputs.bridge.deck += 1;
  inputs.bridge.left -= 1;
  inputs.bridge.right += 1;
  return [
    { inputs: p.inputs, result: calculate(p.inputs).results[0] },
    { inputs, result: calculate(inputs).results[0] },
  ];
}
describe("completed scene transitions", () => {
  it("smoothly moves water, opening and deck to the exact solved endpoint", () => {
    const [a, b] = frames();
    const tween = new SceneTransition(a);
    tween.retarget(b, 100);
    expect(tween.sample(100)).toBe(a);
    const halfway = tween.sample(100 + SCENE_TRANSITION_MS / 2);
    expect(halfway.inputs.bridge.soffit).toBeCloseTo(
      (a.inputs.bridge.soffit + b.inputs.bridge.soffit) / 2,
    );
    expect(halfway.result!.bridge[3].wsel).toBeCloseTo(
      (a.result!.bridge[3].wsel + b.result!.bridge[3].wsel) / 2,
    );
    expect(
      halfway.inputs.bridge.deck - halfway.inputs.bridge.soffit,
    ).toBeCloseTo(a.inputs.bridge.deck - a.inputs.bridge.soffit);
    const mesh = sceneGeometry(halfway.inputs, halfway.result, false);
    expect(mesh.water.length).toBeGreaterThan(0);
    expect(mesh.depths.every((d) => d >= 0)).toBe(true);
    expect(tween.sample(100 + SCENE_TRANSITION_MS)).toBe(b);
    expect(a.inputs.bridge.soffit).toBe(104.5);
  });
  it("retargets from the displayed intermediate frame without jumping", () => {
    const [a, b] = frames();
    const tween = new SceneTransition(a);
    tween.retarget(b, 0);
    const visible = tween.sample(400);
    tween.retarget(a, 410);
    expect(tween.sample(410)).toBe(visible);
    const later = tween.sample(800);
    expect(later.inputs.bridge.soffit).toBeLessThan(
      visible.inputs.bridge.soffit,
    );
    expect(later.inputs.bridge.soffit).toBeGreaterThan(a.inputs.bridge.soffit);
    expect(tween.sample(1610)).toBe(a);
  });
  it("skips interpolation for reduced motion and unsupported endpoints", () => {
    const [a, b] = frames();
    const tween = new SceneTransition(a);
    tween.retarget(b, 0);
    expect(tween.sample(1, true)).toBe(b);
    const inputs = structuredClone(b.inputs);
    inputs.bridge.blockage = 80;
    const unsupported = { inputs, result: calculate(inputs).results[0] };
    expect(unsupported.result.status).toBe("unsupported");
    tween.retarget(unsupported, 10);
    expect(tween.sample(11)).toBe(unsupported);
  });
});
