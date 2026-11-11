/**
 * Browser half of `dsh-sidebar-notes`.
 *
 * It contributes one page type to the right Sidebar, one entry box on the guide
 * page — the list of doors the column shows while it is empty — the note count
 * on that type's tab chip, a dot on every Session row whose conversation holds
 * notes, and the same count as a line in that row's hover card. Picking the
 * entry opens the notes page in the guide's place, which is how every shipped
 * type behaves.
 *
 * The notes belong to one conversation: the page edits the notes of the Session
 * its tab was opened for, and both the chip and the dot describe that same
 * Session.
 *
 * The type claims no address, so it never competes with a file preview.
 */

import { NOTES_ID, notesDefinition } from './definition.js'
import { NotesBody } from './NotesBody.jsx'
import { NotesTabTitle } from './NotesTabTitle.jsx'
import { SessionNoteDot } from './SessionNoteDot.jsx'
import { SessionNotesHover } from './SessionNotesHover.jsx'
import { en, zh } from './locales.js'
import { installSidebarCounts } from './sidebar-badges.js'

export const name = 'dsh-sidebar-notes'

/** This package's copy namespace. */
const NS = 'dshNotes'

/**
 * The client services this plugin reaches for.
 *
 * Every one of them must be injected, not merely used: cordis resolves a
 * service on `ctx` only for fibers that declare it. Declaring them also makes
 * load order irrelevant — the fiber waits until the right Sidebar provides its
 * registry and navigation face.
 */
export const inject = ['slots', 'locale', 'sidebarRightTabs']

/**
 * Client plugin body: register the notes type, its guide entry, its page body
 * and tab title, the sidebar marks, and the dictionaries behind every label.
 * @param ctx - the client root context.
 */
export function apply(ctx) {
  const t = ctx.locale.bind(NS)

  ctx.effect(() => ctx.sidebarRightTabs.register(notesDefinition(t)), 'dsh-sidebar-notes: notes type')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-sidebar-notes: dictionaries')

  // The body is keyed by the definition's id, so the seat finds it for every
  // notes tab, docked or floating, in every pane.
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    {
      name: 'sidebar.right.pane.tab',
      key: NOTES_ID,
      locale: NS,
    },
    NotesBody,
  )), 'dsh-sidebar-notes: notes body')

  // The chip that names this tab: the type label plus this Session's count. It
  // is dispatched by the same key the body registers under.
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
    {
      name: 'sidebar.right.pane.tab.title',
      key: NOTES_ID,
      locale: NS,
    },
    NotesTabTitle,
  )), 'dsh-sidebar-notes: notes tab title')

  // The dot in the row's leading cell: this conversation holds notes. A seat
  // rather than a DOM write. The row offers that cell while its own state is
  // idle, so a run in progress keeps its status dot there and the note mark
  // steps aside.
  ctx.effect(() => ctx.slots.inject('sidebar.session.row.leading', () => ctx.slots.register(
    {
      name: 'sidebar.session.row.leading',
      id: 'dsh-notes-dot',
      order: 40,
      locale: NS,
    },
    SessionNoteDot,
  )), 'dsh-sidebar-notes: session row dot')

  // The count line in that row's hover card: what the dot means, and how many.
  // The card's status line stays the card's — a Session's own state is not a
  // fact about its notes. Ahead of the scheduled-task section (order 10) because
  // this is one line and those can be several.
  ctx.effect(() => ctx.slots.inject('sidebar.session.row.hover', () => ctx.slots.register(
    {
      name: 'sidebar.session.row.hover',
      id: 'dsh-notes-hover',
      order: 5,
      locale: NS,
    },
    SessionNotesHover,
  )), 'dsh-sidebar-notes: session row hover note count')

  // Workspace rows have no seat at all, so their aggregate is marked onto the
  // row and drawn by this plugin's own rule. A decoration must never take the
  // page with it: if this throws, the notes page itself stays whole and only
  // that badge is missing.
  ctx.effect(() => {
    try {
      return installSidebarCounts()
    } catch (error) {
      console.warn('[dsh-sidebar-notes] sidebar counts are unavailable:', error)
      return () => {}
    }
  }, 'dsh-sidebar-notes: sidebar counts')
}
