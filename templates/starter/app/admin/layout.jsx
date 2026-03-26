import { AdminAppLayout } from "@premast/site-core/admin";
import { siteConfig } from "@/site.config";
import { designTokens } from "@/theme/tokens";

export default function AdminLayout({ children }) {
  return (
    <AdminAppLayout
      sidebarItems={siteConfig.adminSidebarItems}
      title="CMS"
      fontFamily={designTokens.fontSans}
    >
      {children}
    </AdminAppLayout>
  );
}
