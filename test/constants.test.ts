import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultModelId,
  getProviderApiKeyEnvKey,
  getProviderConfig,
  isValidProvider,
  normalizeProvider,
  resolveConfiguredProvider,
  SELECTABLE_OPENWIKI_PROVIDERS,
} from "../src/constants.js";

test("copilot is a registered, selectable provider", () => {
  assert.equal(isValidProvider("copilot"), true);
  assert.ok(SELECTABLE_OPENWIKI_PROVIDERS.includes("copilot"));
});

test("normalizeProvider accepts and lower-cases copilot", () => {
  assert.equal(normalizeProvider("copilot"), "copilot");
  assert.equal(normalizeProvider("  COPILOT  "), "copilot");
  assert.equal(normalizeProvider("not-a-provider"), null);
});

test("copilot provider config uses the Copilot token and has no base URL", () => {
  const config = getProviderConfig("copilot");

  assert.equal(config.label, "GitHub Copilot");
  assert.equal(config.apiKeyEnvKey, "COPILOT_GITHUB_TOKEN");
  assert.equal(config.baseURL, undefined);
  assert.ok(config.modelOptions.length > 0);
  assert.equal(getProviderApiKeyEnvKey("copilot"), "COPILOT_GITHUB_TOKEN");
});

test("copilot default model is the first configured option", () => {
  assert.equal(getDefaultModelId("copilot"), "claude-sonnet-4.6");
});

test("resolveConfiguredProvider honors OPENWIKI_PROVIDER=copilot", () => {
  assert.equal(
    resolveConfiguredProvider({ OPENWIKI_PROVIDER: "copilot" }),
    "copilot",
  );
});
