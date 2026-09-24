import assert from "node:assert/strict";
import worker from "../worker/index.js";

const rows = [];
const db = {
  prepare(sql) {
    return {
      args: [],
      bind(...args) {
        this.args = args;
        return this;
      },
      async run() {
        if (sql.startsWith("INSERT")) {
          rows.push({ id: rows.length + 1, name: this.args[0], telegram: this.args[1], status: this.args[2], created_at: this.args[3] });
          return { meta: { last_row_id: rows.length, changes: 1 } };
        }
        const row = rows.find((item) => item.id === this.args[1]);
        if (!row) return { meta: { changes: 0 } };
        row.status = this.args[0];
        return { meta: { changes: 1 } };
      },
      async all() {
        return { results: [...rows].sort((a, b) => b.created_at - a.created_at) };
      },
    };
  },
};
const env = { DB: db, ADMIN_PASSWORD: "test-password-123" };

const createResponse = await worker.fetch(
  new Request("https://example.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Анна", telegram: "@anna", website: "" }),
  }),
  env,
);
assert.equal(createResponse.status, 201);
assert.equal(rows.length, 1);

const denied = await worker.fetch(new Request("https://example.test/api/admin/leads"), env);
assert.equal(denied.status, 401);

const listResponse = await worker.fetch(
  new Request("https://example.test/api/admin/leads", { headers: { authorization: "Bearer test-password-123" } }),
  env,
);
assert.equal(listResponse.status, 200);
assert.equal((await listResponse.json()).leads.length, 1);

const updateResponse = await worker.fetch(
  new Request("https://example.test/api/admin/leads/1", {
    method: "PATCH",
    headers: { authorization: "Bearer test-password-123", "content-type": "application/json" },
    body: JSON.stringify({ status: "contacted" }),
  }),
  env,
);
assert.equal(updateResponse.status, 200);
assert.equal(rows[0].status, "contacted");
console.log("Worker lead and admin API tests passed");
