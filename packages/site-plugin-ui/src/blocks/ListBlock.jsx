import styles from "../styles/ui-blocks.module.css";

export const ListBlock = {
  label: "List",
  fields: {
    type: {
      type: "radio",
      label: "Type",
      options: [
        { label: "Unordered", value: "ul" },
        { label: "Ordered", value: "ol" },
      ],
    },
    items: {
      type: "array",
      label: "Items",
      arrayFields: {
        text: { type: "text", label: "Text" },
      },
      defaultItemProps: { text: "List item" },
      getItemSummary: (item) => item.text || "Item",
    },
  },
  defaultProps: {
    type: "ul",
    items: [
      { text: "First item" },
      { text: "Second item" },
      { text: "Third item" },
    ],
  },
  render: ({ type, items }) => {
    const Tag = type === "ol" ? "ol" : "ul";
    return (
      <Tag className={styles.listBlock}>
        {(items ?? []).map((item, i) => (
          <li key={i}>{item.text || "Item"}</li>
        ))}
      </Tag>
    );
  },
};
