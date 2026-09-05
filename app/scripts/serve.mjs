import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalApi } from "./local-api.mjs";

const root = fileURLToPath(new URL("../out/", import.meta.url));
const port = Number(process.env.PORT || 3000);
const api = createLocalApi();
const dev = process.argv.includes("--dev");
let nextHandler;
if (dev) {
  const { default: next } = await import("next");
  const app = next({ dev: true, hostname: "127.0.0.1", port });
  await app.prepare();
  nextHandler = app.getRequestHandler();
}
process.on("SIGINT", () => {
  api.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  api.close();
  process.exit(0);
});
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};
try {
  if (!dev) await stat(path.join(root, "index.html"));
} catch {
  throw new Error("Build the application first with npm run build.");
}
http
  .createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (await api.handle(req, res)) return;
    if (nextHandler) {
      await nextHandler(req, res);
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end("Method not allowed");
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        root,
        `.${pathname === "/" ? "/index.html" : pathname}`,
      );
      if (!file.startsWith(root) || pathname.includes("\0")) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await readFile(file);
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] || "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        pathname.startsWith("/_next/static/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
      res.writeHead(200);
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        req.method === "HEAD"
          ? undefined
          : await readFile(path.join(root, "404.html")),
      );
    }
  })
  .listen(port, "127.0.0.1", () =>
    process.stdout.write(`BLC v2 ready at http://127.0.0.1:${port}\n`),
  );
