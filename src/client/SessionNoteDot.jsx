/**
 * The note dot on a Session row: a small filled mark saying this conversation
 * still holds something — "还有事没做" is a state, and a dot is how this sidebar
 * states things.
 *
 * It sits in the row's trailing block, beside the time, because that is a real
 * seat with room for it. The leading 16px cell would be the more prominent spot,
 * but that cell belongs to the row's own status dot and is not rendered at all
 * while a run is in progress or while the row is archived; a shipped plugin also
 * keeps its scheduled-task clock there. The dot shows the count to assistive
 * technology and through nothing else: the row's trailing block is hidden while
 * the pointer is on the row, so a tooltip there could never be read.
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
