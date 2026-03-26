import { ThemeRootVars } from "@premast/site-core/theme";
import { designTokens } from "@/theme/tokens";
import { AntdProvider } from "./antd-provider";
import "./globals.css";

export const metadata = {
  title: "Premast Starter",
  description: "A site built with Premast Site System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRootVars tokens={designTokens} />
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}
