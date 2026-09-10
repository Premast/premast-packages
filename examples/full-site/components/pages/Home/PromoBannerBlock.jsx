/**
 * Registered under a different name than it exports — see puckConfig's
 * `PromoBanner: PromoBannerBlock`. The MCP plugin discovers blocks by
 * scanning source files, so this block is the fixture that proves it
 * reports the registry name (what Puck stores) and not the export name.
 */
export default function PromoBanner({ heading, body }) {
   return (
      <section data-testid="promo-banner">
         <h2>{heading}</h2>
         <p>{body}</p>
      </section>
   );
}

export const PromoBannerBlock = {
   label: "Promo Banner",
   fields: {
      heading: { type: "text" },
      body: { type: "text" },
   },
   defaultProps: {
      heading: "Promo",
      body: "Promo body",
   },
   render: ({ heading, body }) => <PromoBanner heading={heading} body={body} />,
};
