/**
 * Fixture for the MCP plugin's block discovery, deliberately awkward in
 * the ways real client blocks are:
 *
 *  - registered under a different name than it exports (`PromoBanner:
 *    PromoBannerBlock` in puckConfig), so discovery must report the
 *    registry key;
 *  - `fields` declared as a separate const and passed by shorthand,
 *    rather than inline in the block literal;
 *  - one field built by a helper, whose shape can't be read statically;
 *  - a radio whose option values are booleans, not strings.
 */

const linkField = (label) => ({
   type: "object",
   label,
   objectFields: {
      href: { type: "text" },
      text: { type: "text" },
   },
});

const fields = {
   heading: { type: "text" },
   body: { type: "text" },
   boxed: {
      type: "radio",
      label: "Boxed",
      options: [
         { label: "No", value: false },
         { label: "Yes", value: true },
      ],
   },
   link: linkField("Call to action"),
};

export default function PromoBanner({ heading, body, boxed, link }) {
   return (
      <section data-testid="promo-banner" data-boxed={String(Boolean(boxed))}>
         <h2>{heading}</h2>
         <p>{body}</p>
         {link?.href ? <a href={link.href}>{link.text}</a> : null}
      </section>
   );
}

export const PromoBannerBlock = {
   label: "Promo Banner",
   fields,
   defaultProps: {
      heading: "Promo",
      body: "Promo body",
      boxed: false,
   },
   render: ({ heading, body, boxed, link }) => (
      <PromoBanner heading={heading} body={body} boxed={boxed} link={link} />
   ),
};
