import { describe, expect, it } from "vitest";
import { createProject } from "@/v2/model";
import { calculate } from "@/v2/hydraulics";
import { sceneGeometry } from "@/v2/scene-geometry";

describe("bridge water footprint", () => {
  it("retains the complete shoreline wedge when a downstream slice becomes dry", () => {
    const p = createProject(true);
    const result = calculate(p.inputs).results[0];
    result.bridge.forEach((s) => {
      s.wsel = 105;
    });
    p.inputs.sections.forEach((s, i) =>
      s.points.forEach((point) => {
        point.elevation = i === 0 ? 100 : 110;
      }),
    );
    const scene = sceneGeometry(p.inputs, result);
    let area = 0;
    for (let i = 0; i < scene.water.length; i += 9) {
      const v = scene.water.slice(i, i + 9);
      area +=
        Math.abs(
          (v[3] - v[0]) * (v[8] - v[2]) - (v[6] - v[0]) * (v[5] - v[2]),
        ) / 2;
    }
    expect(area).toBeCloseTo(44 * 20, 4);
    expect(scene.depths).toHaveLength(scene.water.length / 3);
    expect(scene.depths.every((d) => d >= 0)).toBe(true);
  });
  it("does not draw water triangles through solid piers", () => {
    const p = createProject(true);
    p.inputs.bridge.piers = [{ station: 22, width: 4 }];
    const result = calculate(p.inputs).results[0];
    expect(result.status).toBe("ok");
    const scene = sceneGeometry(p.inputs, result);
    let throughPier = 0;
    for (let i = 0; i < scene.water.length; i += 9) {
      const xs = [scene.water[i], scene.water[i + 3], scene.water[i + 6]].map(
        (x) => x + scene.centre,
      );
      const z =
        (scene.water[i + 2] + scene.water[i + 5] + scene.water[i + 8]) / 3 +
        scene.length / 2;
      if (z > 40 && z < 50 && Math.min(...xs) < 24 && Math.max(...xs) > 20)
        throughPier++;
    }
    expect(throughPier).toBe(0);
  });
});
