import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands"
import {
  markdown,
  markdownKeymap,
  markdownLanguage,
} from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { syntaxTree } from "@codemirror/language"
import { Compartment, EditorState, RangeSetBuilder } from "@codemirror/state"
import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"
import { useEffect, useRef } from "preact/hooks"
import { getEditorHighlightExtensions } from "./code-highlight.ts"
import type { ThemeMode } from "./url-state.ts"

type MarkdownEditorProps = {
  initialValue: string
  onDocumentChange: (value: string) => void
  theme: ThemeMode
}

const strongMark = Decoration.mark({ class: "cm-md-strong" })
const emphasisMark = Decoration.mark({ class: "cm-md-emphasis" })
const codeMark = Decoration.mark({ class: "cm-md-code" })
const headingMarks = Array.from(
  { length: 6 },
  (_, index) =>
    Decoration.mark({ class: `cm-md-heading cm-md-heading-${index + 1}` }),
)
const linkMark = Decoration.mark({ class: "cm-md-link" })
const quoteMark = Decoration.mark({ class: "cm-md-quote" })
const listMark = Decoration.mark({ class: "cm-md-list" })

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--text)",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-gutters": {
    display: "none",
  },
})

const editorThemeCompartment = new Compartment()

function resolveFullNodeRange(
  raw: string,
  from: number,
  validator: RegExp,
): { from: number; to: number } | null {
  return validator.test(raw) ? { from, to: from + raw.length } : null
}

function resolveLinkRange(
  raw: string,
  from: number,
): { from: number; to: number } | null {
  const match = /^\[([^\]\n]+)\]\(([^\s)]+[^)]*)\)$/.exec(raw)

  if (!match) {
    return null
  }

  const label = match[1]

  if (!label || /^\s|\s$/.test(label)) {
    return null
  }

  return {
    from,
    to: from + raw.length,
  }
}

function resolveBlockRange(
  raw: string,
  from: number,
  pattern: RegExp,
): { from: number; to: number } | null {
  const match = pattern.exec(raw)

  if (!match) return null

  const content = match[1]

  if (!content || /^\s|\s$/.test(content)) return null

  return {
    from: from + raw.indexOf(content),
    to: from + raw.indexOf(content) + content.length,
  }
}

function buildDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  const tree = syntaxTree(view.state)

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: (node: { name: string; from: number; to: number }) => {
        const raw = view.state.doc.sliceString(node.from, node.to)
        let range: { from: number; to: number } | null = null
        let mark: Decoration | null = null

        if (node.name === "StrongEmphasis") {
          range = resolveFullNodeRange(
            raw,
            node.from,
            /^(\*\*|__)([\s\S]+)\1$/,
          )
          mark = strongMark
        } else if (node.name === "Emphasis") {
          range = resolveFullNodeRange(
            raw,
            node.from,
            /^(\*|_)([\s\S]+)\1$/,
          )
          mark = emphasisMark
        } else if (node.name === "InlineCode") {
          range = resolveFullNodeRange(
            raw,
            node.from,
            /^(`+)([\s\S]+)\1$/,
          )
          mark = codeMark
        } else if (node.name.startsWith("ATXHeading")) {
          const match = /^(#{1,6})\s+(.+)$/.exec(raw)

          if (match) {
            range = {
              from: node.from,
              to: node.from + raw.length,
            }
            mark = headingMarks[match[1].length - 1] ?? headingMarks[5]
          }
        } else if (node.name === "Link") {
          range = resolveLinkRange(raw, node.from)
          mark = linkMark
        } else if (node.name === "Blockquote") {
          range = resolveBlockRange(raw, node.from, /^>\s+([^\n]+)$/)
          mark = quoteMark
        } else if (node.name === "ListItem") {
          range = resolveBlockRange(
            raw,
            node.from,
            /^(?:[-+*]|\d+[.)])\s+([^\n]+)$/,
          )
          mark = listMark
        }

        if (!range || !mark || range.from >= range.to) return

        builder.add(range.from, range.to, mark)
      },
    })
  }

  return builder.finish()
}

class MarkdownDecorations {
  decorations: ReturnType<typeof buildDecorations>

  constructor(view: EditorView) {
    this.decorations = buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildDecorations(update.view)
    }
  }
}

const markdownDecorations = ViewPlugin.fromClass(MarkdownDecorations, {
  decorations: (plugin: MarkdownDecorations) => plugin.decorations,
})

export function MarkdownEditor(
  { initialValue, onDocumentChange, theme }: MarkdownEditorProps,
) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const onDocumentChangeRef = useRef(onDocumentChange)
  const viewRef = useRef<EditorView | null>(null)

  onDocumentChangeRef.current = onDocumentChange

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          editorThemeCompartment.of(getEditorHighlightExtensions({ theme })),
          keymap.of([
            indentWithTab,
            ...markdownKeymap,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (!update.docChanged) return

            onDocumentChangeRef.current(update.state.doc.toString())
          }),
          markdownDecorations,
          editorTheme,
        ],
      }),
    })

    viewRef.current = view

    return () => {
      viewRef.current = null
      view.destroy()
    }
  }, [initialValue])

  useEffect(() => {
    if (!viewRef.current) return

    viewRef.current.dispatch({
      effects: editorThemeCompartment.reconfigure(
        getEditorHighlightExtensions({ theme }),
      ),
    })
  }, [theme])

  return <div ref={hostRef} class="editor-host" />
}
