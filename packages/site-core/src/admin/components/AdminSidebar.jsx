"use client";

import * as AntIcons from "@ant-design/icons";
import { Layout, Menu, theme, Button } from "antd";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Sider } = Layout;

function getIcon(iconName) {
   const Icon = AntIcons[iconName];
   return Icon ? <Icon /> : null;
}

function buildMenuItems(sidebarItems, userRole, contentTypes) {
   return sidebarItems
      .filter((item) => !item.requiredRole || item.requiredRole === userRole)
      .map((item) => {
         // Replace static "Content" children with dynamic content types
         if (item.key === "content-nav") {
            const dynamicChildren = contentTypes.map((ct) => ({
               key: `/admin/content?type=${ct._id}`,
               label: <Link href={`/admin/content?type=${ct._id}`}>{ct.name}</Link>,
            }));
            return {
               key: item.key,
               icon: getIcon(item.icon),
               label: item.label,
               children: [
                  {
                     key: "/admin/content",
                     label: <Link href="/admin/content">All content</Link>,
                  },
                  ...dynamicChildren,
               ],
            };
         }

         if (item.children) {
            return {
               key: item.key,
               icon: getIcon(item.icon),
               label: item.label,
               children: item.children.map((child) => ({
                  key: child.key,
                  label: <Link href={child.path}>{child.label}</Link>,
               })),
            };
         }
         return {
            key: item.key,
            icon: getIcon(item.icon),
            label: <Link href={item.path}>{item.label}</Link>,
         };
      });
}

export function AdminSidebar({ sidebarItems = [], title = "CMS", session }) {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const router = useRouter();
   const { token } = theme.useToken();
   const userRole = session?.role;
   const [contentTypes, setContentTypes] = useState([]);

   const fetchContentTypes = useCallback(async () => {
      try {
         const res = await fetch("/api/content-types");
         const json = await res.json();
         if (res.ok) setContentTypes(json.data ?? []);
      } catch {
         /* ignore */
      }
   }, []);

   useEffect(() => {
      fetchContentTypes();
   }, [fetchContentTypes]);

   const menuItems = buildMenuItems(sidebarItems, userRole, contentTypes);

   // Build selected key — if on /admin/content with ?type= param, use full path+query
   const typeParam = searchParams.get("type");
   const selectedKey =
      pathname === "/admin/content" && typeParam
         ? `/admin/content?type=${typeParam}`
         : pathname;

   async function handleLogout() {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
   }

   return (
      <Sider
         breakpoint="lg"
         collapsedWidth={64}
         theme="dark"
         width={232}
         style={{
            fontFamily: token.fontFamily,
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            display: "flex",
            flexDirection: "column",
         }}
      >
         <div
            style={{
               padding: `${token.paddingSM}px ${token.padding}px ${token.paddingXS}px`,
               color: token.colorText,
               fontWeight: 600,
               fontSize: token.fontSize,
               letterSpacing: "0.02em",
               borderBottom: `1px solid ${token.colorBorderSecondary}`,
               height: "55px",
            }}
         >
            {title}
         </div>
         <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[selectedKey]}
            defaultOpenKeys={["content-nav"]}
            style={{ borderInlineEnd: "none", fontFamily: token.fontFamily, flex: 1 }}
            items={menuItems}
         />

         {session && (
            <div
               style={{
                  padding: `${token.paddingXS}px ${token.padding}px`,
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
               }}
            >
               <span
                  style={{
                     color: token.colorTextSecondary,
                     fontSize: 12,
                     overflow: "hidden",
                     textOverflow: "ellipsis",
                     whiteSpace: "nowrap",
                  }}
               >
                  {session.name || session.email}
               </span>
               <Button
                  type="text"
                  size="small"
                  icon={<AntIcons.LogoutOutlined />}
                  onClick={handleLogout}
                  style={{ color: token.colorTextTertiary, flexShrink: 0 }}
               />
            </div>
         )}

         <div
            style={{
               padding: `${token.paddingXS}px ${token.padding}px`,
               color: token.colorTextQuaternary,
               fontSize: 11,
               textAlign: "center",
            }}
         >
            Developed by Premastlab
         </div>
      </Sider>
   );
}
