"use client";

import { Button, Flex, Result, Skeleton, Switch, message } from "antd";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "../../../theme/css/puck-condensed.css";
import { useEffect, useState } from "react";
import styles from "./AdminContentEditor.module.css";
import { puckFieldOverrides, DrawerItemOverride, BlockSearchOverride } from "../../../puck/build-config.js";
import { usePuckConfig } from "../../PuckConfigContext.jsx";
import { PageMetaPanel } from "../pages/PageMetaPanel.jsx";

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

export function AdminContentEditor({ contentId }) {
  const puckConfig = usePuckConfig();
  const [editorData, setEditorData] = useState(EMPTY_DATA);
  const [published, setPublished] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [itemSlug, setItemSlug] = useState("");
  // urlPrefix from the populated parent ContentType — used by
  // PageMetaPanel to build the displayed redirect path so it matches
  // what the backend hook will create.
  const [pathPrefix, setPathPrefix] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadContent() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/content-items/${contentId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load content");
        if (!active) return;
        setPublished(json.data?.published ?? false);
        setItemTitle(json.data?.title ?? "");
        setItemSlug(json.data?.slug ?? "");
        // contentType is populated as { _id, name, slug, urlPrefix }
        // by the GET /api/content-items/:id handler.
        setPathPrefix(json.data?.contentType?.urlPrefix ?? "");
        setEditorData(getInitialEditorData(json.data?.content ?? ""));
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load content");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadContent();
    return () => { active = false; };
  }, [contentId]);

  const handleTogglePublished = async (checked) => {
    try {
      const res = await fetch(`/api/content-items/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: checked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setPublished(checked);
      message.success(checked ? "Content published" : "Content unpublished");
    } catch (e) {
      message.error(e.message);
    }
  };

  const handlePublish = async (data) => {
    try {
      const res = await fetch(`/api/content-items/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(data) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save content");
      setEditorData(data);
      message.success("Content saved");
    } catch (e) {
      message.error(e.message || "Failed to save content");
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
        title="Could not open content editor"
        subTitle={error}
        extra={
          <Button type="primary" href="/admin/content">
            Back to content
          </Button>
        }
      />
    );
  }

  return (
    <Flex vertical gap={16}>
      <div className={`puck-theme ${styles.editorShell}`}>
        <Puck
          key={contentId}
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
            fields: ({ children, itemSelector }) => (
              <>
                {itemSelector == null && (
                  <div style={{ padding: "16px 16px 0" }}>
                    <PageMetaPanel
                      endpoint={`/api/content-items/${contentId}`}
                      initialTitle={itemTitle}
                      initialSlug={itemSlug}
                      pathPrefix={pathPrefix}
                      onSaved={(updated) => {
                        if (updated?.title !== undefined) setItemTitle(updated.title);
                        if (updated?.slug !== undefined) setItemSlug(updated.slug);
                      }}
                    />
                  </div>
                )}
                {children}
              </>
            ),
          }}
        />
      </div>
    </Flex>
  );
}
