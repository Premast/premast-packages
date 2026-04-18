import { AdminAppLayout, AuthWrapper } from "@premast/site-core/admin";
import { siteConfig } from "@/site.config";
import { PuckProvider } from "./PuckProvider";
import "@/theme/puck.css";

// Strip `component` from sidebar items before passing to client components.
// Functions can't cross the server→client boundary. The component references
// are only used by resolveAdminPage() in the catch-all route, not the sidebar.
function stripComponents(items) {
  return items.map(({ component, children, ...rest }) => ({
    ...rest,
    ...(children ? { children: children.map(({ component: _, ...c }) => c) } : {}),
  }));
}

export default function DashboardLayout({ children }) {
  return (
    <AuthWrapper>
      <PuckProvider>
        <AdminAppLayout
          sidebarItems={stripComponents(siteConfig.adminSidebarItems)}
          adminTokens={siteConfig.adminTokens}
          title={siteConfig.adminTitle}
        >
          {children}
        </AdminAppLayout>
      </PuckProvider>
    </AuthWrapper>
  );
}
