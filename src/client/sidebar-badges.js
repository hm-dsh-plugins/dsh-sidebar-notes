/**
 * The sidebar's Workspace counters, and the stylesheet every piece of this
 * plugin's sidebar surface needs.
 *
 * A Workspace row has no seat, so its aggregate rides on that row's title
 * element as a `data-` attribute and this module's own `::after` rule draws it.
 * One number is worth the space there: the Workspace row is the only row with no
 * other door, and nothing else competes for it. Session rows are marked by
 * seats instead (`SessionNoteDot.jsx`, `NotesTabTitle.jsx`), so no Session row
 * is written to here.
 *
 * A MutationObserver is the only trigger, because the rows are destroyed and
 * rebuilt by the sidebar's own state changes — an element that does not exist
 * yet cannot be painted.
 */
import { ensureWorkspaceCounts, subscribe, workspaceCountOf } from './note-counts.js'

/** Keeps a second install from injecting a second sheet. */
const STYLE_ID = 'dsh-notes-sidebar'

/** The sidebar's row-key prefix for a Workspace group. */
const WORKSPACE_PREFIX = 'workspace:'

/** The attribute the Workspace badge renders from; the value is the count. */
const WORKSPACE_ATTRIBUTE = 'data-dsh-notes-workspace'

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

/* The Session row's note dot. A filled shape, not a tinted label: it survives a
   row whose title is being selected and reads without relying on hue alone. */
.dsh-notes-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary);
}

/* The note line in the row's hover card. That card is a dark surface in both
   themes with fixed colors, so this copies the card's own status row metrics
   instead of borrowing a theme label color the card does not use. */
.dsh-notes-hover {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 20px;
  color: #ADB2B8;
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
 * Paint every Workspace row whose aggregate is known, then ask about the rest.
 * @param {ParentNode} scope - where the rows are.
 */
function refresh() {
  const scope = list !== null && list.isConnected ? list : document
  const missing = new Set()
  let first

  for (const row of scope.querySelectorAll(`[data-row-key^="${WORKSPACE_PREFIX}"]`)) {
    const key = row.getAttribute('data-row-key')
    const id = key === null ? '' : key.slice(WORKSPACE_PREFIX.length)
    // The ungrouped bucket carries the prefix and an empty id.
    if (id === '') continue
    if (first === undefined) first = row

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

  // Once a row proves where the list lives, later scans stay inside it. Without
  // an explicit tree container the scan stays document-wide rather than guessing
  // at a parent that may hold only one group.
  if (list === null || !list.isConnected) {
    if (first !== undefined) list = first.closest('[role="tree"]')
  }
}

/**
 * Watch the sidebar's Workspace rows and keep their aggregate current.
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

  // A settled batch repaints the rows; the row dot and the tab chip are
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
    for (const node of document.querySelectorAll(`[${WORKSPACE_ATTRIBUTE}]`)) node.removeAttribute(WORKSPACE_ATTRIBUTE)
  }
}
