/**
 * Browser half of `dsh-notes`.
 *
 * It contributes one page type to the right Sidebar and one entry box on the
 * guide page — the list of doors the column shows while it is empty. Picking
 * the entry opens the notes page in the guide's place, which is how every
 * shipped type behaves.
 *
 * Nothing is stored yet: the page is the entry point, and the body says so.
 * The type claims no address, so it never competes with a file preview.
 */

import { NOTES_ID, notesDefinition } from './definition.js'
import { NotesBody } from './NotesBody.jsx'
import { en, zh } from './locales.js'
import { installWorkspaceNoteBadges } from './workspace-badges.js'

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
 * and the dictionaries behind every label.
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

  // The Workspace rows live in another package's markup and carry no slot, so
  // the count is marked onto their title element and drawn by our own rule.
  // A decoration must never take the page with it: if this throws, the notes
  // page itself stays whole and only the badges are missing.
  ctx.effect(() => {
    try {
      return installWorkspaceNoteBadges()
    } catch (error) {
      console.warn('[dsh-sidebar-notes] workspace badges are unavailable:', error)
      return () => {}
    }
  }, 'dsh-sidebar-notes: workspace badges')
}
