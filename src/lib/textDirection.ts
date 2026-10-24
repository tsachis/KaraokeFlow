// Hebrew, Arabic, Syriac, Thaana, NKo and the RTL presentation forms.
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/g;
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/g;

const RLM = '‏';
const LRM = '‎';

/** True when most letters in the text are right-to-left. */
export function isRtl(text: string): boolean {
  const rtl = text.match(RTL_CHAR)?.length ?? 0;
  const ltr = text.match(LTR_CHAR)?.length ?? 0;
  return rtl > 0 && rtl >= ltr;
}

/**
 * Prefixes a direction mark so the base direction follows the majority script.
 * Android ignores the `writingDirection` style and picks direction from the first
 * strong letter, so a mostly-Hebrew line that opens with an English word would
 * otherwise be laid out left-to-right.
 */
export function withDirectionMark(text: string): string {
  if (!text) return text;
  return (isRtl(text) ? RLM : LRM) + text;
}
