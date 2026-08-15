/**
 * Client-safe shared constants. Kept free of mongoose/server imports so
 * both the client block (SymbolBlock) and the server hook can import it
 * without dragging mongoose into the browser bundle.
 */
export const SYMBOL_BLOCK_TYPE = "SymbolBlock";

/**
 * Prefix for the per-symbol Puck component types generated at runtime so
 * each reusable component gets its own palette entry. Underscore (not
 * ":") because Puck uses colons internally as the zone-key separator.
 */
export const SYMBOL_REF_PREFIX = "SymbolRef_";
