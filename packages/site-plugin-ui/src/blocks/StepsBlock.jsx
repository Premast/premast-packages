import { Steps } from "../client/AntSteps.jsx";
import styles from "../styles/ui-blocks.module.css";

export const StepsBlock = {
  label: "Steps",
  fields: {
    steps: {
      type: "array",
      label: "Steps",
      arrayFields: {
        title: { type: "text", label: "Title" },
        description: { type: "text", label: "Description" },
      },
      defaultItemProps: { title: "Step", description: "" },
      getItemSummary: (item) => item.title || "Step",
    },
    current: { type: "number", label: "Current Step (0-based)" },
    direction: {
      type: "radio",
      label: "Direction",
      options: [
        { label: "Horizontal", value: "horizontal" },
        { label: "Vertical", value: "vertical" },
      ],
    },
    size: {
      type: "select",
      label: "Size",
      options: [
        { label: "Default", value: "default" },
        { label: "Small", value: "small" },
      ],
    },
  },
  defaultProps: {
    steps: [
      { title: "Start", description: "Begin here" },
      { title: "Process", description: "In progress" },
      { title: "Done", description: "Completed" },
    ],
    current: 1,
    direction: "horizontal",
    size: "default",
  },
  render: ({ steps, current, direction, size }) => (
    <div className={styles.stepsBlock}>
      <Steps
        current={current ?? 0}
        direction={direction || "horizontal"}
        size={size || "default"}
        items={(steps ?? []).map((step) => ({
          title: step.title || "Step",
          description: step.description || undefined,
        }))}
      />
    </div>
  ),
};
