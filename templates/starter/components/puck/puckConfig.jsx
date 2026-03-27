import styles from "./puck-components.module.css";
import { RichTextField } from "./fields/RichTextField";

/**
 * Shared Puck component config.
 *
 * Imported by:
 *  - AdminPageEditor (client, editor mode)
 *  - Home page (server, <Render> mode)
 *
 * Keep render functions free of client-only APIs so they work in RSC.
 */

export const puckConfig = {
  categories: {
    home: {
      title: "Home",
      components: ["HeroBlock", "ContentBlock"],
      defaultExpanded: true,
    },
    global: {
      title: "Global",
      components: ["HeaderBlock", "FooterBlock"],
      defaultExpanded: true,
    },
    template: {
      title: "Template",
      components: ["ArticleHeroBlock", "ArticleBodyBlock", "ArticleMetaBlock"],
      defaultExpanded: true,
    },
    other: {
      title: "Primitives",
    },
  },
  components: {
    /* ── primitives ── */
    HeadingBlock: {
      label: "Heading",
      fields: {
        children: { type: "text" },
      },
      defaultProps: {
        children: "New heading",
      },
      render: ({ children }) => (
        <h2 className={styles.headingBlock}>{children}</h2>
      ),
    },

    TextBlock: {
      label: "Text",
      fields: {
        text: { type: "textarea" },
      },
      defaultProps: {
        text: "Start writing here.",
      },
      render: ({ text }) => <p className={styles.textBlock}>{text}</p>,
    },

    SpacerBlock: {
      label: "Spacer",
      fields: {
        height: { type: "number" },
      },
      defaultProps: {
        height: 32,
      },
      render: ({ height }) => {
        const safeHeight = Math.max(Number(height) || 0, 8);
        return (
          <div className={styles.spacerBlock} style={{ height: safeHeight }}>
            <span>Spacer {safeHeight}px</span>
          </div>
        );
      },
    },

    /* ── home-page sections ── */
    HeroBlock: {
      label: "Hero",
      fields: {
        heading: { type: "text" },
        lead: { type: "textarea" },
        placeholderLabel: { type: "text" },
        placeholderHeight: { type: "number" },
      },
      defaultProps: {
        heading: "Hero",
        lead: "Welcome to the site. Edit this section to add your own content.",
        placeholderLabel: "Image / video block",
        placeholderHeight: 140,
      },
      render: ({ heading, lead, placeholderLabel, placeholderHeight }) => (
        <section className={styles.heroRoot}>
          {heading ? (
            <h2 className={styles.heroTitle}>{heading}</h2>
          ) : null}
          <div className={styles.heroContent}>
            {lead ? <p className={styles.heroLead}>{lead}</p> : null}
            <div
              className={styles.heroPlaceholder}
              style={{ minHeight: Math.max(Number(placeholderHeight) || 80, 40) }}
            >
              <span className={styles.heroPlaceholderLabel}>
                {placeholderLabel || "Placeholder"}
              </span>
            </div>
          </div>
        </section>
      ),
    },

    ContentBlock: {
      label: "Content Section",
      fields: {
        heading: { type: "text" },
        rowA: { type: "text" },
        rowB: { type: "text" },
      },
      defaultProps: {
        heading: "Content",
        rowA: "Row A",
        rowB: "Row B",
      },
      render: ({ heading, rowA, rowB }) => (
        <section className={styles.contentRoot}>
          {heading ? (
            <h2 className={styles.contentTitle}>{heading}</h2>
          ) : null}
          <div className={styles.contentBody}>
            <div className={styles.contentStack}>
              <div className={styles.contentRow}>
                <span className={styles.contentRowLabel}>{rowA || "Row"}</span>
              </div>
              <div className={styles.contentRow}>
                <span className={styles.contentRowLabel}>{rowB || "Row"}</span>
              </div>
            </div>
          </div>
        </section>
      ),
    },

    /* ── global elements ── */
    HeaderBlock: {
      label: "Header",
      fields: {
        logoText: { type: "text" },
        navItems: {
          type: "array",
          arrayFields: {
            label: { type: "text" },
            href: { type: "text" },
          },
          defaultItemProps: { label: "Link", href: "/" },
          getItemSummary: (item) => item.label || "Link",
        },
      },
      defaultProps: {
        logoText: "PMST",
        navItems: [{ label: "Home", href: "/" }],
      },
      render: ({ logoText, navItems }) => (
        <header className={styles.headerRoot}>
          <div className={styles.headerInner}>
            <a href="/" className={styles.headerLogo}>
              {logoText || "PMST"}
            </a>
            <nav className={styles.headerNav} aria-label="Primary">
              {(navItems ?? []).map((item, i) => (
                <a key={i} href={item.href || "/"} className={styles.headerNavLink}>
                  {item.label || "Link"}
                </a>
              ))}
            </nav>
          </div>
        </header>
      ),
    },

    FooterBlock: {
      label: "Footer",
      fields: {
        copyrightHolder: { type: "text" },
      },
      defaultProps: {
        copyrightHolder: "PMST",
      },
      render: ({ copyrightHolder }) => (
        <footer className={styles.footerRoot}>
          <div className={styles.footerInner}>
            <p className={styles.footerCopy}>
              © {new Date().getFullYear()} {copyrightHolder || "PMST"}
            </p>
          </div>
        </footer>
      ),
    },

    /* ── template / article blocks ── */
    ArticleHeroBlock: {
      label: "Article Hero",
      fields: {
        title: { type: "text" },
        subtitle: { type: "text" },
        placeholderLabel: { type: "text" },
        placeholderHeight: { type: "number" },
      },
      defaultProps: {
        title: "Article Title",
        subtitle: "A short description of this article.",
        placeholderLabel: "Featured image",
        placeholderHeight: 180,
      },
      resolvePermissions: (data) => {
        if (data.props._templateLocked) return { delete: false, drag: false };
        return {};
      },
      render: ({ title, subtitle, placeholderLabel, placeholderHeight }) => (
        <section className={styles.articleHeroRoot}>
          <div className={styles.articleHeroText}>
            <h1 className={styles.articleHeroTitle}>{title || "Article Title"}</h1>
            {subtitle ? <p className={styles.articleHeroSubtitle}>{subtitle}</p> : null}
          </div>
          <div
            className={styles.articleHeroPlaceholder}
            style={{ minHeight: Math.max(Number(placeholderHeight) || 120, 60) }}
          >
            <span className={styles.articleHeroPlaceholderLabel}>
              {placeholderLabel || "Featured image"}
            </span>
          </div>
        </section>
      ),
    },

    ArticleBodyBlock: {
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
    },

    ArticleMetaBlock: {
      label: "Article Meta",
      fields: {
        author: { type: "text" },
        date: { type: "text" },
      },
      defaultProps: {
        author: "Author",
        date: new Date().toISOString().slice(0, 10),
      },
      resolvePermissions: (data) => {
        if (data.props._templateLocked) return { delete: false, drag: false };
        return {};
      },
      render: ({ author, date }) => (
        <section className={styles.articleMetaRoot}>
          <div className={styles.articleMetaInner}>
            <span className={styles.articleMetaLabel}>
              {author || "Author"} · {date || "—"}
            </span>
          </div>
        </section>
      ),
    },
  },
};
