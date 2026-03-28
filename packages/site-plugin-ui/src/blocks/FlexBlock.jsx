import styles from "../styles/ui-blocks.module.css";

export const FlexBlock = {
  label: "Flex",
  fields: {
    direction: {
      type: "radio",
      label: "Direction",
      options: [
        { label: "Row", value: "row" },
        { label: "Column", value: "column" },
      ],
    },
    gap: { type: "number", label: "Gap (px)" },
    alignItems: {
      type: "select",
      label: "Align Items",
      options: [
        { label: "Start", value: "flex-start" },
        { label: "Center", value: "center" },
        { label: "End", value: "flex-end" },
        { label: "Stretch", value: "stretch" },
      ],
    },
    justifyContent: {
      type: "select",
      label: "Justify Content",
      options: [
        { label: "Start", value: "flex-start" },
        { label: "Center", value: "center" },
        { label: "End", value: "flex-end" },
        { label: "Space Between", value: "space-between" },
        { label: "Space Around", value: "space-around" },
      ],
    },
    wrap: {
      type: "radio",
      label: "Wrap",
      options: [
        { label: "No Wrap", value: "nowrap" },
        { label: "Wrap", value: "wrap" },
      ],
    },
    padding: { type: "number", label: "Padding (px)" },
    content: {
      type: "slot",
    },
  },
  defaultProps: {
    direction: "row",
    gap: 16,
    alignItems: "stretch",
    justifyContent: "flex-start",
    wrap: "nowrap",
    padding: 0,
  },
  render: ({ direction, gap, alignItems, justifyContent, wrap, padding, content: Content }) => (
    <Content
      className={styles.flexContainer}
      style={{
        display: "flex",
        flexDirection: direction || "row",
        gap: gap ?? 16,
        alignItems: alignItems || "stretch",
        justifyContent: justifyContent || "flex-start",
        flexWrap: wrap || "nowrap",
        padding: padding || 0,
        minHeight: 60,
      }}
    />
  ),
};
