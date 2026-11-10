/**
 * The notes tab's chip: the type label and this Session's note count.
 *
 * The chip is where the exact figure belongs. A Session row marks only that
 * notes exist — the row leaves no cell for a number — and this is the one place
 * that both names the page and stands beside the button that opens it.
 *
 * The count is the same number the row's mark comes from, read from the shared
 * store rather than fetched again.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { ensureSessionCounts, sessionCountOf, subscribe } from './note-counts.js'

/**
 * The notes tab's title.
 * @param props.sessionId - the Session the notes belong to.
 * @param props.t - this plugin's dictionary.
 * @returns the label, and the count once it is known.
 */
export function NotesTabTitle({ sessionId, t }) {
  const count = useSyncExternalStore(subscribe, () => sessionCountOf(sessionId))

  // The chip is mounted for as long as its tab exists, so it can be the only
  // thing asking about a Session whose row is scrolled out of view.
  useEffect(() => { ensureSessionCounts([sessionId]) }, [sessionId])

  return (
    <>
      {t('type.label')}
      {count !== undefined && count > 0 && (
        <span className="dsh-notes-tab-count" aria-label={t('row.count', { count })}>{count}</span>
      )}
    </>
  )
}
