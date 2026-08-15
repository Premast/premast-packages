"use client";

import { Empty, Typography } from "antd";
import { AdminPageHeader, AdminPageBody } from "@premast/site-core/admin";

const { Text } = Typography;

export function SeoAdminPage() {
  return (
    <div>
      <AdminPageHeader
        title="SEO"
        description="Site-wide SEO settings, default meta tags, and sitemap configuration."
      />
      <AdminPageBody>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No SEO settings here yet"
          style={{ padding: "48px 0" }}
        >
          <Text type="secondary">
            Per-page SEO already works from the page editor's sidebar. This
            screen is a placeholder for site-wide defaults.
          </Text>
        </Empty>
      </AdminPageBody>
    </div>
  );
}
