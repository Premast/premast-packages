import { AdminAppLayout } from "@premast/site-core/admin";
import { siteConfig } from "@/site.config";
import { AuthWrapper } from "./AuthWrapper";

export default function DashboardLayout({ children }) {
  return (
    <AuthWrapper>
      <AdminAppLayout
        sidebarItems={siteConfig.adminSidebarItems}
        adminTokens={siteConfig.adminTokens}
        title={siteConfig.adminTitle}
      >
        {children}
      </AdminAppLayout>
    </AuthWrapper>
  );
}
