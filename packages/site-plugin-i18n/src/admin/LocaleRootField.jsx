"use client";

/**
 * LocaleRootField — Puck custom field for the document's `locale`.
 *
 * Replaces the static select that used to be baked at boot from the
 * plugin's seed config. Fetches the live locale list from
 * /api/i18n/locales on mount so adding/removing a locale in the
 * Translations admin shows up in the editor immediately — no restart.
 *
 * Falls back to the seed list (passed via the closure in index.js) if
 * the API is unreachable so the editor still works offline.
 */

import { useEffect, useMemo, useState } from "react";
import { Select, Space, Typography } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { resolveLocaleMeta } from "../config.js";

function buildOptions(codes, meta) {
  return codes.map((code) => {
    const m = resolveLocaleMeta(code, meta);
    return { label: `${m.nativeLabel} (${code})`, value: code };
  });
}

export function LocaleRootField({
  value,
  onChange,
  seedLocales = [],
  seedMeta = {},
}) {
  const [locales, setLocales] = useState(seedLocales);
  const [localeMeta, setLocaleMeta] = useState(seedMeta);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/i18n/locales")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        // Only show enabled locales — disabled ones are kept around
        // for the admin UI but shouldn't be editable targets.
        const enabled = (data.localesDetailed || [])
          .filter((l) => l.enabled !== false)
          .map((l) => l.code);
        if (enabled.length) setLocales(enabled);
        const meta = {};
        for (const l of data.localesDetailed || []) {
          meta[l.code] = {
            label: l.label,
            nativeLabel: l.nativeLabel,
            dir: l.dir,
          };
        }
        setLocaleMeta(meta);
      })
      .catch(() => { /* keep seed values on network error */ });
    return () => { cancelled = true; };
  }, []);

  const options = useMemo(
    () => buildOptions(locales, localeMeta),
    [locales, localeMeta],
  );

  return (
    <Space direction="vertical" size={4} style={{ width: "100%" }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        <GlobalOutlined /> Language
      </Typography.Text>
      <Select
        value={value}
        options={options}
        onChange={onChange}
        style={{ width: "100%" }}
        size="middle"
      />
    </Space>
  );
}
