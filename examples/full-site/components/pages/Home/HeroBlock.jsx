import styles from "./HeroBlock.module.css";

export default function Hero({ heading, lead, placeholderLabel, placeholderHeight }) {
   return (
      <section className={styles.heroRoot}>
         {heading ? <h2 className={styles.heroTitle}>{heading}</h2> : null}
         <div className={styles.heroContent}>
            {lead ? <p className={styles.heroLead}>{lead}</p> : null}
            <div
               className={styles.heroPlaceholder}
               style={{ minHeight: Math.max(Number(placeholderHeight) || 80, 40) }}
            >
               <span className={styles.heroPlaceholderLabel}>{placeholderLabel || "Placeholder"}</span>
            </div>
         </div>
      </section>
   );
}

export const HeroBlock = {
   label: "Hero",
   fields: {
      heading: { type: "text" },
      lead: { type: "textarea" },
      placeholderLabel: { type: "text" },
      placeholderHeight: { type: "number" },
   },
   defaultProps: {
      heading: "Hero",
      lead: "Welcome to the site. Edit this section to add your own content.",
      placeholderLabel: "Image / video block",
      placeholderHeight: 140,
   },
   render: ({ heading, lead, placeholderLabel, placeholderHeight }) => (
      <Hero heading={heading} lead={lead} placeholderLabel={placeholderLabel} placeholderHeight={placeholderHeight} />
   ),
};
