/**
 * The notes glyphs: a sticky note with a turned-up corner, the copy, insert and
 * tick a note's own row offers, and the bin beside them. All sit on
 * `currentColor` so each surface picks its own ink.
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
 * The remove glyph: a lidded bin.
 * @param props - rendered size and class.
 * @returns the glyph.
 */
export function TrashIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M2.75 4.5h10.5M6.5 4.5V3.25h3V4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 4.5l.5 8.25h6l.5-8.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.75 7v3.25M9.25 7v3.25" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

/**
 * The copy glyph: a sheet lifted off the one under it.
 * @param props - rendered size and class.
 * @returns the glyph.
 */
export function CopyIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M5.75 5.75V3h7.25v7.25h-2.75" stroke="currentColor" strokeLinejoin="round" />
      <path d="M3 5.75h7.25V13H3z" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The insert glyph: a line dropping into the composer's baseline.
 * @param props - rendered size and class.
 * @returns the glyph.
 */
export function InsertIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M8 2.75v6.5M5.5 6.75L8 9.25l2.5-2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11.5v1.25h10V11.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The copied tick.
 * @param props - rendered size and class.
 * @returns the glyph.
 */
export function CheckIcon({ size = 16, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
