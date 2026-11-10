/**
 * Loads the built browser bundle outside a browser and runs its `apply()`
 * against a stub context.
 *
 * A throw inside `apply` (or inside any `ctx.effect` it installs) makes cordis
 * roll the whole plugin back: the tab type disappears and every open notes tab
 * degrades to "no viewer for this content". This script catches that class of
 * mistake without needing a browser or a running Host.
 */
const loaded = []
globalThis.window = { __ModuleLoader__: { load: (definition) => loaded.push(definition) } }

const react = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  cloneElement: (element) => element,
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useLayoutEffect: () => {},
  useRef: (initial) => ({ current: typeof initial === 'function' ? initial() : initial }),
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useId: () => 'id',
  Fragment: Symbol('Fragment'),
}
const jsx = react.createElement
const jsxRuntime = { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: react.Fragment }

globalThis.document = {
  body: null,
  documentElement: { nodeType: 1 },
  head: { append() {} },
  getElementById: () => null,
  createElement: () => ({ id: '', textContent: '' }),
  querySelectorAll: () => [],
}
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
}

await import('../lib/client.js')

const definition = loaded[0]
if (definition === undefined) throw new Error('the bundle registered no module definition')

const module = definition.factory((name) => {
  if (name === 'react') return react
  if (name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') return jsxRuntime
  throw new Error(`unexpected platform module: ${name}`)
})

const disposers = []
const registered = []
const ctx = {
  effect: (fn) => { disposers.push(fn()) },
  locale: { bind: () => (key) => key, register: () => () => {} },
  sidebarRightTabs: {
    register: ({ id }) => { registered.push(`tab:${id}`); return () => {} },
  },
  slots: {
    inject: (_name, callback) => { callback(); return () => {} },
    register: ({ name, key }) => { registered.push(`slot:${name}:${key}`); return () => {} },
  },
}

module.apply(ctx)

for (const dispose of disposers) if (typeof dispose === 'function') dispose()

console.log(`apply OK — ${definition.id}, ${registered.length} registrations, teardown OK`)
