const taskMarkerPattern = /^(\s*(?:[-+*]|\d+[.)])\s+\[)( |x|X)(\])/gm

export const toggleTaskAtIndex = ({ source, index }: {
  source: string
  index: number
}) => {
  const matcher = new RegExp(taskMarkerPattern)
  let taskIndex = 0
  let match: RegExpExecArray | null

  while ((match = matcher.exec(source)) !== null) {
    if (taskIndex === index) {
      const nextState = match[2].toLowerCase() === "x" ? " " : "x"

      return `${source.slice(0, match.index)}${match[1]}${nextState}${
        match[3]
      }${source.slice(match.index + match[0].length)}`
    }

    taskIndex += 1
  }

  return source
}
