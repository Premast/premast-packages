import { Page } from "../db/models/Page.js";
import { Global } from "../db/models/Global.js";
import { ContentType } from "../db/models/ContentType.js";
import { ContentItem } from "../db/models/ContentItem.js";

const HOME_SLUG = "home";

/** Default home page seeded with Puck JSON matching the initial Hero + Content layout. */
const DEFAULT_HOME_PUCK_DATA = {
  root: {},
  content: [
    {
      type: "HeroBlock",
      props: {
        id: "hero-1",
        heading: "Hero",
        lead: "Welcome to the site. Edit this page in the admin under Pages to customise your home page.",
        placeholderLabel: "Image / video block",
        placeholderHeight: 140,
      },
    },
    {
      type: "ContentBlock",
      props: {
        id: "content-1",
        heading: "Content",
        rowA: "Row A",
        rowB: "Row B",
      },
    },
  ],
};

const DEFAULT_HOME = {
  title: "Home",
  slug: HOME_SLUG,
  content: JSON.stringify(DEFAULT_HOME_PUCK_DATA),
  published: true,
};

/* ── Default global elements ── */

const DEFAULT_HEADER_PUCK_DATA = {
  root: {},
  content: [
    {
      type: "HeaderBlock",
      props: {
        id: "header-1",
        logoText: "PMST",
        navItems: [{ label: "Home", href: "/" }],
      },
    },
  ],
};

const DEFAULT_FOOTER_PUCK_DATA = {
  root: {},
  content: [
    {
      type: "FooterBlock",
      props: {
        id: "footer-1",
        copyrightHolder: "PMST",
      },
    },
  ],
};

/* ── Default blog article template ── */

const DEFAULT_BLOG_TEMPLATE_PUCK_DATA = {
  root: {},
  content: [
    {
      type: "ArticleHeroBlock",
      props: {
        id: "article-hero-1",
        title: "Article Title",
        subtitle: "A short description of this article.",
        placeholderLabel: "Featured image",
        placeholderHeight: 180,
        _templateLocked: true,
      },
    },
    {
      type: "ArticleBodyBlock",
      props: {
        id: "article-body-1",
        body: "Start writing your article content here. This block supports long-form text.",
        _templateLocked: true,
      },
    },
    {
      type: "ArticleMetaBlock",
      props: {
        id: "article-meta-1",
        author: "Author",
        date: new Date().toISOString().slice(0, 10),
        _templateLocked: true,
      },
    },
  ],
};

/**
 * Runs once after MongoDB connects. Ensures default seed data exists.
 * Idempotent: upsert with `$setOnInsert` so existing documents are never overwritten.
 */
export async function runCoreSeed() {
  await Promise.all([
    // Home page
    Page.updateOne(
      { slug: HOME_SLUG },
      { $setOnInsert: DEFAULT_HOME },
      { upsert: true },
    ),
    // Header global
    Global.updateOne(
      { key: "header" },
      { $setOnInsert: { key: "header", content: JSON.stringify(DEFAULT_HEADER_PUCK_DATA), published: true } },
      { upsert: true },
    ),
    // Footer global
    Global.updateOne(
      { key: "footer" },
      { $setOnInsert: { key: "footer", content: JSON.stringify(DEFAULT_FOOTER_PUCK_DATA), published: true } },
      { upsert: true },
    ),
    // Blog Article content type
    ContentType.updateOne(
      { slug: "blog-article" },
      {
        $setOnInsert: {
          name: "Blog Article",
          slug: "blog-article",
          urlPrefix: "/blog",
          templateContent: JSON.stringify(DEFAULT_BLOG_TEMPLATE_PUCK_DATA),
          description: "Standard blog post with hero, body, and meta.",
          published: true,
        },
      },
      { upsert: true },
    ),
  ]);

  // Seed one example blog article (needs the content type _id, so runs after upsert)
  const blogType = await ContentType.findOne({ slug: "blog-article" }).lean();
  if (blogType) {
    // Clone template data but set article-specific content
    const articleData = {
      root: {},
      content: DEFAULT_BLOG_TEMPLATE_PUCK_DATA.content.map((block) => ({
        ...block,
        props: {
          ...block.props,
          ...(block.type === "ArticleHeroBlock"
            ? { title: "Hello World", subtitle: "Your first blog post on the new site." }
            : {}),
          ...(block.type === "ArticleBodyBlock"
            ? { body: "This is an example blog article created automatically. Open the admin to edit it." }
            : {}),
          ...(block.type === "ArticleMetaBlock"
            ? { author: "PMST Team" }
            : {}),
        },
      })),
    };

    await ContentItem.updateOne(
      { contentType: blogType._id, slug: "hello-world" },
      {
        $setOnInsert: {
          title: "Hello World",
          slug: "hello-world",
          contentType: blogType._id,
          content: JSON.stringify(articleData),
          metadata: {},
          published: true,
        },
      },
      { upsert: true },
    );
  }
}
