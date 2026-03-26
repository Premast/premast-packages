import styles from "../styles/blocks.module.css";
import { RichTextField } from "../fields/RichTextField.jsx";

export const ArticleBodyBlock = {
  label: "Article Body",
  fields: {
    body: {
      type: "custom",
      render: RichTextField,
    },
  },
  defaultProps: {
    body: "<p>Start writing your article content here. This block supports rich text.</p>",
  },
  resolvePermissions: (data) => {
    if (data.props._templateLocked) return { delete: false, drag: false };
    return {};
  },
  render: ({ body }) => (
    <section className={styles.articleBodyRoot}>
      <div
        className={styles.articleBodyContent}
        dangerouslySetInnerHTML={{ __html: body || "" }}
      />
    </section>
  ),
};
