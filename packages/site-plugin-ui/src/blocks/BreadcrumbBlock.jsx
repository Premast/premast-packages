import { Breadcrumb } from "antd";
import styles from "../styles/ui-blocks.module.css";

export const BreadcrumbBlock = {
  label: "Breadcrumb",
  fields: {
    items: {
      type: "array",
      label: "Items",
      arrayFields: {
        label: { type: "text", label: "Label" },
        href: { type: "text", label: "Link" },
      },
      defaultItemProps: { label: "Page", href: "/" },
      getItemSummary: (item) => item.label || "Item",
    },
  },
  defaultProps: {
    items: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Current Page", href: "" },
    ],
  },
  render: ({ items }) => (
    <div className={styles.breadcrumbBlock}>
      <Breadcrumb
        items={(items ?? []).map((item) => ({
          title: item.href ? (
            <a href={item.href}>{item.label || "Item"}</a>
          ) : (
            item.label || "Item"
          ),
        }))}
      />
    </div>
  ),
};
