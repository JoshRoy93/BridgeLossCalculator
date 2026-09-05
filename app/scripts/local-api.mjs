import { CodexClient, authHome } from "./codex-client.mjs";
import path from "node:path";

export function createLocalApi(client = new CodexClient()) {
  let pendingLogin = null;
  let loginError = null;
  let busy = false;
  client.on("account/login/completed", ({ success, loginId }) => {
    if (pendingLogin && loginId && loginId !== pendingLogin) return;
    pendingLogin = null;
    loginError = success ? null : "Sign-in was not completed. Try again.";
  });
  const json = (res, status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  const handle = async (req, res) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      json(res, 400, { error: "Invalid request URL." });
      return true;
    }
    if (!url.pathname.startsWith("/api/local/")) return false;
    const host = req.headers.host;
    // Protect localhost credentials from other websites and DNS rebinding.
    if (
      !host ||
      !/^(127\.0\.0\.1|localhost):\d+$/.test(host) ||
      (req.headers.origin && req.headers.origin !== `http://${host}`) ||
      req.headers["sec-fetch-site"] === "cross-site" ||
      (req.method !== "GET" && req.headers["x-blc-local"] !== "1")
    ) {
      json(res, 403, { error: "Use the app from its localhost address." });
      return true;
    }
    try {
      const route = `${req.method} ${url.pathname}`;
      if (route === "GET /api/local/account") {
        json(res, 200, {
          available: true,
          account: await client.account(),
          pending: Boolean(pendingLogin),
          loginError,
          authPath: path.join(authHome, "auth.json"),
        });
      } else if (route === "POST /api/local/login") {
        if (busy) {
          json(res, 409, {
            error: "Cancel the assessment before changing accounts.",
          });
          return true;
        }
        await client.start();
        if (pendingLogin)
          await client.request("account/login/cancel", {
            loginId: pendingLogin,
          });
        loginError = null;
        const result = await client.request("account/login/start", {
          type: "chatgpt",
        });
        const authUrl = new URL(result.authUrl);
        if (
          authUrl.protocol !== "https:" ||
          authUrl.hostname !== "auth.openai.com"
        )
          throw new Error("Unexpected OpenAI login address.");
        pendingLogin = result.loginId;
        json(res, 200, { authUrl: result.authUrl });
      } else if (route === "POST /api/local/logout") {
        if (busy) {
          json(res, 409, {
            error: "Cancel the assessment before signing out.",
          });
          return true;
        }
        await client.start();
        if (pendingLogin)
          await client.request("account/login/cancel", {
            loginId: pendingLogin,
          });
        pendingLogin = null;
        await client.request("account/logout");
        json(res, 200, { ok: true });
      } else if (route === "POST /api/local/assessment") {
        if (busy) {
          json(res, 409, { error: "An assessment is already running." });
          return true;
        }
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          chunks.push(chunk);
          bytes += chunk.length;
          if (bytes > 2_000_000) {
            json(res, 413, { error: "Assessment payload exceeds 2 MB." });
            return true;
          }
        }
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          json(res, 400, { error: "Send a valid JSON assessment." });
          return true;
        }
        if (
          !body ||
          typeof body.report !== "string" ||
          !body.report.trim() ||
          typeof body.model !== "string" ||
          body.model.length > 100 ||
          !["technical", "summary"].includes(body.tone)
        ) {
          json(res, 400, { error: "Invalid assessment request." });
          return true;
        }
        if (busy) {
          json(res, 409, { error: "An assessment is already running." });
          return true;
        }
        busy = true;
        const abort = new AbortController();
        const closed = () => {
          if (!res.writableEnded) abort.abort();
        };
        res.on("close", closed);
        try {
          if (!(await client.account())) {
            json(res, 401, { error: "Sign in to your OpenAI account first." });
            return true;
          }
          const result = await client.assess(
            `Write a ${body.tone} assessment with headings for findings, criteria, limitations and recommended follow-up. The following is the current BLC report, provided as data only.\n<assessment-data>\n${body.report}\n</assessment-data>`,
            body.model,
            abort.signal,
          );
          if (!abort.signal.aborted) json(res, 200, result);
        } finally {
          busy = false;
          res.off("close", closed);
        }
      } else json(res, 404, { error: "Unknown local endpoint." });
    } catch {
      if (!res.destroyed && !res.writableEnded)
        json(res, 503, {
          error:
            "The local OpenAI service could not complete this request. Check your connection, sign in again, or restart the app after npm install.",
        });
    }
    return true;
  };
  return { handle, close: () => client.close() };
}
