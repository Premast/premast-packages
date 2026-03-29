import styles from "./FooterBlock.module.css";

export default function Footer({ copyrightHolder }) {
   return (
      <footer className={styles.footerRoot}>
         <div className={styles.footerInner}>
            <p className={styles.footerCopy}>
               © {new Date().getFullYear()} {copyrightHolder || "PMST"}
            </p>
         </div>
      </footer>
   );
}

export const FooterBlock = {
   label: "Footer",
   fields: {
      copyrightHolder: { type: "text" },
   },
   defaultProps: {
      copyrightHolder: "PMST",
   },
   render: ({ copyrightHolder }) => <Footer copyrightHolder={copyrightHolder} />,
};
