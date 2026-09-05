import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workspace } from "@/v2/workspace";
import { createProject, type Project } from "@/v2/model";
import { calculate } from "@/v2/hydraulics";
import { resultAdvice } from "@/v2/guidance";
import { STORAGE_KEY } from "@/v2/use-workspace";

vi.mock("@/v2/components/simulation", () => ({ Simulation: () => null }));
vi.mock("@/v2/components/ai-assessment", () => ({ AiAssessment: () => null }));
vi.mock("@/v2/run-calculation", () => ({
  runCalculation: async (inputs: Project["inputs"]) => calculate(inputs),
}));

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function open(project = createProject(true)) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      format: "blc-workspace",
      version: 2,
      projects: [project],
      activeId: project.id,
    }),
  );
  render(<Workspace />);
  await screen.findByRole("button", { name: "Walk through setup" });
}
function go(name: RegExp) {
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Assessment navigation" }),
    ).getByRole("button", { name }),
  );
}

describe("guided assessment", () => {
  it("walks through setup without requiring review metadata", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Walk through setup" }));
    expect(screen.getByText("Step 1 of 7")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Next: Survey sections" }),
    );
    expect(screen.getByText("Step 2 of 7")).toBeTruthy();
    expect(document.activeElement?.id).toBe("main-workspace");
  });

  it("lets users navigate away from out-of-range values and links calculation errors back to their editor", async () => {
    await open();
    go(/Bridge & losses/);
    const field = screen.getByLabelText(/blockage/i);
    fireEvent.change(field, { target: { value: "90" } });
    expect(field.getAttribute("aria-invalid")).toBe("true");
    go(/Results & checks/);
    expect(screen.getByText("Step 5 of 7")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Blockage must be between 0% and 80%.",
      }),
    );
    expect(screen.getByText("Step 3 of 7")).toBeTruthy();
    expect((screen.getByLabelText(/blockage/i) as HTMLInputElement).value).toBe(
      "90",
    );
  });

  it("explains draft loss and keeps survey edits when the user stays", async () => {
    await open();
    go(/Survey sections/);
    fireEvent.change(screen.getByLabelText("Row 1 elevation"), {
      target: { value: "107" },
    });
    go(/Flow events/);
    expect(
      screen.getByText("You have unapplied edits on this step"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Stay and edit" }));
    expect(
      (screen.getByLabelText("Row 1 elevation") as HTMLInputElement).value,
    ).toBe("107");
    go(/Flow events/);
    fireEvent.click(
      screen.getByRole("button", { name: "Discard drafts and leave" }),
    );
    expect(screen.getByText("Step 4 of 7")).toBeTruthy();
    go(/Survey sections/);
    expect(
      (screen.getByLabelText("Row 1 elevation") as HTMLInputElement).value,
    ).toBe("106");
  });

  it("opens results after calculation and permits draft exports before review", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Try current inputs" }));
    await waitFor(() => expect(screen.getByText("Step 5 of 7")).toBeTruthy());
    expect(screen.getByText("Set the criteria for this crossing")).toBeTruthy();
    go(/Report & export/);
    expect(
      screen
        .getByRole("button", { name: "Download full HTML report" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(screen.getByText(/It will be marked as a draft/)).toBeTruthy();
  });

  it("shows where to add missing flows and explains unavailable report exports", async () => {
    await open(createProject());
    fireEvent.click(
      screen.getByRole("button", {
        name: "Enter between 1 and 30 flow events.",
      }),
    );
    expect(screen.getByText("Step 4 of 7")).toBeTruthy();
    go(/Report & export/);
    expect(
      screen.getByText(
        /Run the assessment to enable PDF, HTML and CSV exports/,
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Download project JSON" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("prioritises unsupported events over criteria and review advice", () => {
    const p = createProject(true);
    p.inputs.flows[0].tailwater = 110;
    p.run = calculate(p.inputs);
    expect(resultAdvice(p).title).toContain("investigation");
    expect(resultAdvice(p).page).toBe("results");
  });
});
