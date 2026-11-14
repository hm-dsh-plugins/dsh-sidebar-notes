/**
 * Runs the Host half against a real temporary directory and a stub context.
 *
 * The browser smoke covers `apply()`; this covers the part that owns the disk:
 * where a note is written, that two conversations stay apart, and that a
 * Workspace's number is its Sessions' numbers added up.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  countNotes, createNote, listNotes, notesDirectory, removeNote, saveNote,
} from '../src/host/notes.js'
import { countsBySession, countsByWorkspace } from '../src/host/workspace.js'

/**
 * Assert one value.
 * @param {unknown} actual - what happened.
 * @param {unknown} expected - what should have happened.
 * @param {string} what - the claim being checked.
 */
function is(actual, expected, what) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

const root = await mkdtemp(join(tmpdir(), 'dsh-notes-'))

// Two conversations in one workspace.
const first = (await createNote(root, 'session-a')).value
const second = (await createNote(root, 'session-b')).value
is(notesDirectory(root, 'session-a'), join(root, '.dsh-notes', 'session-a'), 'a note lives under its own conversation')
is((await listNotes(root, 'session-a')).map((note) => note.id), [first.id], 'a conversation lists only its own notes')
is((await listNotes(root, 'session-b')).map((note) => note.id), [second.id], 'and not the other one\'s')

// A note created from the composer holds its text from the first write.
const fromComposer = await createNote(root, 'session-e', 'typed in the composer')
is(fromComposer.value?.text, 'typed in the composer', 'a note can be created with text')
is((await listNotes(root, 'session-e')).map((note) => note.text), ['typed in the composer'], 'and reads back with it')
is((await createNote(root, 'session-e', 7)).code, 'bad-request', 'a non-string text is refused')

const saved = await saveNote(root, 'session-a', first.id, 'hello')
is(saved.value?.text, 'hello', 'a note saves')
is(await countNotes(root, 'session-a'), 1, 'and counts once')
is(await countNotes(root, 'session-c'), 0, 'a conversation that never wrote a note counts zero')

// A file from the pre-conversation layout is not anyone's note.
await mkdir(notesDirectory(root, 'session-a'), { recursive: true })
await writeFile(join(root, '.dsh-notes', '1794330102905-cfa8c90a.txt'), 'stray')
is(await countNotes(root, 'session-a'), 1, 'a stray file in the shared directory is ignored')

// A conversation that is stored but not open: its working directory can only
// come from persistence. Every row in the sidebar is in this state until it is
// opened, so resolving it is the normal case, not an edge case.
const stored = new Map([['session-d', root]])
await createNote(root, 'session-d')

const registry = {
  get: (id) => {
    if (id === 'ws-1') return { id: 'ws-1', path: root, sessionIds: ['session-a', 'session-b'] }
    if (id === 'ws-2') return { id: 'ws-2', path: root, sessionIds: ['session-a', 'session-d'] }
    return undefined
  },
}
const live = new Map([['session-a', root], ['session-b', root]])
const ctx = {
  sessions: { get: (id) => (live.has(id) ? { header: { cwd: live.get(id) } } : undefined) },
  get: (name) => {
    if (name === 'workspaceRegistry') return registry
    if (name === 'sessionPersistence') {
      return {
        stat: async (id) => (stored.has(id) ? { header: { id, cwd: stored.get(id) }, revision: 1 } : undefined),
      }
    }
    return undefined
  },
}

is(await countsBySession(ctx, ['session-a', 'session-b', 'session-z']), { value: { 'session-a': 1, 'session-b': 1 } }, 'counts answer per conversation and skip unknown ids')
is(await countsBySession(ctx, ['session-d']), { value: { 'session-d': 1 } }, 'and a stored, unopened conversation is counted through persistence')
is(await countsByWorkspace(ctx, ['ws-1', 'ws-z']), { value: { 'ws-1': 2 } }, 'a workspace adds up its conversations')
is(await countsByWorkspace(ctx, ['ws-2']), { value: { 'ws-2': 2 } }, 'including ones it never opened')

await removeNote(root, 'session-b', second.id)
is(await countsByWorkspace(ctx, ['ws-1']), { value: { 'ws-1': 1 } }, 'and the sum follows a deletion')

await rm(root, { recursive: true, force: true })
console.log('host OK — notes are per conversation, workspaces add them up')
