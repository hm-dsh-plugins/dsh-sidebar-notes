/**
 * Stage one of the registration: what the `notes` tab type IS.
 *
 * The type is a page, not a viewer: it claims no address, so it can never take
 * a file away from a preview. Its guide entry is the entry box that opens it
 * from the empty Sidebar.
 */

/** The tab kind this package owns. */
export const NOTES_KIND = 'notes'

/** This implementation's identity in the tab system, and the key its body registers under. */
export const NOTES_ID = 'dsh-notes'

/**
 * The notes type's registry definition.
 * @param t - namespace-bound translate, read fresh on every label call.
 * @returns the definition to register.
 */
export function notesDefinition(t) {
  return {
    id: NOTES_ID,
    kind: NOTES_KIND,
    // No `priority`: a type from outside the product registers in the
    // `extension` band, which is the highest. The kind is new, so nothing is
    // taken over.
    title: () => t('type.label'),
    // A visited page stays mounted while another tab shows: half-typed text
    // keeps its pending write and the scroll position survives the round trip.
    keepMounted: true,
    guide: [{
      id: 'notes',
      order: 40,
      title: () => t('guide.title'),
      description: () => t('guide.description'),
    }],
  }
}
