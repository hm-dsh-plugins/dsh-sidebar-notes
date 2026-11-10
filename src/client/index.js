/**
 * Browser half of `dsh-sidebar-notes`.
 *
 * It contributes one page type to the right Sidebar, one entry box on the guide
 * page — the list of doors the column shows while it is empty — and the note
 * count on every Session row. Picking the entry opens the notes page in the
 * guide's place, which is how every shipped type behaves.
 *
 * The notes belong to one conversation: the page edits the notes of the Session
 * its tab was opened for, and the row's count is that same Session's number.
 *
 * The type claims no address, so it never competes with a file preview.
 */

import { NOTES_ID, notesDefinition } from './definition.js'
import { NotesBody } from './NotesBody.jsx'
import { SessionNotesBadge } from './SessionNotesBadge.jsx'
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
 * Client plugin body: register the notes type, its guide entry, its page body,
 * the Session row badge, and the dictionaries behind every label.
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

  // The Session row's leading cell, offered by the sidebar to decorations such
  // as this one.
  ctx.effect(() => ctx.slots.inject('sidebar.session.row.leading', () => ctx.slots.register(
    {
      name: 'sidebar.session.row.leading',
      id: 'dsh-notes-count',
      order: 40,
      locale: NS,
    },
    SessionNotesBadge,
  )), 'dsh-sidebar-notes: session row count')

  // Workspace rows live in another package's markup and carry no seat, so their
  // aggregate count is marked onto the row and drawn by this plugin's own rule.
  // A decoration must never take the page with it: if this throws, the notes
  // page itself stays whole and only those badges are missing.
  ctx.effect(() => {
    try {
      return installSidebarCounts()
    } catch (error) {
      console.warn('[dsh-sidebar-notes] sidebar counts are unavailable:', error)
      return () => {}
    }
  }, 'dsh-sidebar-notes: sidebar counts')
}
