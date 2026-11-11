/**
 * The notes entry in the Session header: one click puts this conversation's
 * notes page on screen.
 *
 * The dot on the Session row says notes exist; this is the way in without
 * hunting for the row in the Sidebar first. The click is the Sidebar's own
 * navigation — `openTab` reveals the page in the on-screen Session and expands
 * the column — so the button adds an entry, not a second way to draw notes.
 *
 * It sits in the header's right-aligned utilities, left of the overflow menu:
 * the seat exists only while a Session's header does, which is exactly when
 * there is a Session whose notes could be opened.
 */
import { NotesIcon } from './NotesIcon.jsx'

/**
 * The header entry.
 * @param props.openNotes - opens the notes page for this header's Session.
 * @param props.t - this plugin's dictionary.
 * @returns the icon button.
 */
export function NotesHeaderButton({ openNotes, t }) {
  return (
    <button
      type="button"
      className="dsh-notes-header-button"
      data-dsh-notes-header=""
      aria-label={t('header.open')}
      title={t('header.open')}
      onClick={() => { openNotes() }}
    >
      <NotesIcon size={16} />
    </button>
  )
}
