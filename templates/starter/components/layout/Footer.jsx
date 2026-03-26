export function Footer() {
  return (
    <footer style={{
      padding: "0.75rem 1rem",
      borderTop: "1px solid var(--theme-border)",
      background: "var(--theme-bg-subtle)",
      textAlign: "center",
      fontSize: "0.7rem",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--theme-text-muted)",
    }}>
      © {new Date().getFullYear()} Your Company
    </footer>
  );
}
