import styles from "../styles/blocks.module.css";

export const ContentBlock = {
  label: "Content Section",
  fields: {
    heading: { type: "text" },
    rowA: { type: "text" },
    rowB: { type: "text" },
  },
  defaultProps: {
    heading: "Content",
    rowA: "Row A",
    rowB: "Row B",
  },
  render: ({ heading, rowA, rowB }) => (
    <section className={styles.contentRoot}>
      {heading ? (
        <h2 className={styles.contentTitle}>{heading}</h2>
      ) : null}
      <div className={styles.contentBody}>
        <div className={styles.contentStack}>
          <div className={styles.contentRow}>
            <span className={styles.contentRowLabel}>{rowA || "Row"}</span>
          </div>
          <div className={styles.contentRow}>
            <span className={styles.contentRowLabel}>{rowB || "Row"}</span>
          </div>
        </div>
      </div>
    </section>
  ),
};
