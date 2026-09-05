// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { CodexClient } from "../../scripts/codex-client.mjs";

function client() {
  const c = new CodexClient();
  vi.spyOn(c, "start").mockResolvedValue(undefined);
  const request = vi.spyOn(c, "request").mockImplementation(async (method) => {
    if (method === "thread/start")
      return { thread: { id: "thread" }, model: "test-model" };
    if (method === "turn/start") return { turn: { id: "turn" } };
    return {};
  });
  return { c, request };
}
describe("Codex report transport", () => {
  it("collects only this thread's messages and resolves after turn completion", async () => {
    const { c, request } = client();
    const result = c.assess("report", "", new AbortController().signal);
    await vi.waitFor(() =>
      expect(request).toHaveBeenCalledWith("turn/start", expect.anything()),
    );
    c.emit("item/completed", {
      threadId: "other",
      item: { type: "agentMessage", id: "wrong", text: "Wrong assessment" },
    });
    c.emit("item/completed", {
      threadId: "thread",
      item: { type: "agentMessage", id: "message", text: "Draft assessment" },
    });
    c.emit("turn/completed", {
      threadId: "thread",
      turn: { status: "completed", items: [] },
    });
    expect(await result).toMatchObject({
      text: "Draft assessment",
      model: "test-model",
    });
    expect(request).toHaveBeenCalledWith(
      "thread/start",
      expect.objectContaining({
        sandbox: "read-only",
        approvalPolicy: "never",
        ephemeral: true,
      }),
    );
    expect(c.listenerCount("item/completed")).toBe(0);
  });
  it("interrupts cancellation and discards partial output", async () => {
    const { c, request } = client();
    const abort = new AbortController();
    const result = c.assess("report", "", abort.signal);
    const rejected = expect(result).rejects.toThrow("cancelled");
    await vi.waitFor(() =>
      expect(request).toHaveBeenCalledWith("turn/start", expect.anything()),
    );
    abort.abort();
    await rejected;
    expect(request).toHaveBeenCalledWith("turn/interrupt", {
      threadId: "thread",
      turnId: "turn",
    });
    expect(c.listenerCount("turn/completed")).toBe(0);
  });
  it("does not return failed or empty generations as completed reports", async () => {
    const { c, request } = client();
    const result = c.assess("report", "", new AbortController().signal);
    const rejected = expect(result).rejects.toThrow("complete assessment");
    await vi.waitFor(() =>
      expect(request).toHaveBeenCalledWith("turn/start", expect.anything()),
    );
    c.emit("turn/completed", {
      threadId: "thread",
      turn: { status: "failed", items: [] },
    });
    await rejected;
  });
});
