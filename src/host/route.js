/**
 * The route's request dispatch: validate the envelope, then either count one
 * batch of Sessions or Workspaces, or resolve the session's workspace and run
 * the action the body names.
 */

import { MAX_BODY_BYTES, describe, failure, readJson } from './protocol.js'
import { createNote, listNotes, removeNote, saveNote } from './notes.js'
import { countsBySession, countsByWorkspace, sessionRootOf } from './workspace.js'

/**
 * Answer one notes request.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context.
 * @param {Request} request - incoming request.
 * @returns {Promise<Response>} the JSON response.
 */
export async function handle(ctx, request) {
  const decoded = await readJson(request, MAX_BODY_BYTES)
  if (decoded.code !== undefined) return failure(decoded.code, decoded.message)

  const body = decoded.value
  const action = body.action

  // `counts` answers for ids rather than for one Session, so it runs before the
  // single-session resolution below.
  if (action === 'counts') {
    try {
      const answer = {}
      if (body.sessionIds !== undefined) {
        const counted = await countsBySession(ctx, body.sessionIds)
        if (counted.code !== undefined) return failure(counted.code, counted.message)
        answer.sessions = counted.value
      }
      if (body.workspaceIds !== undefined) {
        const counted = await countsByWorkspace(ctx, body.workspaceIds)
        if (counted.code !== undefined) return failure(counted.code, counted.message)
        answer.workspaces = counted.value
      }
      if (answer.sessions === undefined && answer.workspaces === undefined) {
        return failure('bad-request', 'counts needs sessionIds or workspaceIds.')
      }
      return Response.json(answer)
    } catch (error) {
      return failure('io-error', describe(error))
    }
  }

  const resolved = await sessionRootOf(ctx, body.sessionId)
  if (resolved.code !== undefined) return failure(resolved.code, resolved.message)
  const root = resolved.root
  const sessionId = body.sessionId

  try {
    switch (action) {
      case 'list':
        return Response.json({ notes: await listNotes(root, sessionId) })

      case 'create': {
        const created = await createNote(root, sessionId, body.text)
        return created.code === undefined ? Response.json({ note: created.value }) : failure(created.code, created.message)
      }

      case 'save': {
        const result = await saveNote(root, sessionId, body.id, body.text)
        return result.code === undefined ? Response.json({ note: result.value }) : failure(result.code, result.message)
      }

      case 'delete': {
        const result = await removeNote(root, sessionId, body.id)
        return result.code === undefined ? Response.json({ note: result.value }) : failure(result.code, result.message)
      }

      default:
        return failure('unknown-action', `Unknown notes action ${JSON.stringify(action)}.`)
    }
  } catch (error) {
    return failure('io-error', describe(error))
  }
}
