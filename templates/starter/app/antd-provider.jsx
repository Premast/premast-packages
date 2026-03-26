"use client";

import { ConfigProvider } from "antd";
import { antdTheme } from "@/theme/antd-theme";

export function AntdProvider({ children }) {
  return (
    <ConfigProvider theme={antdTheme}>
      {children}
    </ConfigProvider>
  );
}
