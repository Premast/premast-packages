import styles from "../styles/blocks.module.css";

export const TextBlock = {
  label: "Text",
  fields: {
    text: { type: "textarea" },
  },
  defaultProps: {
    text: "Start writing here.",
  },
  render: ({ text }) => <p className={styles.textBlock}>{text}</p>,
};
