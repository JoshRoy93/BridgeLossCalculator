import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEMO_BRIDGES, createDemoProject } from "../../src/v2/demo-bridges";
import {
  DemoGallery,
  DemoSourceBasis,
} from "../../src/v2/components/demo-gallery";
import { calculate, validate } from "../../src/v2/hydraulics";
import {
  assessmentKey,
  currentReview,
  inputKey,
  reviewKey,
} from "../../src/v2/model";
import { exportProject, importProject } from "../../src/v2/io";
import { reportHtml } from "../../src/v2/report";

afterEach(cleanup);
describe("sourced bridge examples", () => {
  it.each(DEMO_BRIDGES)(
    "$name runs supported cases without completing review",
    (demo) => {
      const p = createDemoProject(demo.id);
      expect(validate(p.inputs)).toEqual([]);
      p.run = calculate(p.inputs);
      expect(
        p.run.results.map((r) => ({ status: r.status, reason: r.reason })),
      ).toEqual(p.inputs.flows.map(() => ({ status: "ok", reason: "" })));
      expect(currentReview(p)).toBe(false);
      expect(p.criteria.source).toBe("");
      expect(p.inputs.flows.every((f) => f.reference === null)).toBe(true);
      expect(p.demoBasis!.inputKey).toBe(inputKey(p.inputs));
      const restored = importProject(exportProject(p));
      expect(restored.demoBasis).toEqual(p.demoBasis);
      expect(restored.inputs).toEqual(p.inputs);
      expect(reportHtml(restored)).toContain("Model simplifications");
    },
  );
  it("loads independent editable projects without mutating the catalogue", () => {
    const a = createDemoProject(DEMO_BRIDGES[0].id),
      b = createDemoProject(DEMO_BRIDGES[0].id);
    expect(a.id).not.toBe(b.id);
    expect(a.inputs.flows[0].id).not.toBe(b.inputs.flows[0].id);
    a.inputs.sections[0].points[0].elevation = 999;
    a.demoBasis!.values[0].note = "Changed";
    expect(b.inputs.sections[0].points[0].elevation).not.toBe(999);
    expect(DEMO_BRIDGES[0].values[0].note).not.toBe("Changed");
  });
  it("keeps original source history after editing and includes it safely in reports", () => {
    const p = createDemoProject(DEMO_BRIDGES[0].id);
    p.inputs.bridge.blockage = 5;
    p.run = calculate(p.inputs);
    p.demoBasis!.values[0].note = "Source <script>injection</script>";
    const html = reportHtml(p);
    expect(html).toContain("Inputs edited since loading");
    expect(html).toContain("&lt;script&gt;injection&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    render(<DemoSourceBasis basis={p.demoBasis!} inputs={p.inputs} />);
    expect(screen.getByText("Inputs edited since loading")).toBeTruthy();
    const review = reviewKey(p),
      ai = assessmentKey(p);
    p.demoBasis!.limitations.push("New source correction");
    expect(reviewKey(p)).not.toBe(review);
    expect(assessmentKey(p)).not.toBe(ai);
  });
  it("rejects unsafe source links and missing source references on import", () => {
    const raw = JSON.parse(
      exportProject(createDemoProject(DEMO_BRIDGES[0].id)),
    );
    raw.project.demoBasis.sources[0].url = "javascript:alert(1)";
    expect(() => importProject(JSON.stringify(raw))).toThrow("HTTP");
    raw.project.demoBasis.sources[0].url = "https://example.org/report.pdf";
    raw.project.demoBasis.values[0].sourceIds = ["missing"];
    expect(() => importProject(JSON.stringify(raw))).toThrow("missing source");
  });
  it("reviews the selected bridge before loading its actual project", () => {
    const load = vi.fn();
    render(<DemoGallery load={load} />);
    expect(load).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Review this example" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Use Windsor Bridge" }));
    expect(load).toHaveBeenCalledWith("windsor-design");
    const p = createDemoProject(load.mock.calls[0][0]);
    expect(p.inputs.bridge.right).toBe(157.6);
    expect(p.inputs.bridge.soffit).toBe(7.3);
    expect(p.inputs.flows[0].discharge).toBe(275);
  });
});
