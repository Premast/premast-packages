import styles from "../styles/ui-blocks.module.css";

export const GridRowBlock = {
  label: "Grid Row",
  fields: {
    columns: {
      type: "select",
      label: "Columns",
      options: [
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
        { label: "4 Columns", value: "4" },
      ],
    },
    gap: { type: "number", label: "Gap (px)" },
    content: {
      type: "slot",
    },
  },
  defaultProps: {
    columns: "2",
    gap: 16,
  },
  render: ({ columns, gap, content: Content }) => (
    <Content
      className={styles.gridRow}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns || 2}, 1fr)`,
        gap: gap ?? 16,
        minHeight: 60,
      }}
    />
  ),
};
