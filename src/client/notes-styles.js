/**
 * The page's stylesheet, injected once for as many pages as are mounted.
 *
 * Class names all start with `dsh-notes-` so the rules cannot reach another
 * plugin's markup, and every colour and radius is a `--dsw-*` token, so the
 * light and dark themes are followed without a second palette.
 *
 * The notes are one grouped surface, not a stack of separate cards: the same
 * construction the settings and permission panels use (a 0.5px `border-l3`
 * rule at `radius-md`, one `border-top` between rows). Separate floating cards
 * read as loose slips on the light theme, where `bg-base` and `bg-layer-1` are
 * the same colour and only a 12% hairline marks an edge.
 */
import { useEffect } from 'react'

/** The element id that keeps a second mount from injecting a second copy. */
const STYLE_ID = 'dsh-notes-styles'

/** Pages currently mounted; the sheet goes when the last one leaves. */
let mounted = 0

const CSS = `
.dsh-notes-page {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
  color: var(--dsw-alias-label-primary);
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: 1.5;
}
.dsh-notes-page-header {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  box-sizing: border-box;
  height: 38px;
  padding: 0 16px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}
.dsh-notes-scope {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-notes-loading {
  margin: 0;
  padding: 12px 16px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
.dsh-notes-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 16px 16px;
  overflow: auto;
  scrollbar-gutter: stable;
}
.dsh-notes-card {
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
}
.dsh-notes-composer {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  box-sizing: border-box;
  padding: 8px 8px 8px 14px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}
.dsh-notes-composer-input {
  /* border-box is load-bearing: the height above comes from the measured
     scrollHeight, which counts the padding. With content-box the first write
     added that 8px of padding on top of the measured height — one visible
     jump, and then it stayed there. */
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 26px;
  max-height: 120px;
  margin: 0;
  padding: 4px 0;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  background: transparent;
  border: 0;
  outline: none;
  resize: none;
}
.dsh-notes-composer-input::placeholder {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-notes-composer-add {
  flex: none;
  padding: 4px 10px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  background: var(--dsw-alias-interactive-bg-hover);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}
.dsh-notes-composer-add:disabled {
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
  cursor: default;
}
.dsh-notes-composer-add:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-notes-banner {
  margin: 0;
  padding: 8px 14px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}
.dsh-notes-note {
  margin: 0;
  padding: 12px 14px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.6;
}
.dsh-notes-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px 14px;
}
.dsh-notes-block + .dsh-notes-block {
  border-top: 0.5px solid var(--dsw-alias-border-l3);
}
.dsh-notes-block:focus-within {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, transparent);
}
@media (hover: hover) {
  .dsh-notes-block:hover {
    background: var(--dsw-alias-interactive-bg-hover);
  }
  .dsh-notes-block:hover:focus-within {
    background: color-mix(in srgb, var(--dsw-alias-brand-primary) 4%, transparent);
  }
}
.dsh-notes-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
}
.dsh-notes-stamp {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-notes-status[data-state='error'] {
  color: var(--dsw-alias-state-error-primary);
}
.dsh-notes-actions {
  display: flex;
  flex: none;
  gap: 2px;
  align-items: center;
}
.dsh-notes-copy,
.dsh-notes-insert,
.dsh-notes-remove {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 20px;
  height: 20px;
  padding: 0;
  color: var(--dsw-alias-label-tertiary);
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  cursor: pointer;
  opacity: 0;
  transition: opacity 100ms ease;
}
.dsh-notes-block:hover .dsh-notes-copy,
.dsh-notes-block:hover .dsh-notes-insert,
.dsh-notes-block:hover .dsh-notes-remove,
.dsh-notes-block:focus-within .dsh-notes-copy,
.dsh-notes-block:focus-within .dsh-notes-insert,
.dsh-notes-block:focus-within .dsh-notes-remove,
.dsh-notes-copy:focus-visible,
.dsh-notes-insert:focus-visible,
.dsh-notes-remove:focus-visible {
  opacity: 1;
}
.dsh-notes-copy:hover:not(:disabled),
.dsh-notes-insert:hover:not(:disabled),
.dsh-notes-remove:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-notes-copy[data-copied='true'],
.dsh-notes-insert[data-inserted='true'] {
  color: var(--dsw-alias-state-success-primary);
}
.dsh-notes-copy:disabled,
.dsh-notes-insert:disabled {
  cursor: default;
}
.dsh-notes-block:hover .dsh-notes-copy:disabled,
.dsh-notes-block:hover .dsh-notes-insert:disabled,
.dsh-notes-block:focus-within .dsh-notes-copy:disabled,
.dsh-notes-block:focus-within .dsh-notes-insert:disabled {
  opacity: 0.35;
}
.dsh-notes-remove:hover {
  color: var(--dsw-alias-state-error-primary);
}
.dsh-notes-remove[data-confirming='true'] {
  padding: 0 8px;
  color: var(--dsw-static-neutral-00);
  background: var(--dsw-alias-state-error-primary);
}
.dsh-notes-remove[data-confirming='true']:hover {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-static-neutral-00));
}
@media (hover: none) {
  .dsh-notes-copy,
  .dsh-notes-insert,
  .dsh-notes-remove {
    opacity: 1;
  }
}
.dsh-notes-area {
  display: block;
  width: 100%;
  min-height: 22px;
  padding: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  line-height: 1.6;
  background: transparent;
  border: 0;
  outline: none;
  resize: none;
}
.dsh-notes-area::placeholder {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-notes-failure {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}
.dsh-notes-failure-title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 600;
}
.dsh-notes-failure-text {
  margin: 0;
  max-width: 30em;
  font-size: 12px;
  line-height: 1.6;
}
.dsh-notes-retry {
  padding: 4px 12px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  cursor: pointer;
}
.dsh-notes-retry:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
`

/** Inject the stylesheet for the lifetime of the page. */
export function useNotesStyles() {
  useEffect(() => {
    mounted += 1
    if (document.getElementById(STYLE_ID) === null) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      document.head.append(style)
    }
    return () => {
      mounted -= 1
      if (mounted > 0) return
      document.getElementById(STYLE_ID)?.remove()
    }
  }, [])
}
