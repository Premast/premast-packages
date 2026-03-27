"use client";

import { SessionProvider } from "@premast/site-core/auth";

export function AuthWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
