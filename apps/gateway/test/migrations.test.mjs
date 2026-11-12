import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("preserves the original Durable Object and renames its namespace", async () => {
  const configPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
    "wrangler.jsonc",
  );
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assert.deepEqual(config.migrations.slice(0, 2), [
    { tag: "v1", new_sqlite_classes: ["OpenCodeAgent"] },
    {
      tag: "v2",
      renamed_classes: [{ from: "OpenCodeAgent", to: "PaulibabyAgent" }],
    },
  ]);
  assert.ok(
    config.durable_objects.bindings.some(
      (binding) =>
        binding.name === "PaulibabyAgent" &&
        binding.class_name === "PaulibabyAgent",
    ),
  );
});
