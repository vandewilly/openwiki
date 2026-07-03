import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runOpenWikiAgent } from "../src/agent/index.js";

// Integration test: drive runOpenWikiAgent's copilot engine with a fake `copilot` binary
// on PATH, so the subprocess spawn, output streaming, metadata write, and error handling
// are exercised end-to-end without a real Copilot subscription.

function writeFakeCopilot(binDir: string, script: string): void {
  mkdirSync(binDir, { recursive: true });
  const bin = path.join(binDir, "copilot");
  writeFileSync(bin, script);
  chmodSync(bin, 0o755);
}

function initRepo(dir: string): void {
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "user.email", "test@example.com"], {
    cwd: dir,
  });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: dir });
  writeFileSync(path.join(dir, "README.md"), "# Sample\n");
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync("git", ["commit", "-qm", "init"], { cwd: dir });
}

async function withCopilotOnPath(
  binDir: string,
  run: () => Promise<void>,
): Promise<void> {
  const savedProvider = process.env.OPENWIKI_PROVIDER;
  const savedPath = process.env.PATH;
  process.env.OPENWIKI_PROVIDER = "copilot";
  process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH ?? ""}`;

  try {
    await run();
  } finally {
    restoreEnv("OPENWIKI_PROVIDER", savedProvider);
    restoreEnv("PATH", savedPath);
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

test("copilot engine spawns the CLI, streams output, and writes metadata", async () => {
  const workDir = mkdtempSync(path.join(tmpdir(), "openwiki-copilot-"));
  const repo = path.join(workDir, "repo");
  mkdirSync(repo);
  initRepo(repo);
  writeFakeCopilot(
    path.join(workDir, "bin"),
    "#!/bin/sh\nmkdir -p openwiki\nprintf '# Quickstart\\n' > openwiki/quickstart.md\necho FAKE_OK\nexit 0\n",
  );

  try {
    await withCopilotOnPath(path.join(workDir, "bin"), async () => {
      const streamed: string[] = [];
      const result = await runOpenWikiAgent("init", repo, {
        modelId: "claude-sonnet-4.6",
        onEvent: (event) => {
          if (event.type === "text") {
            streamed.push(event.text);
          }
        },
      });

      assert.equal(result.command, "init");
      assert.equal(result.model, "claude-sonnet-4.6");
      assert.match(streamed.join(""), /FAKE_OK/);
      assert.ok(
        existsSync(path.join(repo, "openwiki", "quickstart.md")),
        "copilot wrote docs into openwiki/",
      );

      const metadata = JSON.parse(
        readFileSync(path.join(repo, "openwiki", ".last-update.json"), "utf8"),
      ) as { command: string; model: string };
      assert.equal(metadata.command, "init");
      assert.equal(metadata.model, "claude-sonnet-4.6");
    });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});

test("copilot engine surfaces a non-zero Copilot exit as an error", async () => {
  const workDir = mkdtempSync(path.join(tmpdir(), "openwiki-copilot-"));
  const repo = path.join(workDir, "repo");
  mkdirSync(repo);
  initRepo(repo);
  writeFakeCopilot(
    path.join(workDir, "bin"),
    "#!/bin/sh\necho boom 1>&2\nexit 3\n",
  );

  try {
    await withCopilotOnPath(path.join(workDir, "bin"), async () => {
      await assert.rejects(
        runOpenWikiAgent("init", repo, { modelId: "claude-sonnet-4.6" }),
        /Copilot CLI exited with code 3/,
      );
    });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});
