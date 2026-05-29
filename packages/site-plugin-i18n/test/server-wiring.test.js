import { test } from "node:test";
import assert from "node:assert/strict";

import { i18nPluginServer } from "../src/server.js";

// Silent-failure bug regression: calling the factory returns a plugin
// object with apiRoutes / models / hooks. Spreading the factory without
// calling it used to yield an empty object and register nothing — this
// test pins both the happy path and the fail-loud guard.

test("i18nPluginServer(config) returns a plugin object with the locales routes", () => {
  const ext = i18nPluginServer({ locales: ["en", "ar"], defaultLocale: "en" });

  assert.ok(Array.isArray(ext.apiRoutes), "apiRoutes should be an array");
  assert.ok(ext.apiRoutes.length > 0, "apiRoutes should be non-empty");

  const localeRoutes = ext.apiRoutes.filter((r) => r.path === "i18n/locales");
  assert.ok(
    localeRoutes.some((r) => r.method === "GET"),
    "GET /api/i18n/locales must be registered",
  );
  assert.ok(
    localeRoutes.some((r) => r.method === "POST"),
    "POST /api/i18n/locales must be registered",
  );

  assert.ok(ext.models?.LocaleSetting, "LocaleSetting model must be registered");
  assert.equal(typeof ext.hooks?.afterDbConnect, "function");
});

test("spreading i18nPluginServer without calling it fails loudly", () => {
  assert.throws(
    () => {
      // Mimics the buggy wiring `{ name: "i18n", ...i18nPluginServer }` —
      // spreading a function copies no enumerable properties, so the old
      // behaviour was a silent no-op. The guards must turn that into an
      // explicit error.
      const wired = { name: "i18n", ...i18nPluginServer };
      void wired;
    },
    /factory/i,
    "spreading the factory must throw, not silently drop routes",
  );
});
