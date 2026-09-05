import { describe, it, expect } from "vitest";
import { createProject } from "@/v2/model";
import { approachGeometry } from "@/v2/approach-geometry";
import { sceneGeometry } from "@/v2/scene-geometry";
import { blendScenes } from "@/v2/scene-transition";
import { calculate } from "@/v2/hydraulics";
describe("bridge road connections", () => {
  it("connects both road approaches to the exact deck surface and outer banks", () => {
    const inputs = createProject(true).inputs,
      scene = sceneGeometry(inputs);
    const geometry = approachGeometry(inputs, scene.datum, scene.centre);
    expect(geometry.joins).toEqual([
      {
        station: inputs.bridge.left - 1,
        elevation: inputs.bridge.deck + 0.0475,
      },
      {
        station: inputs.bridge.right + 1,
        elevation: inputs.bridge.deck + 0.0475,
      },
    ]);
    const points = Array.from({ length: geometry.road.length / 3 }, (_, i) =>
      geometry.road.slice(i * 3, i * 3 + 3),
    );
    for (const join of geometry.joins) {
      const vertices = points.filter(
        (p) => Math.abs(p[0] + scene.centre - join.station) < 1e-8,
      );
      expect(vertices.length).toBeGreaterThan(0);
      expect(
        vertices.every(
          (p) => Math.abs(p[1] + scene.datum - join.elevation) < 1e-8,
        ),
      ).toBe(true);
    }
    expect(Math.min(...points.map((p) => p[0] + scene.centre))).toBe(0);
    expect(Math.max(...points.map((p) => p[0] + scene.centre))).toBe(44);
    expect(geometry.fill.length).toBeGreaterThan(0);
    expect(
      [
        ...geometry.road,
        ...geometry.fill,
        ...geometry.shoulders,
        ...geometry.markings,
      ].every(Number.isFinite),
    ).toBe(true);
  });
  it("keeps approaches attached throughout an animated deck and width change", () => {
    const a = createProject(true).inputs,
      b = structuredClone(a);
    b.bridge.soffit += 1;
    b.bridge.deck += 1;
    b.bridge.left -= 2;
    b.bridge.right += 2;
    const from = { inputs: a, result: calculate(a).results[0] },
      to = { inputs: b, result: calculate(b).results[0] };
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const frame = blendScenes(from, to, t),
        scene = sceneGeometry(frame.inputs);
      const road = approachGeometry(frame.inputs, scene.datum, scene.centre);
      expect(road.joins).toHaveLength(2);
      for (const join of road.joins)
        expect(join.elevation).toBe(frame.inputs.bridge.deck + 0.0475);
    }
  });
  it("does not invent approaches outside the available survey", () => {
    const inputs = createProject(true).inputs;
    inputs.bridge.left = 0;
    inputs.bridge.right = 44;
    const geometry = approachGeometry(inputs, 100, 22);
    expect(geometry.joins).toHaveLength(0);
    expect(geometry.road.every(Number.isFinite)).toBe(true);
  });
});
