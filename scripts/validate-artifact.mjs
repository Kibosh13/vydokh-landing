import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(root, "dist/server/index.js");
const hostingPath = resolve(root, "dist/.openai/hosting.json");
const wranglerPath = resolve(root, "dist/server/wrangler.json");

const [source, hostingSource, wranglerSource] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(hostingPath, "utf8"),
  readFile(wranglerPath, "utf8"),
  access(resolve(root, "dist/client/index.html")),
  access(resolve(root, "dist/client/admin/index.html")),
]);
const hosting = JSON.parse(hostingSource);
const wrangler = JSON.parse(wranglerSource);
assert.equal(hosting.d1, "DB");
assert.equal(hosting.static, undefined);
assert.equal(wrangler.assets.binding, "ASSETS");
assert.equal(wrangler.assets.run_worker_first, true);

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(typeof workerModule.default?.fetch, "function");
console.log("Artifact is valid and includes Worker, D1, admin UI, and static assets");
