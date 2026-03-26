import styles from "../styles/blocks.module.css";

export const SpacerBlock = {
  label: "Spacer",
  fields: {
    height: { type: "number" },
  },
  defaultProps: {
    height: 32,
  },
  render: ({ height }) => {
    const safeHeight = Math.max(Number(height) || 0, 8);
    return (
      <div className={styles.spacerBlock} style={{ height: safeHeight }}>
        <span>Spacer {safeHeight}px</span>
      </div>
    );
  },
};
