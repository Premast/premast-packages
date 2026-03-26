import { HeadingBlock } from "./blocks/HeadingBlock.jsx";
import { TextBlock } from "./blocks/TextBlock.jsx";
import { SpacerBlock } from "./blocks/SpacerBlock.jsx";
import { HeroBlock } from "./blocks/HeroBlock.jsx";
import { ContentBlock } from "./blocks/ContentBlock.jsx";
import { HeaderBlock } from "./blocks/HeaderBlock.jsx";
import { FooterBlock } from "./blocks/FooterBlock.jsx";
import { ArticleHeroBlock } from "./blocks/ArticleHeroBlock.jsx";
import { ArticleBodyBlock } from "./blocks/ArticleBodyBlock.jsx";
import { ArticleMetaBlock } from "./blocks/ArticleMetaBlock.jsx";

export const baseBlocks = {
  HeadingBlock,
  TextBlock,
  SpacerBlock,
  HeroBlock,
  ContentBlock,
  HeaderBlock,
  FooterBlock,
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

export {
  HeadingBlock, TextBlock, SpacerBlock, HeroBlock, ContentBlock,
  HeaderBlock, FooterBlock, ArticleHeroBlock, ArticleBodyBlock, ArticleMetaBlock,
};

export { RichTextField } from "./fields/RichTextField.jsx";
