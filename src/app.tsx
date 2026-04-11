import { computed, effect, signal } from "@preact/signals"
import "./app.css"
import { MarkdownEditor } from "./editor.tsx"
import {
  buildSearch,
  ensureDocumentInUrl,
  readUrlState,
  type ThemeMode,
} from "./url-state.ts"

const redirectedSearch = ensureDocumentInUrl(globalThis.location.search)

if (redirectedSearch) {
  const nextUrl =
    `${globalThis.location.pathname}${redirectedSearch}${globalThis.location.hash}`
  globalThis.history.replaceState(globalThis.history.state, "", nextUrl)
}

const initialState = readUrlState(globalThis.location.search)
const previewOpen = signal(initialState.preview)
const theme = signal<ThemeMode>(initialState.theme)
export const previewText = signal(initialState.doc)
const previewRenderer = signal<((source: string) => string) | null>(null)
let previewImportPromise: Promise<void> | null = null

let currentDocument = initialState.doc
let writeTimer: number | undefined

const syncUrl = () => {
  const search = buildSearch({
    doc: currentDocument,
    preview: previewOpen.value,
    theme: theme.value,
  })

  const nextUrl =
    `${globalThis.location.pathname}${search}${globalThis.location.hash}`

  globalThis.history.replaceState(globalThis.history.state, "", nextUrl)
}

const scheduleUrlSync = () => {
  globalThis.clearTimeout(writeTimer)
  writeTimer = globalThis.setTimeout(syncUrl, 300)
}

const loadPreviewRenderer = () => {
  if (previewRenderer.value) return Promise.resolve()
  if (previewImportPromise) return previewImportPromise

  previewImportPromise = import("./preview.ts").then(({ renderMarkdown }) => {
    previewRenderer.value = renderMarkdown
  })

  return previewImportPromise
}

const setPreview = (nextPreview: boolean) => {
  previewOpen.value = nextPreview

  if (nextPreview) {
    previewText.value = currentDocument
    void loadPreviewRenderer()
  }
}

const onDocumentChange = (nextDocument: string) => {
  currentDocument = nextDocument

  if (previewOpen.value) {
    previewText.value = nextDocument
  }

  scheduleUrlSync()
}

const setTheme = (nextTheme: ThemeMode) => {
  theme.value = nextTheme
}

const copyShareUrl = async () => {
  const search = buildSearch({
    doc: currentDocument,
    preview: previewOpen.value,
    theme: theme.value,
  })
  const nextUrl =
    `${globalThis.location.origin}${globalThis.location.pathname}${search}${globalThis.location.hash}`

  await globalThis.navigator.clipboard.writeText(nextUrl)
}

effect(() => {
  document.documentElement.dataset.theme = theme.value
  document.documentElement.style.colorScheme = theme.value
})

effect(() => {
  previewOpen.value
  theme.value

  scheduleUrlSync()
})

effect(() => {
  if (!previewOpen.value) return

  void loadPreviewRenderer()
})

const html = computed(() => previewRenderer.value?.(previewText.value) ?? "")

export const PreviewPane = () => {
  return (
    <div
      class="preview-pane__body"
      dangerouslySetInnerHTML={{ __html: html.value }}
    />
  )
}

export const App = () => {
  return (
    <main class="app-shell">
      <section class="workspace" data-preview={String(previewOpen.value)}>
        <section class="pane editor-pane">
          <MarkdownEditor
            initialValue={initialState.doc}
            onDocumentChange={onDocumentChange}
          />
        </section>
        {previewOpen.value && (
          <aside class="pane preview-pane">
            <PreviewPane />
          </aside>
        )}
      </section>

      <nav class="toolbar" aria-label="Editor controls">
        <div class="toolbar__group">
          <button
            type="button"
            class="toolbar__button"
            aria-pressed={previewOpen.value}
            onClick={() => setPreview(!previewOpen.value)}
          >
            Preview
          </button>
          <button
            type="button"
            class="toolbar__button"
            onClick={copyShareUrl}
          >
            Export
          </button>
        </div>
        <div class="toolbar__group">
          <button
            type="button"
            class="toolbar__button"
            aria-pressed={theme.value === "dark"}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
          <button
            type="button"
            class="toolbar__button"
            aria-pressed={theme.value === "light"}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
        </div>
      </nav>
    </main>
  )
}
