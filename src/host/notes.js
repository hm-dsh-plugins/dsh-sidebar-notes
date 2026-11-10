/**
 * The notes store: one plain-text file per note under `.dsh-notes/` in the
 * session's workspace.
 *
 * The file name is the note's identity and its creation time:
 * `<epoch-ms>-<8 hex>.txt`. A note's text is the whole file, so the format
 * stays something a text editor can read — that is what "plain txt" means here.
 *
 * Ordering is by creation time, newest first. The name carries it, so copying
 * or editing a file never resorts the list the way an mtime would.
 */
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { MAX_NOTE_BYTES, describe } from './protocol.js'

/** The directory, relative to the session workspace. */
const DIRECTORY = '.dsh-notes'

/** A note file name; group 1 is the creation time in epoch milliseconds. */
const FILE_NAME = /^(\d{13})-[0-9a-f]{8}\.txt$/

/** A note identity as the client sends it back. */
const NOTE_ID = /^\d{13}-[0-9a-f]{8}$/

/** Distinguishes same-millisecond writes from this process to one note. */
let temporarySequence = 0

/**
 * The notes directory of one workspace.
 * @param {string} root - canonical workspace root.
 * @returns {string} absolute directory path.
 */
export function notesDirectory(root) {
  return join(root, DIRECTORY)
}

/**
 * Stat one path as a regular file.
 * @param {string} path - absolute path.
 * @returns {Promise<import('node:fs').Stats | undefined>} the stat, or undefined
 *   when it is absent or not a regular file.
 */
async function statRegular(path) {
  try {
    const info = await stat(path)
    return info.isFile() ? info : undefined
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return undefined
    throw error
  }
}

/**
 * Every note of one workspace, newest first.
 * @param {string} root - workspace root.
 * @returns {Promise<Array<{ id: string, text: string, createdAt: number }>>} the notes.
 */
export async function listNotes(root) {
  const directory = notesDirectory(root)
  let names
  try {
    names = await readdir(directory)
  } catch (error) {
    // The directory appears with the first note; an empty workspace has none.
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return []
    throw error
  }

  const notes = []
  for (const name of names) {
    const match = FILE_NAME.exec(name)
    if (match === null) continue
    const path = join(directory, name)
    const info = await statRegular(path)
    if (info === undefined || info.size > MAX_NOTE_BYTES) continue
    const text = await readFile(path, 'utf8')
    notes.push({ id: name.slice(0, -'.txt'.length), text, createdAt: Number(match[1]) })
  }

  notes.sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id))
  return notes
}

/**
 * Create one empty note.
 * @param {string} root - workspace root.
 * @returns {Promise<{ id: string, text: string, createdAt: number }>} the new note.
 */
export async function createNote(root) {
  const createdAt = Date.now()
  const id = `${createdAt}-${randomBytes(4).toString('hex')}`
  const directory = notesDirectory(root)
  await mkdir(directory, { recursive: true })
  // `wx` fails instead of overwriting, so a collision can never eat a note.
  await writeFile(join(directory, `${id}.txt`), '', { encoding: 'utf8', flag: 'wx' })
  return { id, text: '', createdAt }
}

/**
 * Remove one note.
 * @param {string} root - workspace root.
 * @param {unknown} id - note identity.
 * @returns {Promise<{ value?: { id: string }, code?: string, message?: string }>}
 *   `{ value }` on success, or `{ code, message }` on refusal.
 */
export async function removeNote(root, id) {
  if (typeof id !== 'string' || !NOTE_ID.test(id)) {
    return { code: 'bad-request', message: 'id must be a note identity.' }
  }
  const path = join(notesDirectory(root), `${id}.txt`)
  try {
    await rm(path)
  } catch (error) {
    if (error?.code === 'ENOENT') return { code: 'not-found', message: 'That note no longer exists.' }
    throw error
  }
  return { value: { id } }
}

/**
 * Replace one note's text.
 * @param {string} root - workspace root.
 * @param {unknown} id - note identity.
 * @param {unknown} text - complete new content.
 * @returns {Promise<{ value?: { id: string, text: string, createdAt: number }, code?: string, message?: string }>}
 *   `{ value }` on success, or `{ code, message }` on refusal.
 */
export async function saveNote(root, id, text) {
  if (typeof id !== 'string' || !NOTE_ID.test(id)) {
    return { code: 'bad-request', message: 'id must be a note identity.' }
  }
  if (typeof text !== 'string') {
    return { code: 'bad-request', message: 'text must be a string.' }
  }
  const bytes = Buffer.byteLength(text, 'utf8')
  if (bytes > MAX_NOTE_BYTES) {
    return { code: 'too-large', message: `That note is ${Math.round(bytes / 1024)} KiB; the limit is ${Math.round(MAX_NOTE_BYTES / 1024)} KiB.` }
  }

  const directory = notesDirectory(root)
  const path = join(directory, `${id}.txt`)
  const before = await statRegular(path)
  if (before === undefined) return { code: 'not-found', message: 'That note no longer exists.' }

  // Same-directory temporary file, then a rename: a failed save leaves the note
  // as it was rather than half-written.
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}-${temporarySequence++}`
  await writeFile(temporary, text, 'utf8')
  try {
    await rename(temporary, path)
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {})
    return { code: 'io-error', message: describe(error) }
  }
  return { value: { id, text, createdAt: Number(id.slice(0, 13)) } }
}
