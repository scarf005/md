/// <reference lib="deno.ns" />

import { assertEquals } from "jsr:@std/assert@1/equals"
import { toggleTaskAtIndex } from "./task-list.ts"

Deno.test("toggleTaskAtIndex checks an unchecked task", () => {
  assertEquals(
    toggleTaskAtIndex({
      source: "- [ ] first\n- [x] second\n",
      index: 0,
    }),
    "- [x] first\n- [x] second\n",
  )
})

Deno.test("toggleTaskAtIndex unchecks a checked task", () => {
  assertEquals(
    toggleTaskAtIndex({
      source: "- [ ] first\n- [x] second\n",
      index: 1,
    }),
    "- [ ] first\n- [ ] second\n",
  )
})

Deno.test("toggleTaskAtIndex supports ordered task lists", () => {
  assertEquals(
    toggleTaskAtIndex({
      source: "1. [ ] first\n2. [ ] second\n",
      index: 1,
    }),
    "1. [ ] first\n2. [x] second\n",
  )
})

Deno.test("toggleTaskAtIndex leaves unknown indexes unchanged", () => {
  const source = "- [ ] first\n"

  assertEquals(toggleTaskAtIndex({ source, index: 9 }), source)
})
