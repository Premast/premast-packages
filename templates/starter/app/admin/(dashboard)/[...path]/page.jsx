import { Suspense } from "react";
import { resolveAdminPage } from "@premast/site-core/admin";
import { siteConfig } from "@/site.config";

export default async function AdminCatchAll({ params }) {
  const segments = (await params).path || [];
  const pathname = segments.length ? `/admin/${segments.join("/")}` : "/admin";

  const resolved = resolveAdminPage(pathname, siteConfig);

  if (!resolved) {
    return (
      <div style={{ padding: 24, color: "#888" }}>
        Page not found.
      </div>
    );
  }

  const { Component, props, wrapSuspense } = resolved;
  const el = <Component {...props} />;

  return wrapSuspense ? <Suspense>{el}</Suspense> : el;
}
