/**
 * `dshNotes` dictionaries.
 *
 * Simplified Chinese is the key set's source of truth; English is checked
 * against it by hand. Every label the guide entry and the page draw lives here.
 */

/** Simplified Chinese dictionary. */
export const zh = {
  'type.label': '便签',
  'guide.title': '便签',
  'guide.description': '在这个会话里随手记下便签',
  'page.title': '便签',
  'scope.hint': '属于 {name}',
  'add': '添加便签',
  'loading': '正在读取便签…',
  'empty.hint': '还没有便签。',
  'placeholder': '写点什么…',
  'status.saving': '保存中…',
  'status.error': '保存失败',
  'error.title': '便签读取失败',
  'retry': '重试',
}

/** English dictionary. */
export const en = {
  'type.label': 'Notes',
  'guide.title': 'Notes',
  'guide.description': 'Jot quick notes for this session',
  'page.title': 'Notes',
  'scope.hint': 'in {name}',
  'add': 'Add a note',
  'loading': 'Reading notes…',
  'empty.hint': 'No notes yet.',
  'placeholder': 'Write something…',
  'status.saving': 'Saving…',
  'status.error': 'Save failed',
  'error.title': 'Could not read the notes',
  'retry': 'Retry',
}
