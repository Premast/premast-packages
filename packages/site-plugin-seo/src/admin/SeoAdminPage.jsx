"use client";

import { Typography } from "antd";

const { Title, Paragraph } = Typography;

export function SeoAdminPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>SEO Settings</Title>
      <Paragraph type="secondary">
        Manage site-wide SEO settings, default meta tags, and sitemap configuration.
      </Paragraph>
      <Paragraph type="secondary">
        This is a placeholder — extend this page with your SEO configuration forms.
      </Paragraph>
    </div>
  );
}
