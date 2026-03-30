"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useId,
  createElement,
  Fragment,
} from "react";
import * as AntD from "antd";
import * as AntIcons from "@ant-design/icons";

/**
 * Transpile JSX code to plain JS using Sucrase.
 * Loaded dynamically to keep it off the SSR bundle.
 */
let sucraseTransform = null;
async function loadSucrase() {
  if (sucraseTransform) return sucraseTransform;
  const mod = await import("sucrase");
  sucraseTransform = mod.transform;
  return sucraseTransform;
}

/**
 * Build a React component function from transpiled code.
 * The code is wrapped so that hooks like useState work properly.
 */
function buildComponentClass(transpiledCode, scope) {
  const scopeKeys = Object.keys(scope);
  const scopeValues = Object.values(scope);

  // Wrap the user code in a component function body.
  // The user code should contain `return (<JSX>)` with optional hooks before it.
  const componentBody = `
    "use strict";
    return function CustomUserComponent() {
      ${transpiledCode}
    };
  `;

  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(...scopeKeys, componentBody);
    return factory(...scopeValues);
  } catch (err) {
    return null;
  }
}

/**
 * Reserved words that can't be used as function parameter names.
 */
const RESERVED = new Set([
  "default", "import", "export", "class", "return", "function",
  "var", "let", "const", "new", "delete", "typeof", "void",
  "in", "of", "with", "switch", "case", "break", "continue",
  "throw", "try", "catch", "finally", "debugger", "do", "while",
  "for", "if", "else", "this", "super", "yield", "async", "await",
]);

/**
 * Build a safe scope object — filters out reserved word keys.
 */
function getScope() {
  const scope = {
    // React
    React,
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
    createElement,
    Fragment,
  };

  // Add Ant Design exports (skip reserved words)
  for (const [key, value] of Object.entries(AntD)) {
    if (!RESERVED.has(key)) scope[key] = value;
  }

  // Add Ant Icons (skip reserved words)
  for (const [key, value] of Object.entries(AntIcons)) {
    if (!RESERVED.has(key)) scope[key] = value;
  }

  return scope;
}

/**
 * Renders user-provided JSX code as a live React component.
 */
export function CustomBlockRenderer({ code, css, blockId }) {
  const [UserComponent, setUserComponent] = useState(null);
  const [error, setError] = useState(null);
  const scopeId = useId().replace(/:/g, "_");
  const cssClass = `custom-block-${blockId || scopeId}`;

  useEffect(() => {
    if (!code?.trim()) {
      setUserComponent(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const transform = await loadSucrase();
        if (cancelled) return;

        const result = transform(code, {
          transforms: ["jsx"],
          jsxRuntime: "classic",
          jsxPragma: "createElement",
          jsxFragmentPragma: "Fragment",
          production: true,
        });

        const scope = getScope();
        const Comp = buildComponentClass(result.code, scope);

        if (!cancelled) {
          if (Comp) {
            setUserComponent(() => Comp);
            setError(null);
          } else {
            setError("Failed to build component. Check your code syntax.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setUserComponent(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  // Inject scoped CSS
  useEffect(() => {
    if (!css?.trim()) return;

    const styleEl = document.createElement("style");
    const scopedCss = css.replace(
      /([^\r\n,{}]+)(\s*\{)/g,
      (match, selector, brace) => {
        if (selector.trim().startsWith("@")) return match;
        return `.${cssClass} ${selector.trim()}${brace}`;
      },
    );
    styleEl.textContent = scopedCss;
    styleEl.setAttribute("data-custom-block", blockId || scopeId);
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, [css, cssClass, blockId, scopeId]);

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: "#fff2f0",
          border: "1px solid #ffccc7",
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 13,
          color: "#cf1322",
          whiteSpace: "pre-wrap",
        }}
      >
        <strong>Error:</strong>
        {"\n"}
        {error}
      </div>
    );
  }

  if (!code?.trim()) {
    return (
      <div
        style={{
          padding: 24,
          background: "#fafafa",
          border: "2px dashed #d9d9d9",
          borderRadius: 8,
          textAlign: "center",
          color: "#999",
          fontSize: 14,
        }}
      >
        Custom Block — add JSX code in the sidebar
      </div>
    );
  }

  if (!UserComponent) {
    return (
      <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className={cssClass}>
      <ErrorBoundary>
        <UserComponent />
      </ErrorBoundary>
    </div>
  );
}

/**
 * Error boundary to catch runtime errors in user components.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 16,
            background: "#fff2f0",
            border: "1px solid #ffccc7",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 13,
            color: "#cf1322",
            whiteSpace: "pre-wrap",
          }}
        >
          <strong>Runtime error:</strong>
          {"\n"}
          {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}
