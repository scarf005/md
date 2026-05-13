import { parse, postprocess, preprocess } from "micromark"
import { gfm } from "micromark-extension-gfm"

type MicromarkTaskEvent = [
  "enter" | "exit",
  { type: string; start: { offset: number }; end: { offset: number } },
  unknown,
]

const taskValueTypes = new Set([
  "taskListCheckValueChecked",
  "taskListCheckValueUnchecked",
])

const findTaskValueOffsets = (source: string) =>
  (postprocess(
    parse({ extensions: [gfm()] }).document().write(
      preprocess()(source, undefined, true),
    ),
  ) as MicromarkTaskEvent[])
    .filter(([eventType, token]) =>
      eventType === "enter" && taskValueTypes.has(token.type)
    )
    .map(([, token]) => ({ from: token.start.offset, to: token.end.offset }))

export const toggleTaskAtIndex = ({ source, index }: {
  source: string
  index: number
}) => {
  const taskValue = findTaskValueOffsets(source)[index]

  if (!taskValue) return source

  const value = source.slice(taskValue.from, taskValue.to)
  const nextState = value.toLowerCase() === "x" ? " " : "x"

  return `${source.slice(0, taskValue.from)}${nextState}${
    source.slice(taskValue.to)
  }`
}
