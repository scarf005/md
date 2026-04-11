import { micromark } from "micromark"
import { gfm, gfmHtml } from "micromark-extension-gfm"
import { highlightCode as highlightSourceCode } from "./code-highlight.ts"
import type { ThemeMode } from "./url-state.ts"

const getCodeLanguageName = (classList: DOMTokenList) =>
  Array.from(classList)
    .find((value) => value.startsWith("language-"))
    ?.slice("language-".length) ?? null

const highlightCodeBlocks = async (
  { html, theme }: { html: string; theme: ThemeMode },
) => {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const blocks = Array.from(doc.querySelectorAll("pre > code"))

  await Promise.all(blocks.map(async (block) => {
    const languageName = getCodeLanguageName(block.classList)

    if (!languageName) return

    const highlighted = await highlightSourceCode({
      source: block.textContent ?? "",
      languageName,
      theme,
    })

    if (!highlighted) return

    block.innerHTML = highlighted
  }))

  return doc.body.innerHTML
}

export const renderMarkdown = async (
  { source, theme }: { source: string; theme: ThemeMode },
) => highlightCodeBlocks({
  html: micromark(source, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  }),
  theme,
})
