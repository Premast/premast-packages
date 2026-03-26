import styles from "../styles/blocks.module.css";

export const FooterBlock = {
  label: "Footer",
  fields: {
    copyrightHolder: { type: "text" },
  },
  defaultProps: {
    copyrightHolder: "PMST",
  },
  render: ({ copyrightHolder }) => (
    <footer className={styles.footerRoot}>
      <div className={styles.footerInner}>
        <p className={styles.footerCopy}>
          © {new Date().getFullYear()} {copyrightHolder || "PMST"}
        </p>
      </div>
    </footer>
  ),
};
