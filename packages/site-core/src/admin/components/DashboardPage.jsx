"use client";

import { useState, useEffect } from "react";
import { Button, Flex, Spin, theme } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  FileOutlined,
  FolderOutlined,
  UserOutlined,
  BlockOutlined,
  PlusOutlined,
  FolderAddOutlined,
  SearchOutlined,
  SettingOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

/**
 * Circular progress ring for SEO scores.
 * Matches the design: donut ring with colored arc proportional to score.
 */
function SeoScoreRing({ score, size = 20 }) {
  const color = score >= 80 ? "#52c41a" : score >= 50 ? "#faad14" : "#ff4d4f";
  const r = (size / 2) - 2;
  const circumference = 2 * Math.PI * r;
  const arc = (score / 100) * circumference;
  return (
    <Flex align="center" gap={6}>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{score}</span>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#353535" strokeWidth={2.5} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
    </Flex>
  );
}

const cardStyle = (token) => ({
  padding: 20,
  borderRadius: 8,
  background: token.colorBgContainer,
  border: `1px solid ${token.colorBorder}`,
  flex: 1,
  minWidth: 0,
});

const labelStyle = (token) => ({
  fontSize: 13,
  color: token.colorTextSecondary,
});

const valueStyle = {
  fontSize: 28,
  fontWeight: 600,
};

const subStyle = (token) => ({
  fontSize: 12,
  color: token.colorTextSecondary,
});

