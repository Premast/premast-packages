"use client";

import { Button, Flex, Result, Skeleton, Switch, message } from "antd";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "../../../theme/css/puck-condensed.css";
import { useEffect, useState } from "react";
import styles from "./AdminPageEditor.module.css";
import { puckFieldOverrides, DrawerItemOverride, BlockSearchOverride } from "../../../puck/build-config.js";
import { usePuckConfig } from "../../PuckConfigContext.jsx";
import { PageMetaPanel } from "./PageMetaPanel.jsx";

const EMPTY_DATA = { content: [], root: {} };

/** Ensure every content item has a props.id (Puck requires it). */
function ensureIds(items) {
  return items.map((item, i) => {
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
      return {
        root: parsed.root ?? {},
        content: ensureIds(parsed.content),
      };
    }
  } catch {
    // Older pages may still contain plain text content instead of serialized Puck data.
  }

  return {
    root: {},
    content: ensureIds([
      {
        type: "TextBlock",
        props: {
          text: content,
        },
      },
    ]),
  };
}

export function AdminPageEditor({ pageId }) {
  const puckConfig = usePuckConfig();
  const [editorData, setEditorData] = useState(EMPTY_DATA);
  const [published, setPublished] = useState(false);
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/pages/${pageId}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load page");
        }

        if (!active) return;

        setPublished(json.data?.published ?? false);
        setPageTitle(json.data?.title ?? "");
        setPageSlug(json.data?.slug ?? "");
        setEditorData(getInitialEditorData(json.data?.content ?? ""));
      } catch (e) {
        if (!active) return;
        setError(e.message || "Failed to load page");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [pageId]);

  const handleTogglePublished = async (checked) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: checked }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setPublished(checked);
      message.success(checked ? "Page published" : "Page unpublished");
    } catch (e) {
      message.error(e.message);
    }
  };

  const handlePublish = async (data) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: JSON.stringify(data),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to save page");
      }

      setEditorData(data);
      message.success("Page content saved");
    } catch (e) {
      message.error(e.message || "Failed to save page");
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
        title="Could not open page editor"
        subTitle={error}
        extra={
          <Button type="primary" href="/admin/pages">
            Back to pages
          </Button>
        }
      />
    );
  }

  return (
    <Flex vertical gap={16}>
      <div className={`puck-theme ${styles.editorShell}`}>
        <Puck
          key={pageId}
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
            // Inject the new "Page identity" panel at the top of the
            // right sidebar — above Puck's existing root fields. The
            // panel handles its own PATCH for title/slug, so changes
            // here don't need to flow through Puck's own publish.
            fields: ({ children }) => (
              <>
                <div style={{ padding: "16px 16px 0" }}>
                  <PageMetaPanel
                    endpoint={`/api/pages/${pageId}`}
                    initialTitle={pageTitle}
                    initialSlug={pageSlug}
                    pathPrefix=""
                    onSaved={(updated) => {
                      if (updated?.title !== undefined) setPageTitle(updated.title);
                      if (updated?.slug !== undefined) setPageSlug(updated.slug);
                    }}
                  />
                </div>
                {children}
              </>
            ),
          }}
        />
      </div>
    </Flex>
  );
}
