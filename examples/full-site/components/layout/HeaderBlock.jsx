import styles from "./HeaderBlock.module.css";

export default function Header({ logoText, navItems }) {
   return (
      <header className={styles.headerRoot}>
         <div className={styles.headerInner}>
            <a href="/" className={styles.headerLogo}>
               {logoText || "PMST"}
            </a>
            <nav className={styles.headerNav} aria-label="Primary">
               {(navItems ?? []).map((item, i) => (
                  <a key={i} href={item.href || "/"} className={styles.headerNavLink}>
                     {item.label || "Link"}
                  </a>
               ))}
            </nav>
         </div>
      </header>
   );
}

export const HeaderBlock = {
   label: "Header",
   fields: {
      logoText: { type: "text" },
      navItems: {
         type: "array",
         arrayFields: {
            label: { type: "text" },
            href: { type: "text" },
         },
         defaultItemProps: { label: "Link", href: "/" },
         getItemSummary: (item) => item.label || "Link",
      },
   },
   defaultProps: {
      logoText: "PMST",
      navItems: [{ label: "Home", href: "/" }],
   },
   render: ({ logoText, navItems }) => (
      <Header logoText={logoText} navItems={navItems} />
   ),
};
