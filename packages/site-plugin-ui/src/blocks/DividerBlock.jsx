import { Divider } from "antd";
import styles from "../styles/ui-blocks.module.css";

export const DividerBlock = {
  label: "Divider",
  fields: {
    text: { type: "text", label: "Text (optional)" },
    orientation: {
      type: "select",
      label: "Text Position",
      options: [
        { label: "Center", value: "center" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
    },
    type: {
      type: "radio",
      label: "Direction",
      options: [
        { label: "Horizontal", value: "horizontal" },
        { label: "Vertical", value: "vertical" },
      ],
    },
    dashed: {
      type: "radio",
      label: "Style",
      options: [
        { label: "Solid", value: "false" },
        { label: "Dashed", value: "true" },
      ],
    },
  },
  defaultProps: {
    text: "",
    orientation: "center",
    type: "horizontal",
    dashed: "false",
  },
  render: ({ text, orientation, type, dashed }) => (
    <div className={styles.dividerBlock}>
      <Divider
        type={type || "horizontal"}
        orientation={orientation || "center"}
        dashed={dashed === "true"}
      >
        {text || null}
      </Divider>
    </div>
  ),
};
