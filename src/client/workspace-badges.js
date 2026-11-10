/**
 * Note counts on the sidebar's Workspace rows.
 *
 * The sidebar gives a Workspace row no slot, so the count rides on that row's
 * title element as a `data-` attribute and this plugin's own `::after` rule
 * draws it. Nothing is inserted into the other package's DOM: React never
 * rewrites an attribute it did not write, so a re-render cannot drop the mark,
 * and a changed row shape degrades to "no badge" instead of broken markup.
 *
 * A MutationObserver is the only trigger, because the rows are destroyed and
 * rebuilt by the sidebar's own state changes — an element that does not exist
 * yet cannot be painted.
 */
import { callHost } from './notes-api.js'

/** Keeps a second install from injecting a second sheet. */
const STYLE_ID = 'dsh-notes-workspace-badges'

/** The sidebar's row-key prefix for a Workspace group. */
const ROW_PREFIX = 'workspace:'

/** The attribute the badge renders from. */
const ATTRIBUTE = 'data-dsh-notes'

/** Quiet time after a DOM change before the rows are examined. */
const DEBOUNCE_MS = 150

/** Workspace ids per request; the Host refuses more. */
const MAX_BATCH = 200

const CSS = `
[data-dsh-notes]::after {
  content: attr(data-dsh-notes);
  display: inline-block;
  box-sizing: border-box;
  min-width: 16px;
  margin-inline-start: 6px;
  padding: 0 5px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 500;
  line-height: 15px;
  text-align: center;
  vertical-align: 1px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent);
  border-radius: 999px;
}
`

/** Workspace id → its note count, as last reported by the Host. */
const counts = new Map()

/** Ids the Host did not resolve; they get no badge and are not asked again. */
const unresolved = new Set()

/** Ids with a request on the wire. */
const inFlight = new Set()

/** Ids waiting for the next batch. */
const queued = new Set()

let observer
let scanTimer
let flushTimer

/** The list container last scanned; falls back to the whole document. */
let list

let installed = false

/**
 * The title element inside one Workspace row.
 *
 * The row is `[folder][chevron][text][actions]`, and the title is the single
 * span inside the text cell. Anything else answers null: a row this plugin does
 * not recognize simply gets no badge.
 * @param {Element} row - one Workspace row.
 * @returns {HTMLElement | null} the title element.
 */
function titleOf(row) {
  const text = row.children[2]
  const title = text?.firstElementChild
  return title instanceof HTMLElement && title.tagName === 'SPAN' ? title : null
}

/**
 * Write or clear one row's badge.
 * @param {HTMLElement} title - the row's title element.
 * @param {number} count - note count.
 */
function paint(title, count) {
  if (count > 0) title.setAttribute(ATTRIBUTE, String(count))
  else title.removeAttribute(ATTRIBUTE)
}

/**
 * The rows currently on screen, one per Workspace id.
 * @returns {Map<string, Element>} rows keyed by Workspace id.
 */
function rows() {
  const scope = list !== null && list.isConnected ? list : document
  const found = new Map()
  for (const row of scope.querySelectorAll(`[data-row-key^="${ROW_PREFIX}"]`)) {
    const key = row.getAttribute('data-row-key')
    const id = key === null ? '' : key.slice(ROW_PREFIX.length)
    // The ungrouped bucket carries the prefix and an empty id.
    if (id === '') continue
    if (!found.has(id)) found.set(id, row)
  }
  return found
}

/**
 * Paint every row whose count is known, then ask about the rest.
 */
function refresh() {
  const visible = rows()
  const missing = []
  for (const [id, row] of visible) {
    const title = titleOf(row)
    if (title === null) continue
    const count = counts.get(id)
    if (count === undefined) {
      if (!unresolved.has(id)) missing.push(id)
      continue
    }
    paint(title, count)
  }

  // Once a row proves where the list lives, later scans stay inside it. Without
  // an explicit tree container the scan stays document-wide rather than guessing
  // at a parent that may hold only one group.
  const first = visible.values().next().value
  if (first !== undefined) {
    if (list === null || !list.isConnected) list = first.closest('[role="tree"]')
  }

  if (missing.length > 0) request(missing)
}

/**
 * Queue ids for the next batch.
 * @param {string[]} ids - Workspace ids without a known count.
 */
function request(ids) {
  for (const id of ids) {
    if (inFlight.has(id) || unresolved.has(id)) continue
    queued.add(id)
  }
  if (queued.size === 0) return
  clearTimeout(flushTimer)
  flushTimer = setTimeout(() => { void flush() }, DEBOUNCE_MS)
}

/**
 * Ask the Host about every queued id in one request.
 */
async function flush() {
  const batch = [...queued].slice(0, MAX_BATCH)
  queued.clear()
  if (batch.length === 0) return
  for (const id of batch) inFlight.add(id)

  let settled = false
  try {
    const result = await callHost('counts', { workspaceIds: batch })
    const answered = result?.counts ?? {}
    for (const [id, count] of Object.entries(answered)) {
      if (typeof count === 'number') counts.set(id, count)
    }
    for (const id of batch) {
      if (!(id in answered)) unresolved.add(id)
    }
    settled = true
  } catch {
    // A failed batch leaves the rows unbadged and nothing is marked
    // unresolved: the next DOM change asks again, so a transient failure heals
    // instead of pinning a workspace to "no notes" for the session.
  } finally {
    for (const id of batch) inFlight.delete(id)
  }

  // Only a settled batch repaints; repainting after a failure would re-queue the
  // same ids and spin between the observer and the route.
  if (settled) refresh()
}

/** Re-read the counts after this page changed them. */
export function invalidateWorkspaceNoteBadges() {
  counts.clear()
  unresolved.clear()
  if (installed) refresh()
}

/**
 * Watch the sidebar for Workspace rows and keep their badges current.
 * @returns {() => void} idempotent teardown.
 */
export function installWorkspaceNoteBadges() {
  if (installed) {
    refresh()
    return () => {}
  }
  installed = true

  if (document.getElementById(STYLE_ID) === null) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.append(style)
  }

  observer = new MutationObserver(() => {
    clearTimeout(scanTimer)
    scanTimer = setTimeout(refresh, DEBOUNCE_MS)
  })
  observer.observe(document.body, { childList: true, subtree: true })

  refresh()

  return () => {
    if (!installed) return
    installed = false
    observer?.disconnect()
    observer = undefined
    clearTimeout(scanTimer)
    clearTimeout(flushTimer)
    queued.clear()
    inFlight.clear()
    list = null
    for (const title of document.querySelectorAll(`[${ATTRIBUTE}]`)) title.removeAttribute(ATTRIBUTE)
  }
}
