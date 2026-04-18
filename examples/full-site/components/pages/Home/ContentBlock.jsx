import styles from "./ContentBlock.module.css";

export default function Content({ heading, rowA, rowB }) {
   return (
      <section className={styles.contentRoot}>
         {heading ? <h2 className={styles.contentTitle}>{heading}</h2> : null}
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
   );
}

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
   render: ({ heading, rowA, rowB }) => <Content heading={heading} rowA={rowA} rowB={rowB} />,
};
