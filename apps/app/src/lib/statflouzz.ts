/**
 * How the app writes an amount of StatFlouzz — docs/prd.md §5.2 point 6.
 *
 * `§` is the currency's symbol, set after the number the way € is, and the only
 * form the interface shows: the name is spelled out once, on the balance's own
 * unit line, and that line is where the symbol is taught.
 *
 * It lives here rather than beside the one card that used to write it, now that
 * the proposal screen prices its own button: a symbol with two homes is a
 * symbol that drifts.
 */
export const amountLabel = (amount: number): string => `${amount}§`;

/**
 * The same amount for a screen reader, which reads a lone `§` as a section sign
 * when it does not skip it outright. Every `§` on screen has one of these
 * behind it, as an `accessibilityLabel`.
 */
export const spokenAmountLabel = (amount: number): string => `${amount} StatFlouzz`;
