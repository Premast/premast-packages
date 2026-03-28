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
