/**
 * LanguageSwitcherBlock — Puck block factory.
 *
 * This is a *factory* (not a plain exported object) because each site's
 * locale list is dynamic — we close over the values passed to
 * i18nPlugin() so the block always knows which locales to render without
 * the editor having to re-enter them as block props.
 *
 * The block definition itself is plain JSX and safe to import on the
 * server; the interactive UI lives in LanguageSwitcherClient.jsx which
 * carries its own "use client" directive.
 */

import { LanguageSwitcherClient } from "./LanguageSwitcherClient.jsx";

export function buildLanguageSwitcherBlock({ locales, localeMeta, defaultLocale }) {
  return {
    label: "Language Switcher",
    fields: {
      variant: {
        type: "select",
        label: "Variant",
        options: [
          { label: "Inline links", value: "inline" },
          { label: "Dropdown", value: "dropdown" },
        ],
      },
      labelStyle: {
        type: "select",
        label: "Label style",
        options: [
          { label: "Code (EN, AR)", value: "code" },
          { label: "Native (English, العربية)", value: "native" },
          { label: "English name (English, Arabic)", value: "english" },
          { label: "Both (العربية (AR))", value: "both" },
        ],
      },
      strategy: {
        type: "select",
        label: "URL strategy",
        options: [
          { label: "Cookie (no URL change)", value: "cookie" },
          { label: "Path prefix (/ar/about) — needs [locale] route", value: "prefix" },
          { label: "Query string (?lang=ar)", value: "query" },
        ],
      },
      align: {
        type: "select",
        label: "Alignment",
        options: [
          { label: "Start", value: "start" },
          { label: "Center", value: "center" },
          { label: "End", value: "end" },
        ],
      },
      separator: {
        type: "text",
        label: "Separator (inline only)",
      },
    },
    defaultProps: {
      variant: "inline",
      labelStyle: "code",
      // Cookie is the safe default — works on any site without
      // requiring a [locale] route segment or middleware setup.
      strategy: "cookie",
      align: "start",
      separator: "|",
    },
    // Only forward the user-facing fields. Puck also passes internal
    // helpers (renderDropZone, dragRef, metadata, isEditing…) into
    // every block's render function — spreading those into a Client
    // Component crashes the RSC serializer because they're functions.
    render: ({ variant, labelStyle, strategy, align, separator }) => (
      <LanguageSwitcherClient
        variant={variant}
        labelStyle={labelStyle}
        strategy={strategy}
        align={align}
        separator={separator}
        locales={locales}
        localeMeta={localeMeta}
        defaultLocale={defaultLocale}
      />
    ),
  };
}
