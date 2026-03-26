import styles from "../styles/blocks.module.css";

export const HeadingBlock = {
  label: "Heading",
  fields: {
    children: { type: "text" },
  },
  defaultProps: {
    children: "New heading",
  },
  render: ({ children }) => (
    <h2 className={styles.headingBlock}>{children}</h2>
  ),
};
