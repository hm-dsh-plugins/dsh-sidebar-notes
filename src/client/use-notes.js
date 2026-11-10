/**
 * The notes page's state: the list, one draft per note, and when a draft is
 * written back.
 *
 * Edits are optimistic — the textarea always shows what was typed — and only
 * the write is delayed. A blur writes at once, so leaving a note is never
 * "saved in a moment"; switching tabs or closing the page inside the delay can
 * only lose what was typed in the last half second.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { callHost } from './notes-api.js'
import { noteCountChanged, setSessionCount } from './note-counts.js'

/** Quiet time after the last keystroke before a note is written. */
const SAVE_DELAY_MS = 500

/**
 * One page's notes.
 * @param {string} sessionId - the Session whose workspace holds them.
 * @returns {{
 *   notes: Array<object>, phase: string, error: string | undefined,
 *   add: () => Promise<string | undefined>, edit: (id: string, text: string) => void,
 *   flushNow: (id: string) => void, reload: () => Promise<void>,
 * }} the page state and its actions.
 */
export function useNotes(sessionId) {
  /** @type {[Array<any>, Function]} */
  const [notes, setNotes] = useState([])
  /** `loading` | `ready` | `failed` */
  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState(undefined)

  const alive = useRef(true)
  const timers = useRef(new Map())
  const drafts = useRef(new Map())
  /** A create is on the wire; see `add`. */
  const inFlight = useRef(false)
  /** Notes removed here; a flush still on the wire must not report for one. */
  const removed = useRef(new Set())

  useEffect(() => {
    // Re-armed on mount, not only cleared on unmount: a development build's
    // double mount must not leave the page permanently unable to render.
    alive.current = true
    return () => {
      alive.current = false
      for (const timer of timers.current.values()) clearTimeout(timer)
      timers.current.clear()
    }
  }, [])

  const load = useCallback(async () => {
    setPhase('loading')
    setError(undefined)
    try {
      const result = await callHost('list', { sessionId })
      if (!alive.current) return
      setNotes(result.notes.map((note) => ({ ...note, status: 'saved', error: undefined })))
      setPhase('ready')
      // The list just read is the authoritative count for this Session's row.
      setSessionCount(sessionId, result.notes.length)
    } catch (cause) {
      if (!alive.current) return
      setError(cause.message)
      setPhase('failed')
    }
  }, [sessionId])

  // A new Session starts from that Session's notes; the pending writes of the
  // previous one are dropped rather than saved under the wrong workspace.
  useEffect(() => {
    void load()
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
    }
  }, [load])

  const flush = useCallback(async (id) => {
    const text = drafts.current.get(id)
    if (text === undefined) return
    drafts.current.delete(id)
    setNotes((list) => list.map((note) => (note.id === id ? { ...note, status: 'saving' } : note)))
    try {
      await callHost('save', { sessionId, id, text })
      if (!alive.current) return
      const more = drafts.current.has(id)
      setNotes((list) => list.map((note) => (
        note.id === id ? { ...note, status: more ? 'dirty' : 'saved', error: undefined } : note
      )))
      if (more) scheduleRef.current(id)
    } catch (cause) {
      if (!alive.current || removed.current.has(id)) return
      setNotes((list) => list.map((note) => (
        note.id === id ? { ...note, status: 'error', error: cause.message } : note
      )))
    }
  }, [sessionId])

  const flushRef = useRef(flush)
  flushRef.current = flush

  const scheduleRef = useRef(() => {})
  scheduleRef.current = (id) => {
    const existing = timers.current.get(id)
    if (existing !== undefined) clearTimeout(existing)
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id)
      void flushRef.current(id)
    }, SAVE_DELAY_MS))
  }

  const edit = useCallback((id, text) => {
    drafts.current.set(id, text)
    setNotes((list) => list.map((note) => (
      note.id === id ? { ...note, text, status: 'dirty', error: undefined } : note
    )))
    scheduleRef.current(id)
  }, [])

  const flushNow = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    void flushRef.current(id)
  }, [])

  const add = useCallback(async () => {
    // A create already in flight owns the next note; a second click must not
    // start a competing one. Each click otherwise adds its own note.
    if (inFlight.current) return undefined
    inFlight.current = true
    try {
      const { note } = await callHost('create', { sessionId })
      if (!alive.current) return undefined
      setError(undefined)
      setNotes((list) => [{ ...note, status: 'saved', error: undefined }, ...list])
      noteCountChanged(sessionId, 1)
      return note.id
    } catch (cause) {
      if (alive.current) setError(cause.message)
      return undefined
    } finally {
      inFlight.current = false
    }
  }, [sessionId])

  /**
   * Remove one note on the Host, then from the page.
   *
   * The local record leaves only after the Host confirms: a refused delete must
   * leave the note visibly in place rather than hide a file that still exists.
   * @param {string} id - note identity.
   */
  const remove = useCallback(async (id) => {
    try {
      await callHost('delete', { sessionId, id })
    } catch (cause) {
      if (alive.current) setError(cause.message)
      return
    }
    if (!alive.current) return
    // Nothing may write this note again: drop its draft and timer, and keep an
    // in-flight flush from reporting a failure on the way out.
    removed.current.add(id)
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    drafts.current.delete(id)
    setNotes((list) => list.filter((note) => note.id !== id))
    setError(undefined)
    noteCountChanged(sessionId, -1)
  }, [sessionId])

  /**
   * Surface one failure the page raised itself — a refused clipboard write has
   * no Host route behind it.
   * @param {string} message - what to show.
   */
  const fail = useCallback((message) => {
    if (alive.current) setError(message)
  }, [])

  return { notes, phase, error, add, edit, flushNow, remove, fail, reload: load }
}
