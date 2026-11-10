/**
 * The note counts the sidebar draws itself, and the stylesheet both of them need.
 *
 * A Session row has a leading seat, so its badge is a component
 * (`SessionNotesBadge.jsx`). A Workspace row has no seat at all, so its count
 * rides on that row's title element as a `data-` attribute and this module's own
 * `::after` rule draws it. Nothing is inserted into the other package's DOM:
 * React never rewrites an attribute it did not write, so a re-render cannot drop
 * the mark, and a changed row shape degrades to "no badge" instead of broken
 * markup.
 *
 * A MutationObserver is the only trigger for Workspace rows, because they are
 * destroyed and rebuilt by the sidebar's own state changes — an element that
 * does not exist yet cannot be painted. It is also what re-asks for the Session
 * counts that a first, failed request left unknown.
 */
import {
  ensureSessionCounts, ensureWorkspaceCounts, subscribe, workspaceCountOf,
} from './note-counts.js'

/** Keeps a second install from injecting a second sheet. */
const STYLE_ID = 'dsh-notes-sidebar'

/** The sidebar's row-key prefixes. */
const WORKSPACE_PREFIX = 'workspace:'
const SESSION_PREFIX = 'session:'

/** The attribute a Workspace badge renders from. */
const ATTRIBUTE = 'data-dsh-notes-workspace'

/** Quiet time after a DOM change before the rows are examined. */
const DEBOUNCE_MS = 150

const CSS = `
[${ATTRIBUTE}]::after {
  content: attr(${ATTRIBUTE});
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

.dsh-notes-row-count {
  box-sizing: border-box;
  padding: 0 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  line-height: 15px;
  text-align: center;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  border-radius: 4px;
}
`

let observer
let scanTimer
let unsubscribe
let installed = false

/** The list container last scanned; `null` falls back to the whole document. */
let list = null

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
 * The row ids currently on screen for one prefix.
 * @param {ParentNode} scope - where to look.
 * @param {string} prefix - `workspace:` or `session:`.
 * @returns {Map<string, Element>} the first row per id.
 */
function rowsOf(scope, prefix) {
  const found = new Map()
  for (const row of scope.querySelectorAll(`[data-row-key^="${prefix}"]`)) {
    const key = row.getAttribute('data-row-key')
    const id = key === null ? '' : key.slice(prefix.length)
    // The ungrouped Workspace bucket carries the prefix and an empty id.
    if (id === '') continue
    if (!found.has(id)) found.set(id, row)
  }
  return found
}

/**
 * Paint every Workspace row whose count is known, then ask about the rest.
 * @param {ParentNode} scope - where the rows are.
 */
function paintWorkspaces(scope) {
  const missing = new Set()
  for (const [id, row] of rowsOf(scope, WORKSPACE_PREFIX)) {
    const title = titleOf(row)
    if (title === null) continue
    const count = workspaceCountOf(id)
    if (count === undefined) {
      missing.add(id)
      continue
    }
    // A Workspace with no notes carries no mark; the row must not keep an old one.
    if (count > 0) title.setAttribute(ATTRIBUTE, String(count))
    else title.removeAttribute(ATTRIBUTE)
  }
  if (missing.size > 0) ensureWorkspaceCounts(missing)
}

/**
 * Ask the store about every Session row on screen.
 *
 * A row that already knows its count costs nothing here, so this doubles as the
 * retry after a batch that failed.
 * @param {ParentNode} scope - where the rows are.
 */
function requestSessionCounts(scope) {
  ensureSessionCounts(rowsOf(scope, SESSION_PREFIX).keys())
}

/** Repaint the Workspace rows and ask about anything still unknown. */
function refresh() {
  const scope = list !== null && list.isConnected ? list : document
  paintWorkspaces(scope)
  requestSessionCounts(scope)

  // Once a row proves where the list lives, later scans stay inside it. Without
  // an explicit tree container the scan stays document-wide rather than guessing
  // at a parent that may hold only one group.
  if (list === null || !list.isConnected) {
    const first = rowsOf(scope, WORKSPACE_PREFIX).values().next().value
    if (first !== undefined) list = first.closest('[role="tree"]')
  }
}

/**
 * Watch the sidebar's rows and keep both badges current.
 * @returns {() => void} idempotent teardown.
 */
export function installSidebarCounts() {
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

  // A settled batch repaints the Workspace rows; the Session badges are
  // subscribers of their own and re-render from the same notification.
  unsubscribe = subscribe(refresh)

  observer = new MutationObserver(() => {
    clearTimeout(scanTimer)
    scanTimer = setTimeout(refresh, DEBOUNCE_MS)
  })
  // `documentElement` is always present, even if this runs before `<body>`.
  observer.observe(document.body ?? document.documentElement, { childList: true, subtree: true })

  refresh()

  return () => {
    if (!installed) return
    installed = false
    observer?.disconnect()
    observer = undefined
    unsubscribe?.()
    unsubscribe = undefined
    clearTimeout(scanTimer)
    list = null
    document.getElementById(STYLE_ID)?.remove()
    for (const title of document.querySelectorAll(`[${ATTRIBUTE}]`)) title.removeAttribute(ATTRIBUTE)
  }
}
