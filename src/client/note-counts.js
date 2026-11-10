/**
 * How many notes each Session and each Workspace holds, as the sidebar needs
 * them.
 *
 * One store for both because they are one fact twice: a Workspace row's number
 * is the sum of its Sessions' numbers. The Host answers the two questions
 * separately (a Workspace carries its own Session list), but they travel in one
 * request and are invalidated together.
 *
 * Reads are per row and lazy: a row asks when it mounts, and a batch leaves only
 * after a short quiet time, so opening the sidebar is one request rather than
 * one per row.
 *
 * A row is a subscriber; this module owns the cache, the batching and the
 * transport, and knows nothing about the DOM or about React.
 */
import { callHost } from './notes-api.js'

/** Quiet time before a batch leaves. */
const DEBOUNCE_MS = 150

/** How long a failed batch waits before it may try again. */
const RETRY_AFTER_MS = 5000

/** Ids per request; the Host refuses more. */
const MAX_BATCH = 200

/** Id → count, keyed by 's' (Session) and 'w' (Workspace). */
const caches = { s: new Map(), w: new Map() }

/** Ids the Host answered about by omission: no badge, and not asked again. */
const unanswered = new Set()

/** Ids waiting for the next batch, and ids on the wire right now. */
const queued = new Set()
const onWire = new Set()

/** One callback per mounted row. */
const listeners = new Set()

/** Pending batch timer, and the earliest moment a failed batch may retry. */
let timer
let cooldownUntil = 0

/** `s:` for a Session, `w:` for a Workspace; the two id spaces never mix. */
const sessionKey = (id) => `s:${id}`
const workspaceKey = (id) => `w:${id}`

/** Tell every mounted row that a number arrived or went stale. */
function notify() {
  for (const listener of listeners) listener()
}

/**
 * Subscribe to count changes.
 * @param {() => void} listener - called after every settled or invalidated batch.
 * @returns {() => void} unsubscribe.
 */
export function subscribe(listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/**
 * One Session's note count.
 * @param {string} sessionId - session identity.
 * @returns {number | undefined} the count, or undefined while it is unknown.
 */
export function sessionCountOf(sessionId) {
  return caches.s.get(sessionId)
}

/**
 * One Workspace's note count.
 * @param {string} workspaceId - workspace identity.
 * @returns {number | undefined} the count, or undefined while it is unknown.
 */
export function workspaceCountOf(workspaceId) {
  return caches.w.get(workspaceId)
}

/**
 * Queue one batch behind the debounce, or behind the cooldown after a failure.
 */
function schedule() {
  clearTimeout(timer)
  timer = setTimeout(() => { void flush() }, Math.max(DEBOUNCE_MS, cooldownUntil - Date.now()))
}

/** Every Workspace count is a sum over its Sessions, so one Session moving makes all of them stale. */
function dropWorkspaces() {
  caches.w.clear()
  for (const entry of unanswered) if (entry.startsWith('w:')) unanswered.delete(entry)
}

/**
 * Ask about any of these Sessions whose count is not known yet.
 * @param {Iterable<string>} sessionIds - Session ids on screen.
 */
export function ensureSessionCounts(sessionIds) {
  let added = false
  for (const id of sessionIds) {
    const entry = sessionKey(id)
    if (caches.s.has(id) || unanswered.has(entry) || onWire.has(entry) || queued.has(entry)) continue
    queued.add(entry)
    added = true
  }
  if (added) schedule()
}

/**
 * Ask about any of these Workspaces whose count is not known yet.
 * @param {Iterable<string>} workspaceIds - Workspace ids on screen.
 */
export function ensureWorkspaceCounts(workspaceIds) {
  let added = false
  for (const id of workspaceIds) {
    const entry = workspaceKey(id)
    if (caches.w.has(id) || unanswered.has(entry) || onWire.has(entry) || queued.has(entry)) continue
    queued.add(entry)
    added = true
  }
  if (added) schedule()
}

/**
 * Record one Session's count as a fact this page established itself — the notes
 * list it just read is the authoritative answer.
 * @param {string} sessionId - session identity.
 * @param {number} count - how many notes it holds.
 */
export function setSessionCount(sessionId, count) {
  if (caches.s.get(sessionId) === count) return
  caches.s.set(sessionId, count)
  dropWorkspaces()
  notify()
}

/**
 * Move one Session's count by one, for a note this page created or deleted.
 *
 * An uncached count stays uncached: it will be read fresh on the next
 * observation rather than guessed from a delta nobody can anchor.
 * @param {string} sessionId - session identity.
 * @param {1 | -1} delta - the change.
 */
export function noteCountChanged(sessionId, delta) {
  const known = caches.s.get(sessionId)
  if (known !== undefined) caches.s.set(sessionId, Math.max(0, known + delta))
  dropWorkspaces()
  notify()
}

/** Send everything queued in one request. */
async function flush() {
  const batch = [...queued].slice(0, MAX_BATCH)
  if (batch.length === 0) return
  const groups = { s: [], w: [] }
  for (const entry of batch) {
    queued.delete(entry)
    onWire.add(entry)
    groups[entry[0]].push(entry.slice(2))
  }
  // More than one batch may be queued; the rest waits for the next quiet moment.
  if (queued.size > 0) schedule()

  const body = {}
  if (groups.s.length > 0) body.sessionIds = groups.s
  if (groups.w.length > 0) body.workspaceIds = groups.w

  let settled = false
  let answered
  try {
    const answer = await callHost('counts', body)
    answered = new Set()
    for (const [id, count] of Object.entries(answer?.sessions ?? {})) {
      if (typeof count !== 'number') continue
      caches.s.set(id, count)
      answered.add(sessionKey(id))
    }
    for (const [id, count] of Object.entries(answer?.workspaces ?? {})) {
      if (typeof count !== 'number') continue
      caches.w.set(id, count)
      answered.add(workspaceKey(id))
    }
    settled = true
  } catch {
    // The rows keep no badge. Nothing is marked unanswered, so the next
    // observation asks again — but not sooner than the cooldown, so a route
    // that stays broken is not hammered by the sidebar's own re-renders.
    cooldownUntil = Date.now() + RETRY_AFTER_MS
  } finally {
    for (const entry of batch) onWire.delete(entry)
  }

  if (!settled) return
  for (const entry of batch) if (!answered.has(entry)) unanswered.add(entry)
  notify()
}
