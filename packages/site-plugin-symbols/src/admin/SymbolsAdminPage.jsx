"use client";

import { useSearchParams } from "next/navigation";
import { SymbolsList } from "./SymbolsList.jsx";
import { SymbolEditor } from "./SymbolEditor.jsx";

/**
 * Single admin page for Reusable Components. Plugin admin pages can
 * only register one static route (`/admin/components`), so this page
 * switches between the list and the per-component Puck editor using a
 * `?id=` search param instead of a nested dynamic route.
 */
export function SymbolsAdminPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (id) return <SymbolEditor symbolId={id} />;
  return <SymbolsList />;
}
