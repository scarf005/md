import { micromark } from "micromark"
import { gfm, gfmHtml } from "micromark-extension-gfm"
import { highlightCode as highlightSourceCode } from "./code-highlight.ts"
import type { ThemeMode } from "./url-state.ts"

const getCodeLanguageName = (classList: DOMTokenList) =>
  Array.from(classList)
    .find((value) => value.startsWith("language-"))
    ?.slice("language-".length) ?? null

const enableTaskListCheckboxes = (doc: Document) => {
  Array.from(doc.querySelectorAll<HTMLInputElement>(
    "li > input[type=checkbox][disabled]",
  ))
    .forEach((input, index) => {
      input.removeAttribute("disabled")
      input.dataset.taskIndex = String(index)
      input.parentElement?.setAttribute("data-task-list-item", "true")
      input.closest("ul, ol")?.setAttribute("data-task-list", "true")
    })
}

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

  enableTaskListCheckboxes(doc)

  return doc.body.innerHTML
}

export const renderMarkdown = async (
  { source, theme }: { source: string; theme: ThemeMode },
) =>
  highlightCodeBlocks({
    html: micromark(source, {
      extensions: [gfm()],
      htmlExtensions: [gfmHtml()],
    }),
    theme,
  })
