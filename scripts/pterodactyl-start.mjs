import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const deployDirectory = path.join(root, ".deploy");
const lockStateFile = path.join(deployDirectory, "package-lock.sha256");
const commitStateFile = path.join(deployDirectory, "built-commit");
const packageLock = path.join(root, "package-lock.json");
const nextBinary = path.join(root, "node_modules", "next", "dist", "bin", "next");

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit", env: process.env });
}

function fileHash(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function readState(file) {
  return existsSync(file) ? readFileSync(file, "utf8").trim() : "";
}

mkdirSync(deployDirectory, { recursive: true });

const lockHash = fileHash(packageLock);
const dependenciesReady = existsSync(nextBinary) && readState(lockStateFile) === lockHash;

if (!dependenciesReady) {
  console.log("[deploy] package-lock changed; installing exact dependencies...");
  run("npm", ["ci", "--no-audit", "--no-fund"]);
  writeFileSync(lockStateFile, `${lockHash}\n`, { mode: 0o600 });
} else {
  console.log("[deploy] dependencies are current; skipping npm ci.");
}

let commit = "unknown";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {
  console.warn("[deploy] git commit unavailable; forcing a build.");
}

const buildReady = existsSync(path.join(root, ".next", "BUILD_ID")) && readState(commitStateFile) === commit;
if (!buildReady) {
  console.log(`[deploy] building commit ${commit.slice(0, 12)}...`);
  run("npm", ["run", "build"]);
  writeFileSync(commitStateFile, `${commit}\n`, { mode: 0o600 });
} else {
  console.log(`[deploy] commit ${commit.slice(0, 12)} is already built; skipping next build.`);
}

const port = process.env.SERVER_PORT || process.env.PORT || "8080";
console.log(`[deploy] starting Wickedhost Docs on 0.0.0.0:${port}`);
const child = spawn(process.execPath, [nextBinary, "start", "-H", "0.0.0.0", "-p", port], {
  cwd: root,
  env: { ...process.env, PORT: port },
  stdio: "inherit",
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
