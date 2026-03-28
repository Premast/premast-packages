import { Button } from "antd";
import styles from "../styles/ui-blocks.module.css";

export const ButtonBlock = {
  label: "Button",
  fields: {
    text: { type: "text", label: "Text" },
    href: { type: "text", label: "Link URL" },
    type: {
      type: "select",
      label: "Type",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Default", value: "default" },
        { label: "Dashed", value: "dashed" },
        { label: "Text", value: "text" },
        { label: "Link", value: "link" },
      ],
    },
    size: {
      type: "select",
      label: "Size",
      options: [
        { label: "Small", value: "small" },
        { label: "Middle", value: "middle" },
        { label: "Large", value: "large" },
      ],
    },
    block: {
      type: "radio",
      label: "Full Width",
      options: [
        { label: "No", value: "false" },
        { label: "Yes", value: "true" },
      ],
    },
    danger: {
      type: "radio",
      label: "Danger",
      options: [
        { label: "No", value: "false" },
        { label: "Yes", value: "true" },
      ],
    },
  },
  defaultProps: {
    text: "Click me",
    href: "",
    type: "primary",
    size: "middle",
    block: "false",
    danger: "false",
  },
  render: ({ text, href, type, size, block, danger }) => (
    <div className={styles.buttonBlock} style={block === "true" ? { display: "block" } : undefined}>
      <Button
        type={type || "primary"}
        size={size || "middle"}
        block={block === "true"}
        danger={danger === "true"}
        href={href || undefined}
      >
        {text || "Button"}
      </Button>
    </div>
  ),
};
