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
    maxWidth: { type: "number", label: "Max Width (px, 0 = full width)" },
    marginLeft: { type: "number", label: "Margin Left (px)" },
    marginRight: { type: "number", label: "Margin Right (px)" },
  },
  defaultProps: {
    items: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Current Page", href: "" },
    ],
    maxWidth: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  render: ({ items, maxWidth, marginLeft, marginRight }) => (
    <div
      data-ui-block="breadcrumb"
      className={styles.breadcrumbBlock}
      style={{
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
        marginLeft: marginLeft || 0,
        marginRight: marginRight || 0,
      }}
    >
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
