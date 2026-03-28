import { FlexBlock } from "./blocks/FlexBlock.jsx";
import { GridRowBlock } from "./blocks/GridRowBlock.jsx";
import { ColBlock } from "./blocks/ColBlock.jsx";
import { DividerBlock } from "./blocks/DividerBlock.jsx";
import { TabsBlock } from "./blocks/TabsBlock.jsx";
import { CardBlock } from "./blocks/CardBlock.jsx";
import { AccordionBlock } from "./blocks/AccordionBlock.jsx";
import { BlockquoteBlock } from "./blocks/BlockquoteBlock.jsx";
import { ListBlock } from "./blocks/ListBlock.jsx";
import { ImageBlock } from "./blocks/ImageBlock.jsx";
import { CarouselBlock } from "./blocks/CarouselBlock.jsx";
import { ButtonBlock } from "./blocks/ButtonBlock.jsx";
import { BreadcrumbBlock } from "./blocks/BreadcrumbBlock.jsx";
import { StepsBlock } from "./blocks/StepsBlock.jsx";

export function uiPlugin(options = {}) {
  return {
    name: "ui",
    version: "1.0.0",

    blocks: {
      FlexBlock,
      GridRowBlock,
      ColBlock,
      DividerBlock,
      TabsBlock,
      CardBlock,
      AccordionBlock,
      BlockquoteBlock,
      ListBlock,
      ImageBlock,
      CarouselBlock,
      ButtonBlock,
      BreadcrumbBlock,
      StepsBlock,
    },

    categories: {
      "ui-layout": {
        title: "Layout",
        components: ["FlexBlock", "GridRowBlock", "ColBlock", "DividerBlock"],
        defaultExpanded: false,
      },
      "ui-content": {
        title: "Content",
        components: ["CardBlock", "TabsBlock", "AccordionBlock", "BlockquoteBlock", "ListBlock"],
        defaultExpanded: false,
      },
      "ui-media": {
        title: "Media",
        components: ["ImageBlock", "CarouselBlock"],
        defaultExpanded: false,
      },
      "ui-navigation": {
        title: "Navigation",
        components: ["ButtonBlock", "BreadcrumbBlock", "StepsBlock"],
        defaultExpanded: false,
      },
    },
  };
}

export {
  FlexBlock, GridRowBlock, ColBlock, DividerBlock,
  TabsBlock, CardBlock, AccordionBlock, BlockquoteBlock, ListBlock,
  ImageBlock, CarouselBlock, ButtonBlock, BreadcrumbBlock, StepsBlock,
};
