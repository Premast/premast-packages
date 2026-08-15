"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Tag, Typography } from "antd";
import { EditOutlined } from "@ant-design/icons";

const { Text } = Typography;

const labelStyle = {
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--puck-color-grey-05, #6b7280)",
};

/**
 * Sidebar panel shown when a reusable component reference is selected on a
 * page.
 *
 * A generated `SymbolRef_<id>` block has no editable props — which
 * component it is *is* its type — so without this the properties panel
 * renders completely empty. This gives that space a job: say what the
 * component is, whether it's live, how widely it's used, and offer the one
 * action that makes sense here — open it for editing.
 */
export function SymbolInfoPanel({ symbolId }) {
  const [symbol, setSymbol] = useState(null);
  const [usage, setUsage] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | found | missing
  const reqSeq = useRef(0);

  useEffect(() => {
    if (!symbolId) {
      setStatus("missing");
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
          setStatus("found");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (seq === reqSeq.current) setStatus("missing");
      });

    // Usage is supplementary — it must never gate the panel or the button.
    fetch(`/api/symbols/${symbolId}/usage`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (seq === reqSeq.current && j?.data) setUsage(j.data.total);
      })
      .catch(() => {});
  }, [symbolId]);

  if (status === "loading") {
    return <Text type="secondary" style={{ fontSize: 12 }}>Loading component…</Text>;
  }

  if (status === "missing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Tag color="red" style={{ marginInlineEnd: 0, alignSelf: "flex-start" }}>
          Component not found
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          It may have been deleted. Delete this block, or pick another component.
        </Text>
        <Button size="small" href="/admin/components" icon={<EditOutlined />}>
          Manage components
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={labelStyle}>Reusable component</div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginTop: 2 }}>
          {symbol.name}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <Tag color={symbol.published ? "green" : "orange"} style={{ marginInlineEnd: 0 }}>
          {symbol.published ? "Published" : "Draft"}
        </Tag>
        {usage !== null && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Used in {usage} {usage === 1 ? "place" : "places"}
          </Text>
        )}
      </div>

      {!symbol.published && (
        <Text type="warning" style={{ fontSize: 12 }}>
          This component is a draft — it won't appear on the live page until it's
          published.
        </Text>
      )}

      <Button
        size="small"
        type="primary"
        icon={<EditOutlined />}
        href={`/admin/components?id=${symbol._id}`}
        block
      >
        Edit component
      </Button>

      <Text type="secondary" style={{ fontSize: 12 }}>
        Edited centrally — changes apply to every page using it.
      </Text>
    </div>
  );
}
