"use client";

import { createContext, useContext } from "react";

const PuckConfigCtx = createContext(null);

export function PuckConfigProvider({ puckConfig, children }) {
  return (
    <PuckConfigCtx.Provider value={puckConfig}>
      {children}
    </PuckConfigCtx.Provider>
  );
}

export function usePuckConfig() {
  const ctx = useContext(PuckConfigCtx);
  if (!ctx) throw new Error("usePuckConfig must be used within PuckConfigProvider");
  return ctx;
}

/**
 * Same context, but returns null instead of throwing when there's no
 * provider. For incidental consumers like Puck overrides, which render in
 * contexts we don't fully control and should degrade rather than crash.
 */
export function usePuckConfigOptional() {
  return useContext(PuckConfigCtx);
}
