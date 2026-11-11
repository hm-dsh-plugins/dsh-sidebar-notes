/**
 * The note line in a Session row's hover card.
 *
 * The row's dot says only "has notes"; this line is where a reader who stops on
 * the row learns what the dot means and how many there are. The seat
 * (`sidebar.session.row.hover`) is the card's own section between its relative
 * time and its trailing status line, and it is mounted only while the card is
 * open — so this costs nothing on a sidebar nobody is pointing at.
 *
 * The card is the right place for it rather than the card's status line: "空闲"
 * is the Session's state and "有便签" is its content. Swapping one for the other
 * would hide a run in progress behind a note count.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { ensureSessionCounts, sessionCountOf, subscribe } from './note-counts.js'

/**
 * The count line, while the conversation holds notes.
 * @param props.sessionId - the Session this row shows.
 * @param props.t - this plugin's dictionary.
 * @returns the dot and its label, or nothing while the count is unknown or zero.
 */
export function SessionNotesHover({ sessionId, t }) {
  const count = useSyncExternalStore(subscribe, () => sessionCountOf(sessionId))

  // Usually already cached by the row's dot; the card can be the first thing to
  // ask when the row's leading cell was taken by a status dot.
  useEffect(() => { ensureSessionCounts([sessionId]) }, [sessionId])

  if (count === undefined || count === 0) return null
  return (
    <div className="dsh-notes-hover" data-dsh-notes-hover="">
      <span className="dsh-notes-dot" aria-hidden="true" />
      <span>{t('row.count', { count })}</span>
    </div>
  )
}
