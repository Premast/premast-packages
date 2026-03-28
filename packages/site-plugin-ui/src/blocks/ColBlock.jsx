import styles from "../styles/ui-blocks.module.css";

export const ColBlock = {
  label: "Column",
  inline: true,
  fields: {
    span: {
      type: "select",
      label: "Width",
      options: [
        { label: "Auto", value: "auto" },
        { label: "1/4", value: "1" },
        { label: "1/3", value: "2" },
        { label: "1/2", value: "3" },
        { label: "2/3", value: "4" },
        { label: "3/4", value: "5" },
        { label: "Full", value: "6" },
      ],
    },
    content: {
      type: "slot",
    },
  },
  defaultProps: {
    span: "auto",
  },
  render: ({ span, content: Content, puck }) => {
    const gridSpanMap = { "1": "span 1", "2": "span 1", "3": "span 2", "4": "span 2", "5": "span 3", "6": "span 4" };
    const gridColumn = span && span !== "auto" ? gridSpanMap[span] : undefined;
    return (
      <div
        ref={puck.dragRef}
        className={styles.colBlock}
        style={{ gridColumn, minHeight: 40 }}
      >
        <Content />
      </div>
    );
  },
};
