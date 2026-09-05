import { afterEach, describe, expect, it, vi } from "vitest";
import { createProject } from "@/v2/model";
import { runCalculation } from "@/v2/run-calculation";
class FakeWorker {
  static instances: FakeWorker[] = [];
  terminate = vi.fn();
  postMessage = vi.fn();
  onmessage: ((event: unknown) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    FakeWorker.instances.push(this);
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.instances = [];
});
describe("calculation cancellation", () => {
  it("terminates a running worker when its preview is superseded", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const controller = new AbortController();
    const task = runCalculation(createProject(true).inputs, controller.signal);
    controller.abort();
    await expect(task).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce();
  });
  it("does not start an already cancelled calculation", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const controller = new AbortController();
    controller.abort();
    await expect(
      runCalculation(createProject(true).inputs, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeWorker.instances).toHaveLength(0);
  });
});
