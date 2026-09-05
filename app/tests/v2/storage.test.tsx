import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY, useWorkspace } from "@/v2/use-workspace";
import { calculate } from "@/v2/hydraulics";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("local workspace persistence", () => {
  it("persists project edits and restores them after remount", async () => {
    const a = renderHook(() => useWorkspace());
    await waitFor(() => expect(a.result.current.saved).toBe(true));
    act(() =>
      a.result.current.update({
        ...a.result.current.workspace!.projects[0],
        author: "Local engineer",
      }),
    );
    await waitFor(() => expect(a.result.current.saved).toBe(true));
    a.unmount();
    const b = renderHook(() => useWorkspace());
    await waitFor(() =>
      expect(b.result.current.workspace?.projects[0].author).toBe(
        "Local engineer",
      ),
    );
    b.unmount();
  });
  it("preserves corrupt storage and offers the original bytes for recovery", async () => {
    localStorage.setItem(STORAGE_KEY, "{invalid saved data");
    const h = renderHook(() => useWorkspace());
    await waitFor(() =>
      expect(h.result.current.storageError).toContain("could not be opened"),
    );
    expect(h.result.current.recovery()).toBe("{invalid saved data");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("{invalid saved data");
    expect(h.result.current.saved).toBe(false);
    h.unmount();
  });
  it("does not claim a save succeeded after quota failure", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const h = renderHook(() => useWorkspace());
    await waitFor(() =>
      expect(h.result.current.storageError).toContain("only in memory"),
    );
    expect(h.result.current.saved).toBe(false);
    h.unmount();
  });
  it("stops autosaving after another tab changes the workspace", async () => {
    const h = renderHook(() => useWorkspace());
    await waitFor(() => expect(h.result.current.saved).toBe(true));
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: "other tab",
        }),
      ),
    );
    expect(h.result.current.saved).toBe(false);
    expect(h.result.current.storageError).toContain("Another tab");
    h.unmount();
  });
  it("records an asynchronous run without overwriting newer input edits", async () => {
    const h = renderHook(() => useWorkspace());
    await waitFor(() => expect(h.result.current.workspace).not.toBeNull());
    const p = h.result.current.workspace!.projects[0],
      run = calculate(p.inputs);
    act(() =>
      h.result.current.update({
        ...p,
        inputs: { ...p.inputs, bridge: { ...p.inputs.bridge, blockage: 20 } },
      }),
    );
    act(() => h.result.current.recordRun(p.id, run));
    expect(h.result.current.workspace!.projects[0].inputs.bridge.blockage).toBe(
      20,
    );
    expect(
      h.result.current.workspace!.projects[0].run?.inputs.bridge.blockage,
    ).toBe(0);
    h.unmount();
  });
});
