import styles from "./LoFiPanel.module.css";

export function LoFiPanel({ title, children, className = "" }) {
  const headingId = title
    ? `theme-panel-${title.replace(/\s+/g, "-").toLowerCase()}`
    : undefined;

  return (
    <section
      className={[styles.root, className].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
    >
      {title ? (
        <h2 className={styles.title} id={headingId}>
          {title}
        </h2>
      ) : null}
      <div className={styles.content}>{children}</div>
    </section>
  );
}
