import { HeroBlock } from "../pages/Home/HeroBlock";
import { ContentBlock } from "../pages/Home/ContentBlock";
import { HeaderBlock } from "../layout/HeaderBlock";
import { FooterBlock } from "../layout/FooterBlock";
import { HeadingBlock } from "../ui/HeadingBlock";
import { TextBlock } from "../ui/TextBlock";
import { SpacerBlock } from "../ui/SpacerBlock";
import { ArticleHeroBlock } from "../pages/article/ArticleHeroBlock";
import { ArticleBodyBlock } from "../pages/article/ArticleBodyBlock";
import { ArticleMetaBlock } from "../pages/article/ArticleMetaBlock";

/**
 * Shared Puck component config.
 *
 * Imported by:
 *  - AdminPageEditor (client, editor mode)
 *  - Home page (server, <Render> mode)
 *
 * Keep render functions free of client-only APIs so they work in RSC.
 */

export const baseBlocks = {
   HeroBlock,
   ContentBlock,
   HeaderBlock,
   FooterBlock,
   HeadingBlock,
   TextBlock,
   SpacerBlock,
   ArticleHeroBlock,
   ArticleBodyBlock,
   ArticleMetaBlock,
};

export const baseCategories = {
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
      components: ["HeadingBlock", "TextBlock", "SpacerBlock"],
   },
};

export const puckConfig = {
   categories: baseCategories,
   components: baseBlocks,
};
