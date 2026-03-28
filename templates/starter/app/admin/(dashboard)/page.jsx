import { resolveAdminPage } from "@premast/site-core/admin";
import { siteConfig } from "@/site.config";

export default function AdminHomePage() {
  const resolved = resolveAdminPage("/admin", siteConfig);
  if (!resolved) return null;
  const { Component, props } = resolved;
  return <Component {...props} />;
}
