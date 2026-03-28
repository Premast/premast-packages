import { Card } from "antd";
import styles from "../styles/ui-blocks.module.css";

export const CardBlock = {
  label: "Card",
  fields: {
    title: { type: "text", label: "Title" },
    body: { type: "textarea", label: "Body" },
    coverImage: { type: "text", label: "Cover Image URL" },
    extra: { type: "text", label: "Extra (top-right text)" },
    hoverable: {
      type: "radio",
      label: "Hoverable",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ],
    },
    bordered: {
      type: "radio",
      label: "Bordered",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ],
    },
  },
  defaultProps: {
    title: "Card Title",
    body: "Card content goes here.",
    coverImage: "",
    extra: "",
    hoverable: "false",
    bordered: "true",
  },
  render: ({ title, body, coverImage, extra, hoverable, bordered }) => (
    <div className={styles.cardBlock}>
      <Card
        title={title || undefined}
        extra={extra || undefined}
        hoverable={hoverable === "true"}
        bordered={bordered !== "false"}
        cover={
          coverImage ? (
            <img alt={title || "Card"} src={coverImage} className={styles.cardCover} />
          ) : undefined
        }
      >
        {body}
      </Card>
    </div>
  ),
};
