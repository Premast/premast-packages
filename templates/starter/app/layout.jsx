import { AntdProvider } from "./antd-provider";
import { ThemeRootVars } from "@/theme/ThemeRootVars";

import "./globals.css";
import styles from "./layout.module.css";

export const metadata = {
   title: "PMST",
   description: "PMST website",
};

export default function RootLayout({ children }) {
   return (
      <html lang="en">
         <body className={styles.body}>
            <ThemeRootVars />
            <AntdProvider>{children}</AntdProvider>
         </body>
      </html>
   );
}
