"use client";

import { PuckConfigProvider } from "@premast/site-core/admin";
import { puckConfig } from "@/puck.config";

export function PuckProvider({ children }) {
  return (
    <PuckConfigProvider puckConfig={puckConfig}>
      {children}
    </PuckConfigProvider>
  );
}
