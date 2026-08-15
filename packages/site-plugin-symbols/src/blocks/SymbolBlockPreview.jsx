"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Render } from "@puckeditor/core";
import { usePuckConfigOptional } from "@premast/site-core/admin";

/**
 * Guards against a component that somehow references itself (directly or
 * through a chain). Nesting is blocked in the component editor, but old
 * or hand-edited data could still contain a cycle, and rendering one
 * would recurse until the tab dies. Inside a preview we degrade to the
 * flat card instead of rendering further.
 */
const InsideSymbolPreview = createContext(false);

function parseContent(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed?.content) ? parsed : null;
  } catch {
    return null;
  }
}

/** The small "this is a reusable component" chip shown above a preview. */
function ComponentChip({ name, tone = "normal" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderBottomRightRadius: 6,
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontWeight: 600,
        pointerEvents: "none",
        background: tone === "warn" ? "#f5222d" : "rgba(94,106,210,0.9)",
        color: "#fff",
        zIndex: 2,
      }}
    >
      <span aria-hidden>🧩</span>
      {name}
    </div>
  );
}

function InfoCard({ title, detail, tone }) {
  const border = tone === "warn" ? "#f5222d" : "var(--theme-border, #d9d9d9)";
  return (
    <div
      style={{
        border: `1px dashed ${border}`,
        borderRadius: 8,
        padding: "18px 20px",
        margin: "4px 0",
        background: "var(--theme-surface, #fafafa)",
        color: "var(--theme-text, #1f1f1f)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }} aria-hidden>🧩</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6 }}>
          Reusable Component
        </div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        {detail ? <div style={{ fontSize: 12, opacity: 0.65 }}>{detail}</div> : null}
      </div>
    </div>
  );
}

/**
 * Editor-only preview of a SymbolBlock.
 *
 * Renders the component's *actual* content, using the same Puck config
 * and `<Render>` the live site uses, so the editor shows what the page
 * will really look like rather than a placeholder.
 *
 * The preview is deliberately inert (`pointer-events: none`): a component
 * is edited centrally on its own page, so clicking inside it here selects
 * the reference block rather than its internals.
 *
 * Renders nothing outside the editor — on the real front end the
 * expandSymbols hook has already replaced this block with the component's
 * content, so reaching here un-expanded means the component is
 * missing/unpublished; we stay silent rather than leak scaffolding into
 * the live page.
 */
export function SymbolBlockPreview({ symbolId, isEditing }) {
  const [symbol, setSymbol] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | found | unpublished | missing
  const reqSeq = useRef(0);
  const puckConfig = usePuckConfigOptional();
  const nested = useContext(InsideSymbolPreview);

  useEffect(() => {
    if (!symbolId) {
      setStatus("idle");
      setSymbol(null);
      return;
    }
    const seq = ++reqSeq.current;
    setStatus("loading");
    fetch(`/api/symbols/${symbolId}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (seq !== reqSeq.current) return;
        if (ok && j.data) {
          setSymbol(j.data);
          setStatus(j.data.published ? "found" : "unpublished");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (seq === reqSeq.current) setStatus("missing");
      });
  }, [symbolId]);

  if (!isEditing) return null;

  if (status === "idle")
    return <InfoCard title="No component selected" detail="Pick a component in the right panel." />;
  if (status === "loading") return <InfoCard title="Loading…" />;
  if (status === "missing")
    return (
      <InfoCard
        tone="warn"
        title="Component not found"
        detail="It may have been deleted. Pick another in the right panel."
      />
    );

  const data = parseContent(symbol?.content);
  const name = symbol?.name || "Component";

  // Fall back to the card whenever we can't safely render the real thing.
  if (nested)
    return <InfoCard title={name} detail="Nested component — shown flat to avoid a render loop." />;
  if (!puckConfig)
    return <InfoCard title={name} detail="Edited centrally — changes apply to every page using it." />;
  if (!data || data.content.length === 0)
    return <InfoCard title={name} detail="This component is empty. Open it to add blocks." />;

  return (
    <InsideSymbolPreview.Provider value={true}>
      <div style={{ position: "relative" }}>
        <ComponentChip name={name} tone={status === "unpublished" ? "warn" : "normal"} />
        {status === "unpublished" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              background: "#f5222d",
              color: "#fff",
              borderBottomLeftRadius: 6,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            Draft — won't show live
          </div>
        )}
        {/* Inert: the component is atomic here, edited on its own page. */}
        <div style={{ pointerEvents: "none" }}>
          <Render config={puckConfig} data={data} />
        </div>
      </div>
    </InsideSymbolPreview.Provider>
  );
}
