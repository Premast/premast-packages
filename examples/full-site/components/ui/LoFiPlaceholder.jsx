import styles from "./LoFiPlaceholder.module.css";

export function LoFiPlaceholder({ label = "Content", height = 80, className = "" }) {
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      style={{ minHeight: height }}
    >
      <span className={styles.label}>{label}</span>
    </div>
  );
}
