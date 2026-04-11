import {
  HighlightStyle,
  LanguageDescription,
  syntaxHighlighting,
} from "@codemirror/language"
import { languages } from "@codemirror/language-data"
import type { Extension } from "@codemirror/state"
import {
  oneDarkHighlightStyle,
  oneDarkTheme,
} from "@codemirror/theme-one-dark"
import { highlightTree } from "@lezer/highlight"
import type { ThemeMode } from "./url-state.ts"

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")

const getHighlightStyle = ({ theme: _theme }: { theme: ThemeMode }): HighlightStyle =>
  oneDarkHighlightStyle

export const getEditorHighlightExtensions = (
  { theme }: { theme: ThemeMode },
): Extension => theme === "dark"
  ? [oneDarkTheme, syntaxHighlighting(oneDarkHighlightStyle)]
  : syntaxHighlighting(oneDarkHighlightStyle, { fallback: true })

export const highlightCode = async (
  {
    source,
    languageName,
    theme,
  }: { source: string; languageName: string; theme: ThemeMode },
) => {
  const language = LanguageDescription.matchLanguageName(languages, languageName)

  if (!language) return null

  const support = await language.load()
  const tree = support.language.parser.parse(source)
  const style = getHighlightStyle({ theme })
  let html = ""
  let offset = 0

  highlightTree(tree, style, (from: number, to: number, classes: string) => {
    if (from > offset) {
      html += escapeHtml(source.slice(offset, from))
    }

    html += `<span class="${classes}">${escapeHtml(source.slice(from, to))}</span>`
    offset = to
  })

  if (offset < source.length) {
    html += escapeHtml(source.slice(offset))
  }

  return html
}
