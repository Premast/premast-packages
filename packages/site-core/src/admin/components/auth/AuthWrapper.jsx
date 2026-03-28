"use client";

import { SessionProvider } from "../../../auth/index.js";

export function AuthWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
