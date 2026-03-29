import styles from "./HeadingBlock.module.css";

export default function Heading({ children }) {
   return <h2 className={styles.headingBlock}>{children}</h2>;
}

export const HeadingBlock = {
   label: "Heading",
   fields: {
      children: { type: "text" },
   },
   defaultProps: {
      children: "New heading",
   },
   render: ({ children }) => <Heading>{children}</Heading>,
};
