"use client";

import { Button, Flex, Result, Skeleton, Switch, message } from "antd";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "../../../theme/css/puck-condensed.css";
import { useEffect, useState } from "react";
import styles from "./AdminTemplateEditor.module.css";
import { puckFieldOverrides, DrawerItemOverride, BlockSearchOverride } from "../../../puck/build-config.js";
import { usePuckConfig } from "../../PuckConfigContext.jsx";

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
      return { root: parsed.root ?? {}, content: ensureIds(parsed.content) };
    }
  } catch { /* not valid Puck JSON */ }
  return EMPTY_DATA;
}

export function AdminTemplateEditor({ templateId }) {
  const puckConfig = usePuckConfig();
  const [editorData, setEditorData] = useState(EMPTY_DATA);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadTemplate() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/content-types/${templateId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load template");
        if (!active) return;
        setPublished(json.data?.published ?? false);
        setEditorData(getInitialEditorData(json.data?.templateContent ?? ""));
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load template");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadTemplate();
    return () => { active = false; };
  }, [templateId]);

  const handleTogglePublished = async (checked) => {
    try {
      const res = await fetch(`/api/content-types/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: checked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setPublished(checked);
      message.success(checked ? "Template published" : "Template unpublished");
    } catch (e) {
      message.error(e.message);
    }
  };

  const handlePublish = async (data) => {
    try {
      const res = await fetch(`/api/content-types/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateContent: JSON.stringify(data) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save template");
      setEditorData(data);
      message.success("Template saved");
    } catch (e) {
      message.error(e.message || "Failed to save template");
    }
  };

  if (loading) {
    return (
      <Flex vertical gap={16}>
        <Skeleton.Input active block style={{ height: 40 }} />
        <Skeleton active paragraph={{ rows: 8 }} />
      </Flex>
    );
  }

  if (error) {
    return (
      <Result
        status="error"
        title="Could not open template editor"
        subTitle={error}
        extra={
          <Button type="primary" href="/admin/templates">
            Back to templates
          </Button>
        }
      />
    );
  }

  return (
    <Flex vertical gap={16}>
      <div className={`puck-theme ${styles.editorShell}`}>
        <Puck
          key={templateId}
          config={puckConfig}
          data={editorData}
          onPublish={handlePublish}
          ui={{ leftSideBarVisible: false, rightSideBarWidth: 480 }}
          overrides={{
            fieldTypes: puckFieldOverrides, drawerItem: DrawerItemOverride, components: BlockSearchOverride,
            headerActions: ({ children }) => (
              <>
                <Flex align="center" gap={8} style={{ marginRight: 8 }}>
                  <span style={{ fontSize: 13, color: published ? undefined : "#888" }}>
                    {published ? "Published" : "Draft"}
                  </span>
                  <Switch
                    size="small"
                    checked={published}
                    onChange={handleTogglePublished}
                  />
                </Flex>
                {children}
              </>
            ),
          }}
        />
      </div>
    </Flex>
  );
}
