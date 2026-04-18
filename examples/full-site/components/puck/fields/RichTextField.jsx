"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCallback, useEffect, useRef } from "react";
import styles from "./rich-text-field.module.css";

/**
 * BlockNote rich text editor used as a Puck custom field.
 *
 * Puck passes: { value, onChange, field, name, id, readOnly }
 * - value: HTML string (or empty)
 * - onChange: (htmlString) => void
 */
export function RichTextField({ value, onChange, readOnly }) {
  const isInitializing = useRef(true);
  const debounceRef = useRef(null);

  const editor = useCreateBlockNote({
    domAttributes: {
      editor: { class: styles.editorInner },
    },
  });

  // Load initial HTML content into BlockNote on mount
  useEffect(() => {
    if (!editor || !value) {
      isInitializing.current = false;
      return;
    }

    try {
      const blocks = editor.tryParseHTMLToBlocks(value);
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks);
      }
    } catch {
      /* ignore parse errors — start with empty editor */
    }

    // Small delay to let replaceBlocks settle before listening for changes
    requestAnimationFrame(() => {
      isInitializing.current = false;
    });
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps — only run on mount

  const handleChange = useCallback(() => {
    // Skip change events fired during initialization
    if (isInitializing.current) return;

    // Debounce to avoid flooding Puck with updates
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const html = editor.blocksToHTMLLossy(editor.document);
      onChange(html);
    }, 300);
  }, [editor, onChange]);

  if (!editor) return null;

  return (
    <div
      className={styles.editorRoot}
      data-puck-rich-text-field
    >
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
}
