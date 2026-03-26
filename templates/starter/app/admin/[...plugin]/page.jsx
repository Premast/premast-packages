import { siteConfig } from "@/site.config";
import { notFound } from "next/navigation";

export default async function PluginAdminPage({ params }) {
  const resolvedParams = await params;
  const segments = resolvedParams.plugin;
  const path = `/admin/${segments.join("/")}`;

  const item = siteConfig.adminSidebarItems.find(
    (i) => i.path === path && i.pluginComponent,
  );

  if (!item) return notFound();

  const Component = item.pluginComponent;
  return <Component />;
}
