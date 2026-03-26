import { AdminAppLayout } from "@premast/site-core/admin";
import { siteConfig } from "@/site.config";

export default function AdminLayout({ children }) {
  return (
    <AdminAppLayout
      sidebarItems={siteConfig.adminSidebarItems}
      adminTokens={siteConfig.adminTokens}
      title={siteConfig.adminTitle}
    >
      {children}
    </AdminAppLayout>
  );
}
