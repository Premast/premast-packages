export const SeoHeadBlock = {
  label: "SEO Head",
  fields: {
    metaTitle: { type: "text", label: "Meta Title" },
    metaDescription: { type: "textarea", label: "Meta Description" },
    ogImage: { type: "text", label: "OG Image URL" },
    noIndex: { type: "radio", options: [
      { label: "Index", value: "false" },
      { label: "No Index", value: "true" },
    ]},
  },
  defaultProps: {
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    noIndex: "false",
  },
  render: ({ metaTitle, metaDescription }) => (
    <div style={{
      padding: "0.75rem",
      border: "1px dashed var(--theme-border-dashed)",
      background: "var(--theme-bg-subtle)",
      fontSize: "0.75rem",
      color: "var(--theme-text-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    }}>
      SEO: {metaTitle || "No title set"} — {metaDescription ? metaDescription.slice(0, 60) + "..." : "No description"}
    </div>
  ),
};
