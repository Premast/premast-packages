import styles from "../styles/blocks.module.css";

export const ArticleHeroBlock = {
  label: "Article Hero",
  fields: {
    title: { type: "text" },
    subtitle: { type: "text" },
    placeholderLabel: { type: "text" },
    placeholderHeight: { type: "number" },
  },
  defaultProps: {
    title: "Article Title",
    subtitle: "A short description of this article.",
    placeholderLabel: "Featured image",
    placeholderHeight: 180,
  },
  resolvePermissions: (data) => {
    if (data.props._templateLocked) return { delete: false, drag: false };
    return {};
  },
  render: ({ title, subtitle, placeholderLabel, placeholderHeight }) => (
    <section className={styles.articleHeroRoot}>
      <div className={styles.articleHeroText}>
        <h1 className={styles.articleHeroTitle}>{title || "Article Title"}</h1>
        {subtitle ? <p className={styles.articleHeroSubtitle}>{subtitle}</p> : null}
      </div>
      <div
        className={styles.articleHeroPlaceholder}
        style={{ minHeight: Math.max(Number(placeholderHeight) || 120, 60) }}
      >
        <span className={styles.articleHeroPlaceholderLabel}>
          {placeholderLabel || "Featured image"}
        </span>
      </div>
    </section>
  ),
};
