# @premast/site-plugin-i18n — Changelog

## Unreleased

### Fixed — silent-failure wiring bug

`i18nPluginServer` is a factory function: it must be **called** with your
plugin config before being spread into `serverPlugins`. Sites that spread
the factory itself (rather than the object it returns) would silently
register zero API routes, models, and hooks — including the
`/api/i18n/locales` endpoint that the admin UI uses to list and add
locales.

Symptoms of the old wiring bug:

- `GET /api/i18n/locales` returned 404.
- The `localesettings` collection was never created in MongoDB.
- Admin "add locale" actions returned "not found".
- No error was logged — total silent failure.

### Migration

Check your `site.config.js`. If you see this:

```js
serverPlugins: async () => {
  const { i18nPluginServer } = await import("@premast/site-plugin-i18n/server");
  return [{ name: "i18n", ...i18nPluginServer }]; // ← BUG
};
```

Change it to call the factory with the paired `i18nPlugin()` config:

```js
const i18n = i18nPlugin({ locales: ["en", "ar"], defaultLocale: "en" });

createSiteConfig({
  plugins: [i18n, /* ... */],
  serverPlugins: async () => {
    const { i18nPluginServer } = await import("@premast/site-plugin-i18n/server");
    return [{ name: "i18n", ...i18nPluginServer(i18n.config) }];
  },
});
```

Starting with this release, spreading the uncalled factory throws at boot
with an actionable error instead of silently dropping routes. Projects
scaffolded with `npx create-premast-site` or `premast add-plugin
@premast/site-plugin-i18n` now generate the correct wiring automatically.
