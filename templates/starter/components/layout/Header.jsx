export function Header() {
  return (
    <header style={{
      padding: "0.65rem 1rem",
      borderBottom: "1px solid var(--theme-border)",
      background: "var(--theme-surface)",
    }}>
      <span style={{ fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Site
      </span>
    </header>
  );
}
