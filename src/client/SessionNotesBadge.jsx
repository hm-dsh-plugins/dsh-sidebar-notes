/**
 * The note count seated in a Session row's leading 16px cell, before the title.
 *
 * The row offers that cell only while its own primary state is idle, so a busy
 * conversation shows its status dot in the same place and this badge steps
 * aside rather than crowding it.
 *
 * The number is read, never guessed: a row with no count yet renders nothing and
 * the store's batch asks for it.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { ensureSessionCounts, sessionCountOf, subscribe } from './note-counts.js'

/** Above this the cell would overflow, so the badge stops counting. */
const MAX_SHOWN = 99

/**
 * The Session row's note count.
 * @param props - the seat's own `sessionId`, the catalog locale seat, and the
 *   caption the row shows.
 * @returns the badge, or nothing while the count is unknown or zero.
 */
export function SessionNotesBadge({ sessionId, t }) {
  const count = useSyncExternalStore(subscribe, () => sessionCountOf(sessionId))

  // A mounted row is a standing question; the store batches across rows.
  useEffect(() => { ensureSessionCounts([sessionId]) }, [sessionId])

  if (count === undefined || count === 0) return null
  const label = t('row.count', { count })
  return (
    <span
      className="dsh-notes-row-count"
      title={label}
      aria-label={label}
    >
      {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
    </span>
  )
}
