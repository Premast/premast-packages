import styles from "./ArticleMetaBlock.module.css";

export default function ArticleMeta({ author, date }) {
   return (
      <section className={styles.articleMetaRoot}>
         <div className={styles.articleMetaInner}>
            <span className={styles.articleMetaLabel}>
               {author || "Author"} · {date || "—"}
            </span>
         </div>
      </section>
   );
}

export const ArticleMetaBlock = {
   label: "Article Meta",
   fields: {
      author: { type: "text" },
      date: { type: "text" },
   },
   defaultProps: {
      author: "Author",
      date: new Date().toISOString().slice(0, 10),
   },
   resolvePermissions: (data) => {
      if (data.props._templateLocked) return { delete: false, drag: false };
      return {};
   },
   render: ({ author, date }) => <ArticleMeta author={author} date={date} />,
};
