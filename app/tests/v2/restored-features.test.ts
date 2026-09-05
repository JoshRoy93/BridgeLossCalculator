import { describe, expect, it } from "vitest";
import {
  assessmentKey,
  createProject,
  currentAssessment,
  currentReview,
  reviewKey,
  sceneImageKey,
} from "../../src/v2/model";
import { calculate } from "../../src/v2/hydraulics";
import { exportProject, importProject } from "../../src/v2/io";
import { reportHtml } from "../../src/v2/report";
import {
  elevationAt,
  reachStations,
  sceneGeometry,
  wetEdges,
} from "../../src/v2/scene-geometry";
import { rationalDischarge } from "../../src/v2/hydrology";

function assessed() {
  const p = createProject(true);
  p.run = calculate(p.inputs);
  p.aiAssessment = {
    key: assessmentKey(p),
    text: "AI draft <script>alert(1)</script>",
    date: new Date().toISOString(),
    model: "test-model",
    edited: false,
  };
  return p;
}
describe("restored AI report assessment", () => {
  it("round-trips a draft and its provenance through project import", () => {
    const p = assessed(),
      restored = importProject(exportProject(p));
    expect(restored.aiAssessment).toEqual(p.aiAssessment);
    expect(currentAssessment(restored)?.text).toEqual(p.aiAssessment!.text);
  });
  it("escapes AI text and excludes an outdated draft without deleting it", () => {
    const p = assessed();
    expect(reportHtml(p)).toContain("&lt;script&gt;");
    expect(reportHtml(p)).not.toContain("<script>");
    p.criteria.afflux += 0.1;
    expect(currentAssessment(p)).toBeNull();
    expect(reportHtml(p)).not.toContain("AI draft &lt;script&gt;");
    expect(p.aiAssessment?.text).toContain("AI draft");
  });
  it("invalidates on inputs, source evidence, reruns or project context, but not draft edits", () => {
    for (const change of [
      (p: ReturnType<typeof assessed>) => {
        p.inputs.bridge.blockage = 20;
      },
      (p: ReturnType<typeof assessed>) => {
        p.evidence.notes = "New evidence";
      },
      (p: ReturnType<typeof assessed>) => {
        p.location = "Different site";
      },
      (p: ReturnType<typeof assessed>) => {
        p.run = calculate(p.inputs);
      },
    ]) {
      const p = assessed();
      change(p);
      expect(currentAssessment(p)).toBeNull();
    }
    const p = assessed();
    p.review = { key: reviewKey(p), date: new Date().toISOString() };
    expect(currentReview(p)).toBe(true);
    p.aiAssessment!.text = "Edited draft";
    expect(currentAssessment(p)).not.toBeNull();
    expect(currentReview(p)).toBe(false);
  });
  it("accepts older projects without AI fields and rejects malformed draft metadata", () => {
    expect(
      importProject(exportProject(createProject())).aiAssessment,
    ).toBeUndefined();
    const raw = JSON.parse(exportProject(assessed()));
    raw.project.aiAssessment.edited = "false";
    expect(() => importProject(JSON.stringify(raw))).toThrow("boolean");
  });
});
describe("SI scene geometry", () => {
  it("converts rainfall volume in km² and mm/h to discharge in m³/s", () => {
    // 3.6 mm/h on one square kilometre is 3600 m³ per hour, hence 1 m³/s.
    expect(rationalDischarge(1, 3.6, 1)).toBe(1);
    expect(rationalDischarge(2, 36, 0.5)).toBe(10);
    expect(() => rationalDischarge(1, 50, 1.1)).toThrow();
    expect(() => rationalDischarge(0, 50, 0.5)).toThrow();
  });
  it("retains report captures and excludes them after a new calculation", () => {
    const p = assessed();
    p.sceneImage = {
      key: sceneImageKey(p),
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      caption: "Test capture",
    };
    const restored = importProject(exportProject(p));
    expect(reportHtml(restored)).toContain("Test capture");
    restored.run = calculate(restored.inputs);
    expect(reportHtml(restored)).not.toContain("Test capture");
    const raw = JSON.parse(exportProject(p));
    raw.project.sceneImage.dataUrl = "https://example.com/tracker.png";
    expect(() => importProject(JSON.stringify(raw))).toThrow("embedded PNG");
  });
  it("uses actual section spacing and elevations without an imperial conversion", () => {
    const p = createProject(true),
      g = sceneGeometry(p.inputs);
    expect(reachStations(p.inputs)).toEqual([0, 40, 50, 90]);
    expect(g.datum).toBe(100);
    expect(g.length).toBe(90);
    expect(g.width).toBe(44);
    expect(g.terrain.every(Number.isFinite)).toBe(true);
    expect(g.water).toEqual([]);
  });
  it("interpolates banks and keeps disconnected wet intervals separate", () => {
    const points = [
      { station: 0, elevation: 2 },
      { station: 2, elevation: 0 },
      { station: 4, elevation: 2 },
    ];
    expect(elevationAt(points, 1)).toBe(1);
    expect(wetEdges(points, 1)).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(wetEdges(points, -1)).toEqual([]);
  });
  it("only draws water for a complete supported result", () => {
    const p = assessed(),
      result = p.run!.results[0];
    expect(result.status).toBe("ok");
    expect(sceneGeometry(p.inputs, result).water.length).toBeGreaterThan(0);
    expect(
      sceneGeometry(p.inputs, { ...result, status: "unsupported" }).water,
    ).toEqual([]);
    expect(
      sceneGeometry(p.inputs, { ...result, bridge: result.bridge.slice(0, 2) })
        .water,
    ).toEqual([]);
  });
});
