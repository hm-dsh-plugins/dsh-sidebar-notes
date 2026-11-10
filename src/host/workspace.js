/**
 * The workspace root a session's notes live under.
 *
 * This is the route's only trust boundary: the notes directory is derived from
 * the session, never from a path the browser supplies.
 *
 * A live session carries its header in memory; a session restored after a
 * restart does not, and only persistence knows it.
 */
import { describe } from './protocol.js'

/**
 * Resolve one session's workspace directory.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context.
 * @param {unknown} sessionId - session identity from the request.
 * @returns {Promise<{ root?: string, code?: string, message?: string }>}
 *   `{ root }`, or `{ code, message }` to answer with.
 */
export async function workspaceRootOf(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return { code: 'bad-request', message: 'sessionId is required.' }
  }

  const live = ctx.sessions.get(sessionId)
  const fromLive = live?.header?.cwd
  if (typeof fromLive === 'string' && fromLive.length > 0) return { root: fromLive }

  const persistence = ctx.get('sessionPersistence')
  if (persistence !== undefined) {
    try {
      // `sessionPersistence.stat` answers `{ header, revision }`.
      const stored = await persistence.stat(sessionId)
      const fromStore = stored?.header?.cwd
      if (typeof fromStore === 'string' && fromStore.length > 0) return { root: fromStore }
    } catch (error) {
      return { code: 'unknown-session', message: `That session's workspace is unavailable: ${describe(error)}` }
    }
  }

  return {
    code: 'unknown-session',
    message: 'That session has no known workspace directory, so its notes cannot be found.',
  }
}
