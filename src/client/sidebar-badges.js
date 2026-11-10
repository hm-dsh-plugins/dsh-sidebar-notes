/**
 * The sidebar's note indicator, and the stylesheet both it and the tab chip need.
 *
 * A Session row has no free cell for a number — the leading 16px belongs to the
 * status dot, the trailing block belongs to the time — so the row says the one
 * thing that is worth a permanent mark: **this conversation has notes**. The
 * mark is drawn by this plugin's own rule on a `data-` attribute, never by
 * inserting a node into another package's markup: React never rewrites an
 * attribute it did not write, so a re-render cannot drop the mark, and a changed
 * row shape degrades to "no mark" instead of broken markup.
 *
 * A Workspace row has no seat at all, so its aggregate rides on that row's title
 * element the same way — where a number still earns its space, because that row
 * has no other door.
 *
 * A MutationObserver is the only trigger: the rows are destroyed and rebuilt by
 * the sidebar's own state changes, so an element that does not exist yet cannot
 * be painted. It is also what re-asks for counts a failed batch left unknown.
 */
import {
  ensureSessionCounts, ensureWorkspaceCounts, sessionCountOf, subscribe, workspaceCountOf,
} from './note-counts.js'

/** Keeps a second install from injecting a second sheet. */
const STYLE_ID = 'dsh-notes-sidebar'

/** The sidebar's row-key prefixes. */
const WORKSPACE_PREFIX = 'workspace:'
const SESSION_PREFIX = 'session:'

/** The attributes the two marks render from; the value is the count. */
const WORKSPACE_ATTRIBUTE = 'data-dsh-notes-workspace'
const SESSION_ATTRIBUTE = 'data-dsh-notes-session'

/** Quiet time after a DOM change before the rows are examined. */
const DEBOUNCE_MS = 150

const CSS = `
[${WORKSPACE_ATTRIBUTE}]::after {
  content: attr(${WORKSPACE_ATTRIBUTE});
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

/* A color bar, not a tinted label: the shape carries "has notes" on its own, so
   the mark survives a colorblind reader and never competes with the title's
   selection color. The row already reserves a transparent inline border as its
   paint inset, so recoloring that edge costs no layout and follows the radius.
   Two attributes, not one: the row's own border-inline shorthand sets the same
   property at equal specificity, and this sheet cannot count on being injected
   last. */
[${SESSION_ATTRIBUTE}][role='treeitem'] {
  border-inline-start-color: var(--dsw-alias-state-business-primary);
}

.dsh-notes-tab-count {
  margin-inline-start: 5px;
  padding: 0 5px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  line-height: 15px;
  color: var(--dsw-alias-label-tertiary);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent);
  border-radius: 999px;
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
 * Mark every Session row that holds notes, and ask about the ones still unknown.
 *
 * The mark is presence, not a number: the count a row would have to show cannot
 * fit in the cell the row leaves for it. The exact figure lives in the tab chip
 * and in the Workspace aggregate.
 * @param {ParentNode} scope - where the rows are.
 */
function paintSessions(scope) {
  const missing = new Set()
  for (const [id, row] of rowsOf(scope, SESSION_PREFIX)) {
    const count = sessionCountOf(id)
    if (count === undefined) {
      missing.add(id)
      continue
    }
    if (count > 0) row.setAttribute(SESSION_ATTRIBUTE, String(count))
    else row.removeAttribute(SESSION_ATTRIBUTE)
  }
  if (missing.size > 0) ensureSessionCounts(missing)
}

/**
 * Paint every Workspace row whose aggregate is known, then ask about the rest.
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
    if (count > 0) title.setAttribute(WORKSPACE_ATTRIBUTE, String(count))
    else title.removeAttribute(WORKSPACE_ATTRIBUTE)
  }
  if (missing.size > 0) ensureWorkspaceCounts(missing)
}

/** Repaint the rows and ask about anything still unknown. */
function refresh() {
  const scope = list !== null && list.isConnected ? list : document
  paintSessions(scope)
  paintWorkspaces(scope)

  // Once a row proves where the list lives, later scans stay inside it. Without
  // an explicit tree container the scan stays document-wide rather than guessing
  // at a parent that may hold only one group.
  if (list === null || !list.isConnected) {
    const first = rowsOf(scope, WORKSPACE_PREFIX).values().next().value
    if (first !== undefined) list = first.closest('[role="tree"]')
  }
}

/**
 * Watch the sidebar's rows and keep both marks current.
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

  // A settled batch repaints the rows; the tab chip is a subscriber of its own
  // and re-renders from the same notification.
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
    for (const node of document.querySelectorAll(`[${WORKSPACE_ATTRIBUTE}]`)) node.removeAttribute(WORKSPACE_ATTRIBUTE)
    for (const node of document.querySelectorAll(`[${SESSION_ATTRIBUTE}]`)) node.removeAttribute(SESSION_ATTRIBUTE)
  }
}
