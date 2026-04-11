import { micromark } from "micromark"
import { gfm, gfmHtml } from "micromark-extension-gfm"

export const renderMarkdown = (source: string) =>
  micromark(source, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  })
