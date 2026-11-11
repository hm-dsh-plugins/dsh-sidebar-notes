/**
 * The note dot on a Session row: a small filled mark in the row's leading cell,
 * before the title, saying this conversation still holds something — "还有事没做"
 * is a state, and a dot is how this sidebar states things.
 *
 * The row hands that 16px cell to decorations only while its own primary state
 * is idle: a run in progress, an approval request or an unread reminder keeps the
 * row's status dot there instead, and an archived or blank row draws no cell at
 * all. A dot in that cell therefore reads as the row's state, and yields to a
 * more urgent one — which is the point of putting it there rather than beside the
 * time.
 *
 * The count reaches assistive technology only; a sighted reader gets "has notes"
 * from the dot and the exact figure from the notes tab's chip.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { ensureSessionCounts, sessionCountOf, subscribe } from './note-counts.js'

/**
 * The dot, while the conversation holds notes.
 * @param props.sessionId - the Session this row shows.
 * @param props.t - this plugin's dictionary.
 * @returns the dot, or nothing while the count is unknown or zero.
 */
export function SessionNoteDot({ sessionId, t }) {
  const count = useSyncExternalStore(subscribe, () => sessionCountOf(sessionId))

  // A mounted row is a standing question; the store batches across rows.
  useEffect(() => { ensureSessionCounts([sessionId]) }, [sessionId])

  if (count === undefined || count === 0) return null
  return <span className="dsh-notes-dot" role="img" aria-label={t('row.count', { count })} />
}
