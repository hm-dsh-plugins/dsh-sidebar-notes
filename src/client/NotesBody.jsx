/**
 * The notes page: a header naming the workspace the notes belong to, then one
 * grouped surface — the add row stays at its top and every note sits below it,
 * newest first.
 *
 * Each note is a plain textarea, because a note is a plain-text file. The page
 * owns only the drawing and focus; `useNotes` owns the list, the drafts and
 * when they are written.
 */
import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon, PlusIcon, TrashIcon } from './NotesIcon.jsx'
import { useNotes } from './use-notes.js'
import { useNotesStyles } from './notes-styles.js'

/** Created-at caption: local, minute precision, no seconds to glance past. */
const stampFormat = new Intl.DateTimeFormat(undefined, {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * The created-at caption.
 * @param {number} milliseconds - epoch milliseconds.
 * @returns {string} the local time.
 */
function when(milliseconds) {
  return stampFormat.format(new Date(milliseconds))
}

/**
 * The last segment of a workspace directory.
 * @param {string} path - absolute directory.
 * @returns {string} its final segment.
 */
function workspaceName(path) {
  const segments = path.split(/[\\/]+/u).filter((segment) => segment.length > 0)
  return segments.length === 0 ? path : segments[segments.length - 1]
}

/**
 * Give every block its content's height.
 * @param {Element} root - the page element holding the blocks.
 */
function fitAreas(root) {
  for (const area of root.querySelectorAll('textarea[data-note-id]')) {
    // A page kept mounted while another tab shows measures zero; writing that
    // height back would collapse every block until the next keystroke.
    if (area.clientWidth === 0) continue
    area.style.height = 'auto'
    area.style.height = `${area.scrollHeight}px`
  }
}

/**
 * The notes page body.
 * @param props - the tab's standard slot props; `sessionId` names the workspace.
 * @returns the page.
 */
export function NotesBody({ sessionId, t, useSessions }) {
  useNotesStyles()
  const { notes, phase, error, add, edit, flushNow, remove, fail, reload } = useNotes(sessionId)
  // The workspace root, read from the same Session snapshot the `files` page's
  // header uses — the caption needs no Host round trip.
  const cwd = useSessions((sessions) => sessions.byId[sessionId]?.cwd)
  const [adding, setAdding] = useState(false)
  const rootRef = useRef(null)
  const [pendingFocus, setPendingFocus] = useState(undefined)
  // The row whose bin awaits its second click, and the row that just copied.
  const [confirming, setConfirming] = useState(undefined)
  const [copiedNote, setCopiedNote] = useState(undefined)
  const copiedTimer = useRef(undefined)

  useEffect(() => () => { clearTimeout(copiedTimer.current) }, [])

  const onCopy = async (note) => {
    try {
      await navigator.clipboard.writeText(note.text)
      setCopiedNote(note.id)
      clearTimeout(copiedTimer.current)
      copiedTimer.current = setTimeout(() => { setCopiedNote(undefined) }, 1500)
    } catch (cause) {
      fail(cause instanceof Error ? cause.message : String(cause))
    }
  }

  // Two clicks, one button: the first arms the bin, the second deletes. The
  // element is the same in both states, so keyboard focus is never dropped.
  const onRemove = (id) => {
    if (confirming !== id) {
      setConfirming(id)
      return
    }
    setConfirming(undefined)
    void remove(id)
  }

  // Every block takes its content's height. The height depends on the text that
  // just changed, so this runs whenever the list does.
  useEffect(() => {
    const root = rootRef.current
    if (root === null) return
    fitAreas(root)
  }, [notes])

  // The block just created takes the keyboard, with the caret at the end.
  useEffect(() => {
    const root = rootRef.current
    if (root === null || pendingFocus === undefined) return
    setPendingFocus(undefined)
    const target = root.querySelector(`textarea[data-note-id="${pendingFocus}"]`)
    if (target === null) return
    target.focus()
    target.setSelectionRange(target.value.length, target.value.length)
  }, [pendingFocus])

  // A narrower pane re-wraps every note. The text did not change, so the
  // effect above does not run; the width did, so the heights are measured again.
  useEffect(() => {
    const root = rootRef.current
    if (root === null || typeof ResizeObserver === 'undefined') return
    let width = root.clientWidth
    const observer = new ResizeObserver(() => {
      if (root.clientWidth === width) return
      width = root.clientWidth
      fitAreas(root)
    })
    observer.observe(root)
    return () => { observer.disconnect() }
  }, [])

  const onAdd = async () => {
    setAdding(true)
    try {
      const id = await add()
      if (id !== undefined) setPendingFocus(id)
    } finally {
      setAdding(false)
    }
  }

  const statusOf = (note) => {
    if (note.status === 'saving') return t('status.saving')
    if (note.status === 'error') return t('status.error')
    return undefined
  }

  return (
    <div className="dsh-notes-page" data-dsh-notes-page ref={rootRef}>
      <div className="dsh-notes-header">
        <h2 className="dsh-notes-title">{t('page.title')}</h2>
        {cwd !== undefined && (
          <span className="dsh-notes-scope" title={cwd} data-dsh-notes-scope>
            {t('scope.hint', { name: workspaceName(cwd) })}
          </span>
        )}
      </div>

      {phase === 'loading' && <p className="dsh-notes-loading">{t('loading')}</p>}

      {phase === 'failed' && (
        <div className="dsh-notes-failure">
          <p className="dsh-notes-failure-title">{t('error.title')}</p>
          <p className="dsh-notes-failure-text">{error}</p>
          <button type="button" className="dsh-notes-retry" onClick={() => { void reload() }}>{t('retry')}</button>
        </div>
      )}

      {phase === 'ready' && (
        <div className="dsh-notes-body">
          <div className="dsh-notes-card" data-dsh-notes-list>
            <button
              type="button"
              className="dsh-notes-add"
              data-dsh-notes-add
              disabled={adding}
              onClick={() => { void onAdd() }}
            >
              <PlusIcon size={14} />
              <span>{t('add')}</span>
            </button>

            {error !== undefined && <p className="dsh-notes-banner">{error}</p>}

            {notes.length === 0 && <p className="dsh-notes-note">{t('empty.hint')}</p>}

            {notes.map((note) => {
              const status = statusOf(note)
              return (
                <section
                  className="dsh-notes-block"
                  key={note.id}
                  data-dsh-note={note.id}
                  onMouseLeave={() => { setConfirming((current) => (current === note.id ? undefined : current)) }}
                >
                  <div className="dsh-notes-meta">
                    <time className="dsh-notes-stamp" dateTime={new Date(note.createdAt).toISOString()}>
                      {when(note.createdAt)}
                    </time>
                    {status !== undefined && (
                      <span className="dsh-notes-status" data-state={note.status} title={note.error}>
                        {status}
                      </span>
                    )}
                    <div className="dsh-notes-actions">
                      <button
                        type="button"
                        className="dsh-notes-copy"
                        data-copied={copiedNote === note.id ? 'true' : undefined}
                        disabled={note.text.length === 0}
                        aria-label={t(copiedNote === note.id ? 'copied' : 'copy')}
                        title={t(copiedNote === note.id ? 'copied' : 'copy')}
                        onClick={() => { void onCopy(note) }}
                      >
                        {copiedNote === note.id ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                      </button>
                      <button
                        type="button"
                        className="dsh-notes-remove"
                        data-confirming={confirming === note.id ? 'true' : undefined}
                        aria-label={t(confirming === note.id ? 'confirmRemove' : 'remove')}
                        title={t(confirming === note.id ? 'confirmRemove' : 'remove')}
                        onClick={() => { onRemove(note.id) }}
                      >
                        {confirming === note.id ? <span>{t('confirmRemove')}</span> : <TrashIcon size={13} />}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="dsh-notes-area"
                    data-note-id={note.id}
                    value={note.text}
                    rows={1}
                    spellCheck={false}
                    placeholder={t('placeholder')}
                    aria-label={when(note.createdAt)}
                    onChange={(event) => { edit(note.id, event.target.value) }}
                    onBlur={() => { flushNow(note.id) }}
                  />
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
