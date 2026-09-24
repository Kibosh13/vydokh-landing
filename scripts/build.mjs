import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = resolve(root, "dist");
const client = resolve(dist, "client");
const server = resolve(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, ".openai"), { recursive: true });
await mkdir(server, { recursive: true });
await cp(resolve(root, "site"), client, { recursive: true });
await cp(resolve(root, "worker/index.js"), resolve(server, "index.js"));
await cp(resolve(root, ".openai/hosting.json"), resolve(dist, ".openai/hosting.json"));

const hosting = JSON.parse(await readFile(resolve(root, ".openai/hosting.json"), "utf8"));
const wrangler = {
  main: "./index.js",
  compatibility_date: "2026-05-22",
  assets: {
    directory: "../client",
    binding: "ASSETS",
    run_worker_first: true,
  },
  d1_databases: hosting.d1
    ? [
        {
          binding: hosting.d1,
          database_name: "site-creator-d1",
          database_id: "00000000-0000-4000-8000-000000000000",
        },
      ]
    : [],
};
await writeFile(resolve(server, "wrangler.json"), `${JSON.stringify(wrangler, null, 2)}\n`);

console.log(`Built ${dist}`);
