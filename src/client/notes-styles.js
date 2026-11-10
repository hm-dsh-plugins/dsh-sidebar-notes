/**
 * The page's stylesheet, injected once for as many pages as are mounted.
 *
 * Class names all start with `dsh-notes-` so the rules cannot reach another
 * plugin's markup, and every colour is a `--dsw-alias-*` token, so the light and
 * dark themes are followed without a second palette.
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
.dsh-notes-header {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  align-items: center;
  box-sizing: border-box;
  height: 38px;
  padding: 0 6px 0 16px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}
.dsh-notes-title {
  flex: 1 1 auto;
  margin: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-notes-add {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--dsw-radius-md, 6px);
  cursor: pointer;
}
.dsh-notes-add:hover:not(:disabled) {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-notes-add:disabled {
  cursor: default;
  opacity: 0.5;
}
.dsh-notes-body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 8px 16px 16px;
  overflow: auto;
  scrollbar-gutter: stable;
}
.dsh-notes-banner {
  margin: 0;
  padding: 6px 8px;
  color: var(--dsw-alias-label-error);
  font-size: 12px;
  border: 0.5px solid var(--dsw-alias-label-error);
  border-radius: var(--dsw-radius-md, 6px);
}
.dsh-notes-block {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px 10px;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md, 6px);
  background: var(--dsw-alias-bg-base);
}
.dsh-notes-block:focus-within {
  border-color: var(--dsw-alias-brand-primary);
}
.dsh-notes-meta {
  display: flex;
  align-items: center;
  gap: 8px;
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
  color: var(--dsw-alias-label-error);
}
.dsh-notes-area {
  width: 100%;
  min-height: 40px;
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
.dsh-notes-empty {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--dsw-alias-label-tertiary);
  text-align: center;
}
.dsh-notes-empty-title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 600;
}
.dsh-notes-empty-text {
  margin: 0;
  max-width: 30em;
  font-size: 12px;
  line-height: 1.6;
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
.dsh-notes-retry {
  padding: 4px 12px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md, 6px);
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
