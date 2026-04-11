"use client";

/**
 * LanguageSwitcherClient — the interactive half of the LanguageSwitcher
 * Puck block. Split out so the block's `render` function stays server-safe
 * (the block definition itself is imported by both server and client).
 *
 * Strategies:
 *  - "prefix": swap the first URL segment (/ar/about → /fr/about). Use this
 *    once the site is wired up with an `app/[locale]/` route segment.
 *  - "query":  ?lang=ar. Works on any site without touching routing; the
 *    layout's resolveGlobal()/resolvePage() needs to honor the param.
 *
 * We use plain anchor tags (not <Link>) so this component has zero
 * dependency on `next/link` — important because the plugin is consumed
 * from both Pages-router and App-router sites.
 */

import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Select } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { resolveLocaleMeta, getLocaleDir } from "../config.js";

const LOCALE_COOKIE = "premast_locale";

function readLocaleCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeLocaleCookie(value) {
  if (typeof document === "undefined") return;
  // 1 year, root path so the layout can read it on every route
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

function swapLocaleInPath(pathname, locales, target) {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] && locales.includes(segs[0])) {
    segs[0] = target;
  } else {
    segs.unshift(target);
  }
  return "/" + segs.join("/");
}

function readCurrentLocale({ strategy, pathname, searchParams, locales, defaultLocale }) {
  if (strategy === "query") {
    const fromQuery = searchParams?.get?.("lang");
    if (fromQuery && locales.includes(fromQuery)) return fromQuery;
  }
  if (strategy === "prefix") {
    const segs = (pathname || "/").split("/").filter(Boolean);
    if (segs[0] && locales.includes(segs[0])) return segs[0];
  }
  // Cookie strategy (and fallback for any strategy): trust the cookie if set
  const fromCookie = readLocaleCookie();
  if (fromCookie && locales.includes(fromCookie)) return fromCookie;
  return defaultLocale;
}

function renderLabel(code, labelStyle, localeMeta) {
  const meta = resolveLocaleMeta(code, localeMeta);
  switch (labelStyle) {
    case "native":
      return meta.nativeLabel || code.toUpperCase();
    case "english":
      return meta.label || code.toUpperCase();
    case "both":
      return `${meta.nativeLabel || code} (${code.toUpperCase()})`;
    case "code":
    default:
      return code.toUpperCase();
  }
}

export function LanguageSwitcherClient({
  variant = "inline",
  labelStyle = "code",
  separator = "|",
  strategy = "cookie",
  align = "start",
  locales: seedLocales,
  localeMeta: seedMeta,
  defaultLocale: seedDefault,
}) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const router = useRouter();

  // Hydrate the live locale list from the API so adds/removes in the
  // admin take effect without re-saving every page that contains a
  // LanguageSwitcher block. The seed values (passed in by the block
  // factory) are used until the fetch resolves, so SSR keeps showing
  // a sensible list and there's no flash of empty content.
  const [locales, setLocales] = useState(seedLocales || []);
  const [localeMeta, setLocaleMeta] = useState(seedMeta || {});
  const [defaultLocale, setDefaultLocale] = useState(seedDefault);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/i18n/locales")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        // Filter out any disabled locales — the API returns them in
        // localesDetailed so the admin UI can manage them, but the
        // public switcher should only show the enabled ones.
        const enabled = (data.localesDetailed || [])
          .filter((l) => l.enabled !== false)
          .map((l) => l.code);
        if (enabled.length) setLocales(enabled);
        // Build a meta object keyed by code for the renderLabel helper.
        const meta = {};
        for (const l of data.localesDetailed || []) {
          meta[l.code] = { label: l.label, nativeLabel: l.nativeLabel, dir: l.dir };
        }
        setLocaleMeta(meta);
        if (data.defaultLocale) setDefaultLocale(data.defaultLocale);
      })
      .catch(() => { /* keep seed values on network error */ });
    return () => { cancelled = true; };
  }, []);

  const current = readCurrentLocale({
    strategy, pathname, searchParams, locales, defaultLocale,
  });

  const hrefFor = (target) => {
    if (strategy === "query") {
      const params = new URLSearchParams(searchParams?.toString?.() || "");
      params.set("lang", target);
      return `${pathname}?${params.toString()}`;
    }
    if (strategy === "prefix") {
      return swapLocaleInPath(pathname, locales, target);
    }
    // cookie strategy: stay on the same URL
    return pathname;
  };

  // Always write the cookie on click — even in prefix/query strategies.
  // This way the layout has a single source of truth (the cookie) until
  // the site adds an [locale] route segment, and prefix mode keeps
  // working seamlessly when it does.
  const handleSelect = (target) => {
    writeLocaleCookie(target);
    // For cookie mode the URL doesn't change, so a server roundtrip
    // is needed to re-render the layout with the new locale.
    if (strategy === "cookie") {
      router.refresh();
    }
  };

  const justify = align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start";

  if (variant === "dropdown") {
    const options = locales.map((code) => {
      const meta = resolveLocaleMeta(code, localeMeta);
      return {
        value: code,
        // Render the option with its native label so RTL locales
        // get their proper script in the dropdown menu, regardless
        // of the labelStyle setting (which only affects what shows
        // in the closed trigger).
        label: (
          <span dir={meta.dir} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ opacity: 0.55, fontSize: "0.85em", textTransform: "uppercase" }}>
              {code}
            </span>
            <span>{renderLabel(code, labelStyle === "code" ? "native" : labelStyle, localeMeta)}</span>
          </span>
        ),
      };
    });

    return (
      <div style={{ display: "flex", justifyContent: justify }}>
        <Select
          aria-label="Language"
          value={current}
          onChange={(target) => {
            if (!target || target === current) return;
            handleSelect(target);
            if (strategy !== "cookie") {
              window.location.href = hrefFor(target);
            }
          }}
          options={options}
          variant="borderless"
          suffixIcon={<GlobalOutlined />}
          popupMatchSelectWidth={false}
          style={{ minWidth: 120 }}
        />
      </div>
    );
  }

  // inline variant
  return (
    <nav
      aria-label="Language"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: justify,
        gap: 6,
        flexWrap: "wrap",
      }}
    >
      {locales.map((code, i) => {
        const isCurrent = code === current;
        return (
          <span key={code} style={{ display: "inline-flex", alignItems: "center" }}>
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{ opacity: 0.4, margin: "0 6px", userSelect: "none" }}
              >
                {separator}
              </span>
            )}
            <a
              href={hrefFor(code)}
              hrefLang={code}
              dir={getLocaleDir(code, localeMeta)}
              aria-current={isCurrent ? "true" : undefined}
              onClick={(e) => {
                if (isCurrent) {
                  e.preventDefault();
                  return;
                }
                handleSelect(code);
                // Cookie mode: prevent the href navigation entirely;
                // router.refresh() in handleSelect re-renders the
                // server layout with the new locale.
                if (strategy === "cookie") {
                  e.preventDefault();
                }
              }}
              style={{
                textDecoration: "none",
                fontWeight: isCurrent ? 700 : 400,
                opacity: isCurrent ? 1 : 0.75,
                color: "inherit",
                cursor: isCurrent ? "default" : "pointer",
                textTransform: labelStyle === "code" ? "uppercase" : "none",
              }}
            >
              {renderLabel(code, labelStyle, localeMeta)}
            </a>
          </span>
        );
      })}
    </nav>
  );
}
