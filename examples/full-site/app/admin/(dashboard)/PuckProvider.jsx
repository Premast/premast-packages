"use client";

import { SymbolsPuckConfigProvider } from "@premast/site-plugin-symbols/editor";
import { puckConfig } from "@/puck.config";

/**
 * Uses the symbols plugin's provider instead of the plain
 * `PuckConfigProvider` so every published reusable component shows up as
 * its own block in the Puck palette. It wraps PuckConfigProvider, so
 * behaviour is identical when no components exist.
 */
export function PuckProvider({ children }) {
  return (
    <SymbolsPuckConfigProvider puckConfig={puckConfig}>
      {children}
    </SymbolsPuckConfigProvider>
  );
}
