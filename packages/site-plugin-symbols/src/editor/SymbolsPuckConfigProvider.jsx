"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PuckConfigProvider } from "@premast/site-core/admin";
import { withSymbolComponents } from "./augment-config.js";
import { SymbolBlockPreview } from "../blocks/SymbolBlockPreview.jsx";
import { SymbolInfoPanel } from "../fields/SymbolInfoField.jsx";

function GeneratedSymbolPreview({ symbolId, puck }) {
  return <SymbolBlockPreview symbolId={symbolId} isEditing={puck?.isEditing} />;
}

const renderers = {
  renderPreview: GeneratedSymbolPreview,
  renderInfo: (symbol) => <SymbolInfoPanel symbolId={String(symbol._id)} />,
};

/**
 * Drop-in replacement for `PuckConfigProvider` that registers every
 * published reusable component as its own block in the Puck palette.
 *
 * The component list lives in the database, but a Puck config is a plain
 * object built at import time — so the list has to be fetched and merged
 * in at runtime. That's what this does. Until the fetch resolves we
 * provide the base config, so editors are usable immediately and simply
 * gain the component entries a moment later.
 *
 * Note the palette is a snapshot taken at mount: a component created in
 * another tab won't appear until this one is reloaded.
 */
export function SymbolsPuckConfigProvider({ puckConfig, children }) {
  const [symbols, setSymbols] = useState([]);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    fetch("/api/symbols?published=true")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active.current && json?.data) setSymbols(json.data);
      })
      .catch(() => {
        // Non-fatal: the generic "Component" block still works.
      });
    return () => {
      active.current = false;
    };
  }, []);

  const augmented = useMemo(
    () => withSymbolComponents(puckConfig, symbols, renderers),
    [puckConfig, symbols],
  );

  return (
    <PuckConfigProvider puckConfig={augmented}>{children}</PuckConfigProvider>
  );
}
