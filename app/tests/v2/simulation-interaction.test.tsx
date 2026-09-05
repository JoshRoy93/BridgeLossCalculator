import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createProject, type Run } from "@/v2/model";
import { calculate } from "@/v2/hydraulics";
import { runCalculation } from "@/v2/run-calculation";
import { Simulation } from "@/v2/components/simulation";

vi.mock("next/dynamic", () => ({
  default:
    () =>
    (props: {
      inputs: { bridge: { soffit: number } };
      result?: { bridge: { wsel: number }[] };
    }) => (
      <div
        data-testid="scene"
        data-soffit={props.inputs.bridge.soffit}
        data-water={props.result?.bridge[3]?.wsel}
      />
    ),
}));
vi.mock("@/v2/run-calculation", () => ({ runCalculation: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("live what-if workflow", () => {
  it("retains the last completed water and bridge while a new calculation is pending or fails", async () => {
    const project = createProject(true);
    project.run = calculate(project.inputs);
    let reject!: (error: Error) => void;
    vi.mocked(runCalculation).mockImplementation(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    render(<Simulation project={project} update={vi.fn()} notify={vi.fn()} />);
    const scene = screen.getByTestId("scene");
    const level = scene.getAttribute("data-water");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: /Soffit elevation/ }),
      { target: { value: "105.5" } },
    );
    expect(scene.getAttribute("data-water")).toBe(level);
    expect(scene.getAttribute("data-soffit")).toBe("104.5");
    await waitFor(() => expect(runCalculation).toHaveBeenCalled());
    expect(scene.getAttribute("data-water")).toBe(level);
    await act(async () => reject(new Error("Worker unavailable")));
    expect(scene.getAttribute("data-water")).toBe(level);
    expect(
      screen
        .getByRole("button", { name: "Apply to project" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });
  it("retains the most recent preview, then switches atomically to a completed unsupported result", async () => {
    const project = createProject(true);
    project.run = calculate(project.inputs);
    const pending: { resolve: (run: Run) => void; run: Run }[] = [];
    vi.mocked(runCalculation).mockImplementation(
      (inputs) =>
        new Promise((resolve) =>
          pending.push({ resolve, run: calculate(inputs) }),
        ),
    );
    render(<Simulation project={project} update={vi.fn()} notify={vi.fn()} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: /Blockage/ }), {
      target: { value: "25" },
    });
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => pending[0].resolve(pending[0].run));
    const water = screen.getByTestId("scene").getAttribute("data-water");
    expect(Number(water)).toBe(pending[0].run.results[0].bridge[3].wsel);
    fireEvent.change(screen.getByRole("spinbutton", { name: /Blockage/ }), {
      target: { value: "80" },
    });
    expect(screen.getByTestId("scene").getAttribute("data-water")).toBe(water);
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[1].run.results[0].status).toBe("unsupported");
    await act(async () => pending[1].resolve(pending[1].run));
    expect(screen.getByText(/Water surface unavailable:/)).toBeTruthy();
  });
  it("cancels an obsolete calculation and ignores its late result", async () => {
    const project = createProject(true);
    project.run = calculate(project.inputs);
    const pending: {
      resolve: (run: Run) => void;
      run: Run;
      signal?: AbortSignal;
    }[] = [];
    vi.mocked(runCalculation).mockImplementation(
      (inputs, signal) =>
        new Promise((resolve) =>
          pending.push({ resolve, run: calculate(inputs), signal }),
        ),
    );
    const update = vi.fn();
    render(<Simulation project={project} update={update} notify={vi.fn()} />);
    const field = screen.getByRole("spinbutton", { name: "Blockage · %" });
    fireEvent.change(field, { target: { value: "10" } });
    await waitFor(() => expect(pending).toHaveLength(1));
    fireEvent.change(field, { target: { value: "20" } });
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].signal?.aborted).toBe(true);
    await act(async () => pending[1].resolve(pending[1].run));
    await act(async () => pending[0].resolve(pending[0].run));
    fireEvent.click(screen.getByRole("button", { name: "Apply to project" }));
    expect(update.mock.calls[0][0].run.inputs.bridge.blockage).toBe(20);
  });
  it("moves the deck with the soffit and rebases multipliers after applying", async () => {
    const project = createProject(true);
    project.run = calculate(project.inputs);
    vi.mocked(runCalculation).mockImplementation(async (inputs) =>
      calculate(inputs),
    );
    const update = vi.fn();
    const view = render(
      <Simulation project={project} update={update} notify={vi.fn()} />,
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Soffit elevation · m" }),
      { target: { value: "105.5" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Roughness multiplier" }),
      { target: { value: "1.5" } },
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Apply to project" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply to project" }));
    const applied = update.mock.calls[0][0];
    expect(
      applied.inputs.bridge.deck - applied.inputs.bridge.soffit,
    ).toBeCloseTo(project.inputs.bridge.deck - project.inputs.bridge.soffit);
    view.rerender(
      <Simulation project={applied} update={update} notify={vi.fn()} />,
    );
    expect(
      (
        screen.getByRole("spinbutton", {
          name: "Roughness multiplier",
        }) as HTMLInputElement
      ).value,
    ).toBe("1");
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Roughness multiplier" }),
      { target: { value: "2" } },
    );
    await waitFor(() =>
      expect(
        vi.mocked(runCalculation).mock.calls.at(-1)![0].sections[0].n,
      ).toBeCloseTo(applied.inputs.sections[0].n * 2),
    );
  });
  it("recalculates a blockage change without a separate calculate click", async () => {
    const project = createProject(true);
    project.run = calculate(project.inputs);
    vi.mocked(runCalculation).mockImplementation(async (inputs) =>
      calculate(inputs),
    );
    const update = vi.fn();
    render(<Simulation project={project} update={update} notify={vi.fn()} />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Blockage · %" }), {
      target: { value: "30" },
    });
    await waitFor(() => expect(runCalculation).toHaveBeenCalled(), {
      timeout: 1500,
    });
    expect(
      vi.mocked(runCalculation).mock.calls.at(-1)![0].bridge.blockage,
    ).toBe(30);
    expect(project.inputs.bridge.blockage).toBe(0);
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Apply to project" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply to project" }));
    expect(update.mock.calls[0][0].inputs.bridge.blockage).toBe(30);
    expect(update.mock.calls[0][0].run.inputKey).toBe(
      calculate(update.mock.calls[0][0].inputs).inputKey,
    );
  });
});
