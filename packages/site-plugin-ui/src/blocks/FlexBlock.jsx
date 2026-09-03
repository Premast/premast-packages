import styles from "../styles/ui-blocks.module.css";

/** Per-side padding, falling back to the legacy single `padding` prop. */
const side = (value, legacy) => (typeof value === "number" ? value : legacy || 0);

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
    paddingTop: { type: "number", label: "Padding Top (px)" },
    paddingRight: { type: "number", label: "Padding Right (px)" },
    paddingBottom: { type: "number", label: "Padding Bottom (px)" },
    paddingLeft: { type: "number", label: "Padding Left (px)" },
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
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  },
  render: ({
    direction,
    gap,
    alignItems,
    justifyContent,
    wrap,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    content: Content,
  }) => (
    <Content
      className={styles.flexContainer}
      style={{
        display: "flex",
        flexDirection: direction || "row",
        gap: gap ?? 16,
        alignItems: alignItems || "stretch",
        justifyContent: justifyContent || "flex-start",
        flexWrap: wrap || "nowrap",
        paddingTop: side(paddingTop, padding),
        paddingRight: side(paddingRight, padding),
        paddingBottom: side(paddingBottom, padding),
        paddingLeft: side(paddingLeft, padding),
        minHeight: 60,
      }}
    />
  ),
};
