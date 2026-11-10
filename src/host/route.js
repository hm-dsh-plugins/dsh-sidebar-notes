/**
 * The route's request dispatch: validate the envelope, then either count one
 * batch of Workspaces or resolve the session's workspace and run the action the
 * body names.
 */

import { MAX_BODY_BYTES, describe, failure, readJson } from './protocol.js'
import { createNote, listNotes, removeNote, saveNote } from './notes.js'
import { countsByWorkspace, workspaceRootOf } from './workspace.js'

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

  // `counts` is addressed by Workspace rather than by Session, so it answers
  // before the session → workspace resolution below.
  if (action === 'counts') {
    try {
      const counted = await countsByWorkspace(ctx, body.workspaceIds)
      return counted.code === undefined
        ? Response.json({ counts: counted.value })
        : failure(counted.code, counted.message)
    } catch (error) {
      return failure('io-error', describe(error))
    }
  }

  const resolved = await workspaceRootOf(ctx, body.sessionId)
  if (resolved.code !== undefined) return failure(resolved.code, resolved.message)
  const root = resolved.root

  try {
    switch (action) {
      case 'list':
        return Response.json({ notes: await listNotes(root) })

      case 'create':
        return Response.json({ note: await createNote(root) })

      case 'save': {
        const result = await saveNote(root, body.id, body.text)
        return result.code === undefined ? Response.json({ note: result.value }) : failure(result.code, result.message)
      }

      case 'delete': {
        const result = await removeNote(root, body.id)
        return result.code === undefined ? Response.json({ note: result.value }) : failure(result.code, result.message)
      }

      default:
        return failure('unknown-action', `Unknown notes action ${JSON.stringify(action)}.`)
    }
  } catch (error) {
    return failure('io-error', describe(error))
  }
}
