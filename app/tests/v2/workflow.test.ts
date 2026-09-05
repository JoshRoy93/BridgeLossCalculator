import { describe, expect, it } from "vitest";
import { calculate } from "@/v2/hydraulics";
import {
  createProject,
  currentReview,
  currentRun,
  reviewKey,
} from "@/v2/model";
import {
  csvCell,
  exportProject,
  importLegacy,
  importProject,
  parseReferenceCsv,
  parseSurvey,
  parseWorkspace,
} from "@/v2/io";
import { reviewIssues, verdict } from "@/v2/assessment";
import { reportHtml, resultCsv } from "@/v2/report";

function assessed() {
  const p = createProject(true);
  p.author = "A. Engineer";
  p.criteria.source = "Project brief, section 4";
  p.evidence = {
    survey: "Checked",
    boundary: "Checked",
    model: "Supported subcritical range",
    reviewer: "R. Reviewer",
    notes: "Review completed with findings recorded.",
  };
  p.run = calculate(p.inputs);
  return p;
}
describe("assessment lifecycle and files", () => {
  it("round-trips all inputs, metadata, alternatives and evidence without trusting saved numbers", () => {
    const p = assessed();
    p.scenarios.push({
      id: "baseline",
      name: "Baseline",
      note: "Original geometry",
      run: structuredClone(p.run!),
    });
    p.review = { key: reviewKey(p), date: new Date().toISOString() };
    const file = JSON.parse(exportProject(p));
    file.project.run.results[0].afflux = 999;
    const restored = importProject(JSON.stringify(file));
    expect(restored.inputs).toEqual(p.inputs);
    expect(restored.evidence).toEqual(p.evidence);
    expect(restored.scenarios[0].run.inputs).toEqual(p.inputs);
    expect(restored.run?.results[0].afflux).toBe(p.run?.results[0].afflux);
    expect(restored.id).not.toBe(p.id);
    expect(restored.review).toBeNull();
  });
  it("retains review across a local reload and invalidates it on evidence, criteria or input changes", () => {
    const p = assessed();
    expect(reviewIssues(p)).toEqual([]);
    p.review = { date: new Date().toISOString(), key: reviewKey(p) };
    const w = parseWorkspace(
      JSON.stringify({
        format: "blc-workspace",
        version: 2,
        projects: [p],
        activeId: p.id,
      }),
    );
    expect(currentReview(w.projects[0])).toBe(true);
    const changed = structuredClone(p);
    changed.criteria.freeboard += 0.1;
    expect(currentReview(changed)).toBe(false);
    changed.evidence.reviewer = "Changed";
    expect(currentReview(changed)).toBe(false);
    changed.inputs.bridge.blockage = 20;
    expect(currentRun(changed)).toBeNull();
  });
  it("allows a draft with invalid physical inputs to be saved without treating it as calculated", () => {
    const p = createProject();
    p.inputs.bridge.left = 50;
    const restored = importProject(exportProject(p));
    expect(restored.inputs.bridge.left).toBe(50);
    expect(currentRun(restored)).toBeNull();
  });
  it("rejects incompatible versions and malformed nested inputs", () => {
    const file = JSON.parse(exportProject(assessed()));
    file.project.inputs.sections[0].points[0].elevation = "100";
    expect(() => importProject(JSON.stringify(file))).toThrow("finite");
    expect(() =>
      importProject('{"format":"blc-assessment","version":3}'),
    ).toThrow("v2");
    expect(() => parseWorkspace("{broken")).toThrow();
  });
  it("gives recalculated runs new identity when their engine version changes", () => {
    const p = assessed();
    p.review = { date: new Date().toISOString(), key: reviewKey(p) };
    const oldId = p.run!.id;
    p.run!.engine = "1.9.0";
    const w = parseWorkspace(
      JSON.stringify({
        format: "blc-workspace",
        version: 2,
        projects: [p],
        activeId: p.id,
      }),
    );
    expect(w.projects[0].run!.id).not.toBe(oldId);
    expect(currentReview(w.projects[0])).toBe(false);
  });
  it("does not give a passing verdict without criteria or within unsupported conditions", () => {
    const p = createProject(true);
    p.run = calculate(p.inputs);
    expect(verdict(p.run.results[0], p)).toBe("Set criteria");
    p.criteria.source = "Brief";
    p.criteria.afflux = 0;
    expect(verdict(p.run.results[0], p)).toBe("Exceeds criteria");
    p.inputs.flows[0].tailwater = 110;
    p.run = calculate(p.inputs);
    expect(verdict(p.run.results[0], p)).toBe("Outside model range");
    expect(reviewIssues(p).some((s) => s.includes("outside"))).toBe(true);
  });
  it("rejects bad CSV rows atomically and maps comparison data by event name", () => {
    expect(parseSurvey("station,elevation\n0,2\n1,0\n2,2")).toHaveLength(3);
    expect(() => parseSurvey("station,elevation\n0,2\n1,bad\n2,2")).toThrow(
      "row 3",
    );
    expect(() => parseSurvey("station,elevation\n0,2\n0,0\n2,2")).toThrow(
      "increase",
    );
    const p = assessed();
    const input = parseReferenceCsv(
      "event,upstream_wsel_m\n1% AEP,103.3",
      p.inputs,
    );
    expect(input.flows[2].reference).toBe(103.3);
    expect(p.inputs.flows[2].reference).toBeNull();
    expect(() =>
      parseReferenceCsv("event,upstream_wsel_m\nUnknown,2", p.inputs),
    ).toThrow("unknown");
    expect(() =>
      parseReferenceCsv("event,upstream_wsel_m\n1% AEP,2\n1% AEP,3", p.inputs),
    ).toThrow("repeated");
  });
  it("escapes user content in reports and prevents CSV formula interpretation", () => {
    const p = assessed();
    p.name = "<script>alert(1)</script>";
    const html = reportHtml(p);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Residual m");
    expect(html).toContain("Survey sections");
    expect(csvCell("=CMD()")).toBe('"\'=CMD()"');
    expect(csvCell('A,"B"')).toBe('"A,""B"""');
    expect(resultCsv(p)).toContain("natural_approach_wsel_m");
    p.inputs.flows[0].discharge++;
    expect(() => reportHtml(p)).toThrow("current inputs");
  });
  it("migrates legacy engine units even if the old display preference was metric", () => {
    const p = importLegacy(
      JSON.stringify({
        version: 2,
        unitSystem: "metric",
        crossSection: [
          { station: 0, elevation: 10, manningsN: 0.035 },
          { station: 5, elevation: 0, manningsN: 0.035 },
          { station: 10, elevation: 10, manningsN: 0.035 },
        ],
        bridgeGeometry: {
          leftAbutmentStation: 1,
          rightAbutmentStation: 9,
          lowChordLeft: 8,
          lowChordRight: 8,
          highChord: 9,
          piers: [],
          contractionLength: 10,
          expansionLength: 10,
          deckWidth: 5,
        },
        coefficients: { contractionCoeff: 0.3, expansionCoeff: 0.5 },
        flowProfiles: [{ name: "Q1", discharge: 100, dsWsel: 5 }],
      }),
    );
    expect(p.inputs.sections[0].points[2].station).toBeCloseTo(3.048, 10);
    expect(p.inputs.flows[0].discharge).toBeCloseTo(2.8316846592, 10);
    expect(p.run).toBeNull();
    expect(() =>
      importLegacy(
        JSON.stringify({
          version: 2,
          bridgeGeometry: { skewAngle: 25 },
          coefficients: {},
        }),
      ),
    ).toThrow("skewed");
    expect(() =>
      importLegacy(
        JSON.stringify({
          version: 2,
          bridgeGeometry: { lowChordLeft: 8, lowChordRight: 9 },
          coefficients: {},
        }),
      ),
    ).toThrow("horizontal soffit");
  });
});
