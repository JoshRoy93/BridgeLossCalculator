import { describe, expect, it } from "vitest";
import {
  calculate,
  GRAVITY,
  properties,
  validate,
  wetted,
} from "@/v2/hydraulics";
import { createProject, currentRun } from "@/v2/model";

describe("v2 SI hydraulics", () => {
  it("reproduces analytical normal flow in a prismatic triangular channel", () => {
    const p = createProject(true),
      slope = 0.001,
      depth = 2,
      n = 0.035;
    const area = depth ** 2,
      perimeter = 2 * depth * Math.SQRT2;
    const q = (area * (area / perimeter) ** (2 / 3) * Math.sqrt(slope)) / n;
    p.inputs.sections = p.inputs.sections.map((s, i) => ({
      ...s,
      n,
      points: [
        { station: 0, elevation: 5 + [0, 0.04, 0.05, 0.09][i] },
        { station: 5, elevation: [0, 0.04, 0.05, 0.09][i] },
        { station: 10, elevation: 5 + [0, 0.04, 0.05, 0.09][i] },
      ],
    }));
    p.inputs.bridge = {
      ...p.inputs.bridge,
      left: 0,
      right: 10,
      soffit: 8,
      deck: 9,
      piers: [],
      contraction: 0,
      expansion: 0,
    };
    p.inputs.flows = [{ ...p.inputs.flows[0], discharge: q, tailwater: depth }];
    const r = calculate(p.inputs).results[0];
    expect(r.status).toBe("ok");
    r.bridge.forEach((s, i) =>
      expect(s.wsel).toBeCloseTo(depth + [0, 0.04, 0.05, 0.09][i], 4),
    );
    expect(r.afflux).toBeCloseTo(0, 5);
  });
  it("integrates a triangular channel against analytical geometry", () => {
    const g = wetted(
      [
        { station: 0, elevation: 5 },
        { station: 5, elevation: 0 },
        { station: 10, elevation: 5 },
      ],
      2,
    );
    expect(g.area).toBeCloseTo(4, 10);
    expect(g.topWidth).toBeCloseTo(4, 10);
    expect(g.perimeter).toBeCloseTo(4 * Math.SQRT2, 10);
  });
  it("has correct SI conveyance and Froude scaling", () => {
    const p = createProject(true);
    const g = properties(p.inputs, 0, 102, 35, true);
    expect(g.conveyance).toBeCloseTo(
      (g.area * (g.area / g.perimeter) ** (2 / 3)) / 0.035,
      10,
    );
    expect(g.froude).toBeCloseTo(
      35 / g.area / Math.sqrt((GRAVITY * g.area) / g.topWidth),
      10,
    );
  });
  it("balances every energy step and compares against a separate natural run", () => {
    const p = createProject(true),
      run = calculate(p.inputs);
    expect(run.results.map((r) => r.status)).toEqual(["ok", "ok", "ok"]);
    for (const r of run.results) {
      expect(r.afflux).toBeGreaterThan(0);
      expect(r.afflux).toBeCloseTo(r.bridge[3].wsel - r.natural[3].wsel, 10);
      for (const series of [r.bridge, r.natural])
        for (let i = 1; i < series.length; i++) {
          const s = series[i],
            ds = series[i - 1];
          expect(
            Math.abs(s.energy - ds.energy - s.friction - s.transition),
          ).toBeLessThan(0.00001);
          expect(s.froude).toBeLessThan(0.98);
        }
    }
  });
  it("produces zero afflux when the bridge is hydraulically absent", () => {
    const p = createProject(true);
    p.inputs.bridge = {
      ...p.inputs.bridge,
      left: 0,
      right: 44,
      piers: [],
      soffit: 110,
      deck: 111,
      contraction: 0,
      expansion: 0,
    };
    const r = calculate(p.inputs).results[0];
    expect(r.status).toBe("ok");
    expect(r.afflux).toBeCloseTo(0, 4);
  });
  it("does not assess pressure, dry or out-of-survey boundaries", () => {
    for (const tailwater of [99, 104.6, 105.4, 107]) {
      const p = createProject(true);
      p.inputs.flows[0].tailwater = tailwater;
      const r = calculate(p.inputs).results[0];
      expect(r.status).toBe("unsupported");
      expect(r.afflux).toBeNull();
      expect(r.freeboard).toBeNull();
    }
  });
  it("rejects malformed geometry and nonfinite discharges", () => {
    const p = createProject(true);
    p.inputs.flows[0].discharge = NaN;
    p.inputs.sections[0].points[1].station = 0;
    expect(validate(p.inputs).length).toBeGreaterThanOrEqual(2);
    expect(() => calculate(p.inputs)).toThrow();
  });
  it("invalidates current results when any assessment input changes", () => {
    const p = createProject(true);
    p.run = calculate(p.inputs);
    expect(currentRun(p)).not.toBeNull();
    p.inputs.bridge.blockage = 20;
    expect(currentRun(p)).toBeNull();
  });
});
