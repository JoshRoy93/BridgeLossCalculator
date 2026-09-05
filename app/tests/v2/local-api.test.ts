// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, request, type Server } from "node:http";
import { CodexClient } from "../../scripts/codex-client.mjs";
import { createLocalApi } from "../../scripts/local-api.mjs";
const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
async function service() {
  const client = new CodexClient();
  vi.spyOn(client, "start").mockResolvedValue(undefined);
  vi.spyOn(client, "account").mockResolvedValue({
    type: "chatgpt",
    email: "test@example.com",
    plan: "test",
  });
  vi.spyOn(client, "request").mockResolvedValue({
    authUrl: "https://auth.openai.com/authorize?state=test",
    loginId: "login-1",
  });
  vi.spyOn(client, "assess").mockResolvedValue({
    text: "Draft",
    date: "2026-09-05",
    model: "test",
  });
  const api = createLocalApi(client);
  const server = createServer(async (req, res) => {
    if (!(await api.handle(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No address");
  const url = `http://127.0.0.1:${address.port}`;
  const post = (route: string, body = {}) =>
    fetch(`${url}/api/local/${route}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-blc-local": "1",
        origin: url,
      },
      body: JSON.stringify(body),
    });
  return { client, url, post };
}
describe("local account and assessment API", () => {
  it("rejects cross-site requests and POSTs without the local header", async () => {
    const { url, client } = await service();
    expect(
      (await fetch(`${url}/api/local/login`, { method: "POST" })).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${url}/api/local/account`, {
          headers: { origin: "https://untrusted.example" },
        })
      ).status,
    ).toBe(403);
    const status = await new Promise((resolve) => {
      const req = request(
        `${url}/api/local/account`,
        { headers: { host: "untrusted.example:3000" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.end();
    });
    expect(status).toBe(403);
    expect(client.request).not.toHaveBeenCalled();
  });
  it("starts official login, reports completion and delegates logout", async () => {
    const { post, url, client } = await service();
    expect((await post("login")).status).toBe(200);
    expect(client.request).toHaveBeenCalledWith("account/login/start", {
      type: "chatgpt",
    });
    expect(
      (await (await fetch(`${url}/api/local/account`)).json()).pending,
    ).toBe(true);
    client.emit("account/login/completed", { success: true });
    expect(
      (await (await fetch(`${url}/api/local/account`)).json()).pending,
    ).toBe(false);
    await post("logout");
    expect(client.request).toHaveBeenCalledWith("account/logout");
  });
  it("generates only after sign-in and does not expose upstream errors", async () => {
    const { post, client } = await service();
    const body = { report: "Current results", model: "", tone: "technical" };
    expect(await (await post("assessment", body)).json()).toEqual({
      text: "Draft",
      date: "2026-09-05",
      model: "test",
    });
    expect(vi.mocked(client.assess).mock.calls[0][0]).toContain(
      "Current results",
    );
    vi.mocked(client.account).mockRejectedValueOnce(
      new Error("sensitive-upstream-value"),
    );
    expect(
      JSON.stringify(await (await post("assessment", body)).json()),
    ).not.toContain("sensitive-upstream-value");
    vi.mocked(client.account).mockResolvedValueOnce(null);
    expect((await post("assessment", body)).status).toBe(401);
    expect(
      (await post("assessment", { ...body, tone: "unknown" })).status,
    ).toBe(400);
  });
});
