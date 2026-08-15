"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex, Result, Skeleton, Switch, Tag, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "@premast/site-core/theme/css/puck-condensed.css";
import { puckFieldOverrides, DrawerItemOverride, BlockSearchOverride } from "@premast/site-core/puck";
import { usePuckConfig, AdminPageHeader, AdminPageBody } from "@premast/site-core/admin";
import { buildComponentPuckConfig } from "./component-config.js";

const EMPTY_DATA = { content: [], root: {} };

function ensureIds(items) {
  return items.map((item) => {
    if (item.props?.id) return item;
    return {
      ...item,
      props: { ...item.props, id: `${item.type}-${crypto.randomUUID().slice(0, 8)}` },
    };
  });
}

function getInitialEditorData(content) {
  if (!content) return EMPTY_DATA;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.content)) {
      // `root` is intentionally dropped: a component is a fragment with
      // no root fields, so any root props are page-level leftovers.
      return { root: {}, content: ensureIds(parsed.content), zones: parsed.zones };
    }
  } catch { /* not valid Puck JSON */ }
  return EMPTY_DATA;
}

export function SymbolEditor({ symbolId }) {
  const router = useRouter();
  const pagePuckConfig = usePuckConfig();
  // Page root fields (SEO, canonical, structured data, language) and the
  // Component block itself don't belong in a component editor.
  const puckConfig = useMemo(
    () => buildComponentPuckConfig(pagePuckConfig),
    [pagePuckConfig],
  );
  const [editorData, setEditorData] = useState(EMPTY_DATA);
  const [name, setName] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/symbols/${symbolId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load component");
        if (!active) return;
        setName(json.data?.name ?? "");
        setPublished(json.data?.published ?? false);
        setEditorData(getInitialEditorData(json.data?.content ?? ""));
      } catch (e) {
        if (active) setError(e.message || "Failed to load component");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [symbolId]);

  const patch = async (body, successMsg) => {
    const res = await fetch(`/api/symbols/${symbolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Update failed");
    if (successMsg) message.success(successMsg);
    return json.data;
  };

  const handleTogglePublished = async (checked) => {
    try {
      await patch({ published: checked });
      setPublished(checked);
      message.success(checked ? "Published" : "Unpublished");
    } catch (e) {
      message.error(e.message);
    }
  };

  const handlePublish = async (data) => {
    try {
      await patch({ content: JSON.stringify(data) }, "Component saved");
      setEditorData(data);
    } catch (e) {
      message.error(e.message || "Failed to save component");
    }
  };

  if (loading) {
    return (
      <div>
        <AdminPageHeader title="Component" />
        <AdminPageBody>
          <Skeleton.Input active block style={{ height: 40 }} />
          <Skeleton active paragraph={{ rows: 8 }} style={{ marginTop: 16 }} />
        </AdminPageBody>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <AdminPageHeader title="Component">
          <Button
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/admin/components")}
          >
            All components
          </Button>
        </AdminPageHeader>
        <AdminPageBody>
          <Result
            status="error"
            title="Could not open component editor"
            subTitle={error}
            extra={
              <Button type="primary" onClick={() => router.push("/admin/components")}>
                Back to components
              </Button>
            }
          />
        </AdminPageBody>
      </div>
    );
  }

  return (
    <div>
      {/* This route is `/admin/components?id=…`, so the sidebar still
          highlights the list — a back affordance is the only way out. */}
      <AdminPageHeader title={name || "Component"}>
        <Tag color={published ? "green" : "default"} style={{ marginInlineEnd: 0 }}>
          {published ? "Published" : "Draft"}
        </Tag>
        <Button
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/components")}
        >
          All components
        </Button>
      </AdminPageHeader>
      <div className="puck-theme">
        <Puck
          key={symbolId}
          config={puckConfig}
          data={editorData}
          onPublish={handlePublish}
          headerTitle={name}
          ui={{ leftSideBarVisible: false, rightSideBarWidth: 480 }}
          overrides={{
            fieldTypes: puckFieldOverrides,
            drawerItem: DrawerItemOverride,
            components: BlockSearchOverride,
            headerActions: ({ children }) => (
              <>
                <Flex align="center" gap={8} style={{ marginRight: 8 }}>
                  <span style={{ fontSize: 13, color: published ? undefined : "#888" }}>
                    {published ? "Published" : "Draft"}
                  </span>
                  <Switch size="small" checked={published} onChange={handleTogglePublished} />
                </Flex>
                {children}
              </>
            ),
          }}
        />
      </div>
    </div>
  );
}
