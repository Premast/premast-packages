import { AntdProvider } from "@/app/antd-provider";

export default function SetupLayout({ children }) {
  return <AntdProvider>{children}</AntdProvider>;
}
