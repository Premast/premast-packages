import { Carousel } from "../client/AntCarousel.jsx";
import styles from "../styles/ui-blocks.module.css";

export const CarouselBlock = {
  label: "Carousel",
  fields: {
    slides: {
      type: "array",
      label: "Slides",
      arrayFields: {
        imageUrl: { type: "text", label: "Image URL" },
        caption: { type: "text", label: "Caption" },
      },
      defaultItemProps: { imageUrl: "", caption: "" },
      getItemSummary: (item) => item.caption || "Slide",
    },
    autoplay: {
      type: "radio",
      label: "Autoplay",
      options: [
        { label: "Yes", value: "true" },
        { label: "No", value: "false" },
      ],
    },
    dots: {
      type: "radio",
      label: "Dots",
      options: [
        { label: "Show", value: "true" },
        { label: "Hide", value: "false" },
      ],
    },
    height: { type: "number", label: "Slide Height (px)" },
  },
  defaultProps: {
    slides: [
      { imageUrl: "", caption: "Slide 1" },
      { imageUrl: "", caption: "Slide 2" },
    ],
    autoplay: "false",
    dots: "true",
    height: 300,
  },
  render: ({ slides, autoplay, dots, height }) => (
    <div className={styles.carouselBlock}>
      <Carousel autoplay={autoplay === "true"} dots={dots !== "false"}>
        {(slides ?? []).map((slide, i) => (
          <div key={i}>
            <div
              className={styles.carouselSlide}
              style={{ height: height || 300 }}
            >
              {slide.imageUrl ? (
                <img src={slide.imageUrl} alt={slide.caption || `Slide ${i + 1}`} />
              ) : (
                <span style={{ color: "var(--theme-text-muted, #a6a6a6)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Slide {i + 1}
                </span>
              )}
              {slide.caption && (
                <div className={styles.carouselCaption}>{slide.caption}</div>
              )}
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  ),
};
