import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string"
import CHEATSHEET_DOCUMENT from "./index.md?raw" with { type: "text" }
export type ThemeMode = "dark" | "light"

export interface UrlState {
  doc: string
  preview: boolean
  theme: ThemeMode
}

const DEFAULT_STATE: UrlState = {
  doc: "",
  preview: false,
  theme: "light",
}

function readTheme(value: string | null): ThemeMode {
  if (value === "d") return "dark"
  if (value === "l") return "light"

  return DEFAULT_STATE.theme
}

export function readUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  const compressedDoc = params.get("d")
  const doc = compressedDoc
    ? decompressFromEncodedURIComponent(compressedDoc) ?? DEFAULT_STATE.doc
    : CHEATSHEET_DOCUMENT

  return {
    doc,
    preview: params.get("p") === "1",
    theme: readTheme(params.get("t")),
  }
}

export function ensureDocumentInUrl(search: string): string | null {
  const params = new URLSearchParams(search)

  if (params.has("d")) return null

  return buildSearch({
    doc: CHEATSHEET_DOCUMENT,
    preview: params.has("p") ? params.get("p") === "1" : true,
    theme: readTheme(params.get("t")),
  })
}

export function buildSearch(state: UrlState): string {
  const params = new URLSearchParams()

  if (state.preview) params.set("p", "1")
  if (state.theme !== DEFAULT_STATE.theme) params.set("t", "d")
  if (state.doc !== DEFAULT_STATE.doc) {
    params.set("d", compressToEncodedURIComponent(state.doc))
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}
