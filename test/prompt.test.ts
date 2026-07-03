import assert from "node:assert/strict";
import test from "node:test";
import {
  createCopilotSystemPrompt,
  createSystemPrompt,
} from "../src/agent/prompt.js";

test("copilot system prompt targets the real filesystem and Copilot's own tools", () => {
  const prompt = createCopilotSystemPrompt("init");

  assert.match(prompt, /running through the GitHub Copilot CLI/);
  assert.match(prompt, /real files in the repository/);
  // The engine-agnostic documentation policy is preserved.
  assert.match(prompt, /## OpenWiki/);
  assert.match(prompt, /This is an initial documentation run\./);
});

test("copilot system prompt drops DeepAgents-specific tooling instructions", () => {
  const prompt = createCopilotSystemPrompt("init");

  assert.doesNotMatch(prompt, /virtual paths such as \/README\.md/);
  assert.doesNotMatch(prompt, /task tool to parallelize/);
  assert.doesNotMatch(prompt, /write_file/);
  assert.doesNotMatch(prompt, /edit_file/);
});

test("the DeepAgents system prompt still carries its virtual-path tooling", () => {
  const prompt = createSystemPrompt("init");

  assert.match(prompt, /virtual paths such as \/README\.md/);
  assert.match(prompt, /write_file/);
});

test("copilot system prompt reflects the update mode", () => {
  const prompt = createCopilotSystemPrompt("update");

  assert.match(prompt, /This is a maintenance update run\./);
});
