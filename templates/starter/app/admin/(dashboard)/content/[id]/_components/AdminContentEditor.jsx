"use client";

import { Button, Flex, Result, Skeleton, message } from "antd";
import { Puck } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "@/theme/puck.css";
import "@premast/site-core/theme/css/puck-condensed.css";
import { useEffect, useState } from "react";
import styles from "./AdminContentEditor.module.css";
import { puckConfig } from "@/puck.config";
import { puckFieldOverrides } from "@premast/site-core/puck";

const EMPTY_DATA = { content: [], root: {} };

/** Ensure every content item has a props.id (Puck requires it). */
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
      return {
        root: parsed.root ?? {},
        content: ensureIds(parsed.content),
      };
    }
  } catch {
    /* not valid Puck JSON */
  }

  return EMPTY_DATA;
}

export function AdminContentEditor({ contentId }) {
  const [editorData, setEditorData] = useState(EMPTY_DATA);
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

        if (!res.ok) {
          throw new Error(json.error || "Failed to load content");
        }

        if (!active) return;

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

  const handlePublish = async (data) => {
    try {
      const res = await fetch(`/api/content-items/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(data) }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to save content");
      }

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
          overrides={{ fieldTypes: puckFieldOverrides }}
        />
      </div>
    </Flex>
  );
}
