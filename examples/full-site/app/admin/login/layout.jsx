import { AntdProvider } from "@/app/antd-provider";

export default function LoginLayout({ children }) {
  return <AntdProvider>{children}</AntdProvider>;
}
