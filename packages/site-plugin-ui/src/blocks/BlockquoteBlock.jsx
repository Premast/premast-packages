import styles from "../styles/ui-blocks.module.css";

export const BlockquoteBlock = {
  label: "Blockquote",
  fields: {
    quote: { type: "textarea", label: "Quote" },
    author: { type: "text", label: "Author" },
  },
  defaultProps: {
    quote: "The best way to predict the future is to create it.",
    author: "Peter Drucker",
  },
  render: ({ quote, author }) => (
    <blockquote className={styles.blockquoteRoot}>
      <p className={styles.blockquoteText}>{quote}</p>
      {author && <footer className={styles.blockquoteAuthor}>— {author}</footer>}
    </blockquote>
  ),
};
