import { Collapse } from "../client/AntCollapse.jsx";
import styles from "../styles/ui-blocks.module.css";

export const AccordionBlock = {
  label: "Accordion",
  fields: {
    items: {
      type: "array",
      label: "Panels",
      arrayFields: {
        header: { type: "text", label: "Header" },
        content: { type: "textarea", label: "Content" },
      },
      defaultItemProps: { header: "Panel", content: "Panel content." },
      getItemSummary: (item) => item.header || "Panel",
    },
    bordered: {
      type: "radio",
      label: "Bordered",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ],
    },
    accordion: {
      type: "radio",
      label: "Single Open",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ],
    },
  },
  defaultProps: {
    items: [
      { header: "Panel 1", content: "Content for panel 1." },
      { header: "Panel 2", content: "Content for panel 2." },
      { header: "Panel 3", content: "Content for panel 3." },
    ],
    bordered: "true",
    accordion: "false",
  },
  render: ({ items, bordered, accordion }) => (
    <div className={styles.accordionBlock}>
      <Collapse
        bordered={bordered !== "false"}
        accordion={accordion === "true"}
        items={(items ?? []).map((item, i) => ({
          key: String(i),
          label: item.header || `Panel ${i + 1}`,
          children: <div>{item.content}</div>,
        }))}
      />
    </div>
  ),
};