function StatCard({ label, value, sub, icon, token }) {
  return (
    <div style={cardStyle(token)}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <span style={labelStyle(token)}>{label}</span>
        <span style={{ color: token.colorTextSecondary, fontSize: 18 }}>{icon}</span>
      </Flex>
      <div style={valueStyle}>{value}</div>
      <div style={{ ...subStyle(token), marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function SectionCard({ title, extra, children, token }) {
  return (
    <div
      style={{
        borderRadius: 8,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorder}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        style={{
          height: 48,
          padding: "0 20px",
          borderBottom: `1px solid ${token.colorBorder}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
        {extra}
      </Flex>
      {children}
    </div>
  );
}

export function DashboardPage() {
  const { token } = theme.useToken();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentPages, setRecentPages] = useState([]);
  const [seoHealth, setSeoHealth] = useState([]);
  const [hasSeoPlugin, setHasSeoPlugin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pagesRes, contentRes, typesRes, usersRes] = await Promise.all([
          fetch("/api/pages"),
          fetch("/api/content-items"),
          fetch("/api/content-types"),
          fetch("/api/auth/users").catch(() => null),
        ]);
        const pages = pagesRes.ok ? (await pagesRes.json()).data : [];
        const content = contentRes.ok ? (await contentRes.json()).data : [];
        const types = typesRes.ok ? (await typesRes.json()).data : [];
        const users = usersRes?.ok ? (await usersRes.json()).data : [];

        const publishedPages = pages.filter((p) => p.published).length;
        const draftPages = pages.length - publishedPages;
        const typeNames = types.map((t) => t.name).join(", ");

        setStats({
          pages: pages.length,
          pagesSub: `${publishedPages} published, ${draftPages} drafts`,
          content: content.length,
          contentSub: typeNames || "No types",
          users: users.length || 0,
          templates: types.length,
        });

        setRecentPages(
          [...pages].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4),
        );

        // SEO Health — parse Puck content root props for SEO fields
        const seoData = pages.map((page) => {
          let root = {};
          try {
            const parsed = JSON.parse(page.content || "{}");
            root = parsed?.root?.props || {};
          } catch { /* empty */ }
          const hasTitle = Boolean(root.metaTitle);
          const hasDesc = Boolean(root.metaDescription);
          const hasOg = Boolean(root.ogImage);
          const indexed = root.noIndex !== "true" && root.noIndex !== true;
          const checks = [hasTitle, hasDesc, hasOg, indexed];
          const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
          return { _id: page._id, title: page.title, score, hasTitle, hasDesc, hasOg, indexed, published: page.published };
        });
        setSeoHealth(seoData);
        // Check if any page has SEO fields (means plugin is active)
        setHasSeoPlugin(seoData.some((s) => s.hasTitle || s.hasDesc || s.hasOg) || pages.length > 0);
      } catch {
        setStats({ pages: 0, pagesSub: "", content: 0, contentSub: "", users: 0, templates: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <Flex
          align="center"
          style={{
            height: 56,
            padding: "0 24px",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: token.colorBgContainer,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500 }}>Dashboard</span>
        </Flex>
        <div style={{ padding: 48, textAlign: "center" }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: "Create New Page", icon: <PlusOutlined />, primary: true, onClick: () => router.push("/admin/pages") },
    { label: "Add Content", icon: <FolderAddOutlined />, onClick: () => router.push("/admin/content") },
    { label: "Site Settings", icon: <SettingOutlined />, onClick: () => router.push("/admin/settings") },
    { label: "Invite User", icon: <UserAddOutlined />, onClick: () => router.push("/admin/users") },
  ];

  return (
    <div>
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        style={{
          height: 56,
          padding: "0 24px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>Dashboard</span>
      </Flex>

      {/* Content */}
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Dashboard title row */}
        <Flex justify="space-between" align="center">
          <span style={{ fontSize: 20, fontWeight: 600 }}>Dashboard</span>
          <span style={{ fontSize: 13, color: token.colorTextSecondary }}>
            Welcome back, Admin
          </span>
        </Flex>

        {/* Stat Cards */}
        <Flex gap={16}>
          <StatCard
            label="Total Pages"
            value={stats.pages}
            sub={stats.pagesSub}
            icon={<FileOutlined />}
            token={token}
          />
          <StatCard
            label="Content Items"
            value={stats.content}
            sub={stats.contentSub}
            icon={<FolderOutlined />}
            token={token}
          />
          <StatCard
            label="Active Users"
            value={stats.users}
            sub=""
            icon={<UserOutlined />}
            token={token}
          />
          <StatCard
            label="Templates"
            value={stats.templates}
            sub=""
            icon={<BlockOutlined />}
            token={token}
          />
        </Flex>

        {/* SEO Health Table — shows when SEO plugin is active */}
        {hasSeoPlugin && seoHealth.length > 0 && (
          <SectionCard
            title={
              <Flex align="center" gap={8}>
                <SearchOutlined style={{ color: token.colorPrimary }} />
                <span>SEO Health — Per Page</span>
              </Flex>
            }
            extra={
              <a
                onClick={() => router.push("/admin/seo")}
                style={{ fontSize: 12, color: token.colorPrimary, cursor: "pointer" }}
              >
                SEO Settings
              </a>
            }
            token={token}
          >
            {/* Table Header */}
            <Flex
              align="center"
              style={{
                height: 36,
                padding: "0 20px",
                background: token.colorBgElevated,
                borderBottom: `1px solid ${token.colorBorder}`,
                fontSize: 12,
                fontWeight: 500,
                color: token.colorTextSecondary,
              }}
            >
              <span style={{ flex: 1 }}>Page</span>
              <span style={{ width: 80 }}>Score</span>
              <span style={{ width: 100 }}>Meta Title</span>
              <span style={{ width: 100 }}>Description</span>
              <span style={{ width: 90 }}>OG Image</span>
              <span style={{ width: 80 }}>Indexed</span>
              <span style={{ width: 100 }}>Status</span>
            </Flex>
            {/* Rows */}
            {seoHealth.map((row, i) => {
              const scoreColor = row.score >= 80 ? "#52c41a" : row.score >= 50 ? "#faad14" : "#ff4d4f";
              const statusLabel = row.score >= 80 ? "Good" : row.score >= 50 ? "Needs work" : "Issues";
              const statusBg = row.score >= 80 ? "#52c41a20" : row.score >= 50 ? "#faad1420" : "#ff4d4f20";
              const check = <CheckOutlined style={{ color: "#52c41a", fontSize: 14 }} />;
              const cross = <CloseOutlined style={{ color: "#ff4d4f", fontSize: 14 }} />;
              return (
                <Flex
                  key={row._id}
                  align="center"
                  style={{
                    height: 40,
                    padding: "0 20px",
                    fontSize: 12,
                    borderBottom: i < seoHealth.length - 1 ? `1px solid ${token.colorBorder}` : undefined,
                  }}
                >
                  <span style={{ flex: 1 }}>{row.title}</span>
                  <span style={{ width: 80 }}><SeoScoreRing score={row.score} /></span>
                  <span style={{ width: 100 }}>{row.hasTitle ? check : cross}</span>
                  <span style={{ width: 100 }}>{row.hasDesc ? check : cross}</span>
                  <span style={{ width: 90 }}>{row.hasOg ? check : cross}</span>
                  <span style={{ width: 80 }}>{row.indexed ? check : cross}</span>
                  <span style={{ width: 100 }}>
                    <span style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: statusBg,
                      color: scoreColor,
                    }}>
                      {statusLabel}
                    </span>
                  </span>
                </Flex>
              );
            })}
          </SectionCard>
        )}

        {/* Bottom Row — Recent Pages + Quick Actions */}
        <Flex gap={16} style={{ minHeight: 0 }}>
          {/* Recent Pages */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionCard
              title="Recent Pages"
              extra={
                <a
                  onClick={() => router.push("/admin/pages")}
                  style={{ fontSize: 12, color: token.colorPrimary, cursor: "pointer" }}
                >
                  View all
                </a>
              }
              token={token}
            >
              {recentPages.length === 0 ? (
                <div style={{ padding: 20, color: token.colorTextSecondary, fontSize: 13 }}>
                  No pages yet
                </div>
              ) : (
                recentPages.map((page, i) => (
                  <Flex
                    key={page._id}
                    align="center"
                    justify="space-between"
                    style={{
                      height: 44,
                      padding: "0 20px",
                      borderBottom:
                        i < recentPages.length - 1
                          ? `1px solid ${token.colorBorder}`
                          : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => router.push(`/admin/pages/${page._id}`)}
                  >
                    <Flex align="center" gap={12}>
                      <span style={{ fontSize: 13 }}>{page.title}</span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: page.published
                            ? "rgba(82,196,26,0.12)"
                            : "rgba(255,255,255,0.06)",
                          color: page.published ? "#52c41a" : token.colorTextSecondary,
                        }}
                      >
                        {page.published ? "Live" : "Draft"}
                      </span>
                    </Flex>
                    <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                      {page.updatedAt
                        ? new Date(page.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : ""}
                    </span>
                  </Flex>
                ))
              )}
            </SectionCard>
          </div>

          {/* Quick Actions */}
          <div style={{ width: 320, flexShrink: 0 }}>
            <SectionCard title="Quick Actions" token={token}>
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {quickActions.map((qa) => (
                  <Button
                    key={qa.label}
                    type={qa.primary ? "primary" : "default"}
                    icon={qa.icon}
                    onClick={qa.onClick}
                    block
                    style={{
                      height: 40,
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {qa.label}
                  </Button>
                ))}
              </div>
            </SectionCard>
          </div>
        </Flex>
      </div>
    </div>
  );
}
