/**
 * The notes glyphs: a sticky note with a turned-up corner, and the plus the
 * page's add control draws. Both sit on `currentColor` so each surface picks
 * its own ink.
 */

/** Size the guide draws a capsule glyph at, before its own scaling. */
export const NOTES_GLYPH_SIZE = 16

/**
 * The sticky-note glyph.
 * @param props - rendered size and class.
 * @returns the glyph.
 */
export function NotesIcon({ size = NOTES_GLYPH_SIZE, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3.5 2.5h6.5l2.5 2.5v8.5h-9z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M10 2.5v2.5h2.5" stroke="currentColor" strokeLinejoin="round" />
      <path d="M5.5 7.5h5M5.5 10h3.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The add glyph.
 * @param props - rendered size and class.
 * @returns the glyph.
 */
export function PlusIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M8 3.25v9.5M3.25 8h9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
