/**
 * The notes page: a header with the one action, then the notes as blocks,
 * newest first.
 *
 * Each block is a plain textarea, because a note is a plain-text file. The
 * page owns only the drawing and focus; `useNotes` owns the list, the drafts
 * and when they are written.
 */
import { useEffect, useRef, useState } from 'react'
import { NotesIcon, PlusIcon } from './NotesIcon.jsx'
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
export function NotesBody({ sessionId, t }) {
  useNotesStyles()
  const { notes, phase, error, add, edit, flushNow, reload } = useNotes(sessionId)
  const [adding, setAdding] = useState(false)
  const rootRef = useRef(null)
  const [pendingFocus, setPendingFocus] = useState(undefined)

  // Every block takes its content's height. The height depends on the text that
  // just changed, so this runs whenever the list does.
  useEffect(() => {
    const root = rootRef.current
    if (root === null) return
    fitAreas(root)
  }, [notes])

  // The block just created — or the existing blank one a repeat click reused —
  // takes the keyboard, with the caret at the end.
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
        <button
          type="button"
          className="dsh-notes-add"
          aria-label={t('add')}
          title={t('add')}
          data-dsh-notes-add
          disabled={adding || phase !== 'ready'}
          onClick={() => { void onAdd() }}
        >
          <PlusIcon />
        </button>
      </div>

      {phase === 'loading' && (
        <div className="dsh-notes-empty">
          <p className="dsh-notes-empty-text">{t('loading')}</p>
        </div>
      )}

      {phase === 'failed' && (
        <div className="dsh-notes-failure">
          <p className="dsh-notes-empty-title">{t('error.title')}</p>
          <p className="dsh-notes-empty-text">{error}</p>
          <button type="button" className="dsh-notes-retry" onClick={() => { void reload() }}>{t('retry')}</button>
        </div>
      )}

      {phase === 'ready' && notes.length === 0 && (
        <div className="dsh-notes-empty">
          <span style={{ opacity: 0.6 }}><NotesIcon size={32} /></span>
          <p className="dsh-notes-empty-title">{t('empty.title')}</p>
          <p className="dsh-notes-empty-text">{t('empty.hint')}</p>
        </div>
      )}

      {phase === 'ready' && notes.length > 0 && (
        <div className="dsh-notes-body" data-dsh-notes-list>
          {error !== undefined && <p className="dsh-notes-banner">{error}</p>}
          {notes.map((note) => {
            const status = statusOf(note)
            return (
              <section className="dsh-notes-block" key={note.id} data-dsh-note={note.id}>
                <div className="dsh-notes-meta">
                  <time className="dsh-notes-stamp" dateTime={new Date(note.createdAt).toISOString()}>
                    {when(note.createdAt)}
                  </time>
                  {status !== undefined && (
                    <span className="dsh-notes-status" data-state={note.status} title={note.error}>
                      {status}
                    </span>
                  )}
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
      )}
    </div>
  )
}
