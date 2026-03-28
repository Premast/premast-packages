import { Tabs } from "../client/AntTabs.jsx";
import styles from "../styles/ui-blocks.module.css";

export const TabsBlock = {
  label: "Tabs",
  fields: {
    tabs: {
      type: "array",
      label: "Tabs",
      arrayFields: {
        label: { type: "text", label: "Tab Label" },
        content: { type: "textarea", label: "Content" },
      },
      defaultItemProps: { label: "Tab", content: "Tab content here." },
      getItemSummary: (item) => item.label || "Tab",
    },
    size: {
      type: "select",
      label: "Size",
      options: [
        { label: "Small", value: "small" },
        { label: "Middle", value: "middle" },
        { label: "Large", value: "large" },
      ],
    },
    type: {
      type: "select",
      label: "Type",
      options: [
        { label: "Line", value: "line" },
        { label: "Card", value: "card" },
      ],
    },
  },
  defaultProps: {
    tabs: [
      { label: "Tab 1", content: "Content for tab 1." },
      { label: "Tab 2", content: "Content for tab 2." },
    ],
    size: "middle",
    type: "line",
  },
  render: ({ tabs, size, type }) => (
    <div className={styles.tabsBlock}>
      <Tabs
        size={size || "middle"}
        type={type || "line"}
        items={(tabs ?? []).map((tab, i) => ({
          key: String(i),
          label: tab.label || `Tab ${i + 1}`,
          children: <div style={{ padding: "12px 0" }}>{tab.content}</div>,
        }))}
      />
    </div>
  ),
};
