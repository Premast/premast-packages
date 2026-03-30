"use client";

import { useState, useEffect, useRef } from "react";

const LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--theme-text-muted, #999)",
  letterSpacing: "0.02em",
  marginBottom: 4,
};

/**
 * Monaco-based code editor field for Puck.
 * Loads Monaco lazily to avoid SSR issues and reduce initial bundle.
 */
export function CodeEditorField({ value, onChange, field }) {
  const [MonacoEditor, setMonacoEditor] = useState(null);
  const [local, setLocal] = useState(value ?? "");
  const timerRef = useRef(null);

  // Sync from parent only when not actively editing
  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  // Lazy-load Monaco
  useEffect(() => {
    let cancelled = false;
    import("@monaco-editor/react").then((mod) => {
      if (!cancelled) setMonacoEditor(() => mod.default);
    }).catch(() => {
      // Monaco failed to load — fallback to textarea
    });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (val) => {
    setLocal(val || "");
    // Debounce updates to Puck to avoid re-render lag
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(val || "");
    }, 300);
  };

  const language = field?.language || (field?.label?.toLowerCase().includes("css") ? "css" : "javascript");
  const height = field?.editorHeight || 200;

  // Fallback textarea if Monaco doesn't load
  if (!MonacoEditor) {
    return (
      <div>
        {field?.label && <div style={LABEL_STYLE}>{field.label}</div>}
        <textarea
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: "100%",
            height,
            fontFamily: "monospace",
            fontSize: 13,
            padding: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            background: "rgba(0,0,0,0.2)",
            color: "#e0e0e0",
            resize: "vertical",
          }}
          placeholder={field?.placeholder || "Write code here..."}
        />
      </div>
    );
  }

  return (
    <div>
      {field?.label && <div style={LABEL_STYLE}>{field.label}</div>}
      <div style={{
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 6,
        overflow: "hidden",
      }}>
        <MonacoEditor
          height={height}
          language={language}
          value={local}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}

/**
 * Simple CSS editor — same component with CSS language preset.
 */
export function CssEditorField(props) {
  return <CodeEditorField {...props} field={{ ...props.field, language: "css" }} />;
}
