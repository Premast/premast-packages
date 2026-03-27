import { siteConfig } from "@/site.config";

export default async function PluginPage({ params }) {
  const segments = (await params).plugin;
  const pathname = `/admin/${segments.join("/")}`;
  const item = siteConfig.adminSidebarItems.find((i) => i.path === pathname && i.pluginComponent);

  if (!item) {
    return (
      <div style={{ padding: 24, color: "#888" }}>
        Plugin page not found.
      </div>
    );
  }

  const Component = item.pluginComponent;
  return <Component />;
}
