import styles from "./TextBlock.module.css";

export default function Text({ text }) {
   return <p className={styles.textBlock}>{text}</p>;
}

export const TextBlock = {
   label: "Text",
   fields: {
      text: { type: "textarea" },
   },
   defaultProps: {
      text: "Start writing here.",
   },
   render: ({ text }) => <Text text={text} />,
};
