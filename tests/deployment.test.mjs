import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("runtime data and build artifacts stay outside Git", async () => {
  const ignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  for (const entry of [".env", "instance/", ".next/", "node_modules/", ".deploy/"]) {
    assert.match(ignore, new RegExp(`^${entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  }
});

test("Pterodactyl bootstrap pins install and caches successful builds", async () => {
  const script = await readFile(new URL("../scripts/pterodactyl-start.mjs", import.meta.url), "utf8");
  assert.match(script, /npm.*ci/s);
  assert.match(script, /package-lock\.sha256/);
  assert.match(script, /built-commit/);
  assert.match(script, /next.*start/s);
});
