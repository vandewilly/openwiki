import assert from "node:assert/strict";
import test from "node:test";
import { createCopilotCliArgs, runOpenWikiAgent } from "../src/agent/index.js";

test("createCopilotCliArgs builds the non-interactive Copilot invocation", () => {
  const args = createCopilotCliArgs(
    "/repo",
    "claude-sonnet-4.6",
    "PROMPT-BODY",
  );

  assert.deepEqual(args, [
    "-p",
    "PROMPT-BODY",
    "-s",
    "--allow-all-tools",
    "--no-ask-user",
    "--add-dir",
    "/repo",
    "--model",
    "claude-sonnet-4.6",
  ]);
});

test("the copilot engine refuses interactive chat", async () => {
  const previous = process.env.OPENWIKI_PROVIDER;
  process.env.OPENWIKI_PROVIDER = "copilot";

  try {
    await assert.rejects(
      runOpenWikiAgent("chat", process.cwd(), {}),
      /Interactive chat is not supported for Copilot/,
    );
  } finally {
    if (previous === undefined) {
      delete process.env.OPENWIKI_PROVIDER;
    } else {
      process.env.OPENWIKI_PROVIDER = previous;
    }
  }
});
