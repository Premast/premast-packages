"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCallback, useEffect, useRef } from "react";
import styles from "./rich-text-field.module.css";

export function RichTextField({ value, onChange, readOnly }) {
  const isInitializing = useRef(true);
  const debounceRef = useRef(null);

  const editor = useCreateBlockNote({
    domAttributes: {
      editor: { class: styles.editorInner },
    },
  });

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
      /* ignore parse errors */
    }
    requestAnimationFrame(() => {
      isInitializing.current = false;
    });
  }, [editor]);

  const handleChange = useCallback(() => {
    if (isInitializing.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const html = editor.blocksToHTMLLossy(editor.document);
      onChange(html);
    }, 300);
  }, [editor, onChange]);

  if (!editor) return null;

  return (
    <div className={styles.editorRoot} data-puck-rich-text-field>
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
}
