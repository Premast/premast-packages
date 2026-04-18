import styles from "../styles/ui-blocks.module.css";

export const ImageBlock = {
  label: "Image",
  fields: {
    src: { type: "media", label: "Image" },
    alt: { type: "text", label: "Alt Text" },
    caption: { type: "text", label: "Caption" },
    width: { type: "text", label: "Width (e.g. 100%, 600px)" },
    objectFit: {
      type: "select",
      label: "Object Fit",
      options: [
        { label: "Cover", value: "cover" },
        { label: "Contain", value: "contain" },
        { label: "Fill", value: "fill" },
        { label: "None", value: "none" },
      ],
    },
    borderRadius: { type: "number", label: "Border Radius (px)" },
  },
  defaultProps: {
    src: "",
    alt: "Image",
    caption: "",
    width: "100%",
    objectFit: "cover",
    borderRadius: 8,
  },
  render: ({ src, alt, caption, width, objectFit, borderRadius }) => (
    <figure className={styles.imageBlock} style={{ margin: 0 }}>
      {src ? (
        <img
          src={src}
          alt={alt || "Image"}
          style={{
            width: width || "100%",
            objectFit: objectFit || "cover",
            borderRadius: borderRadius ?? 8,
          }}
        />
      ) : (
        <div
          className={styles.dropzonePlaceholder}
          style={{ height: 200, borderRadius: borderRadius ?? 8 }}
        >
          Add image URL
        </div>
      )}
      {caption && <figcaption className={styles.imageCaption}>{caption}</figcaption>}
    </figure>
  ),
};
