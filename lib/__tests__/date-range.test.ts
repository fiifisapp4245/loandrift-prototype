import { describe, expect, it } from "vitest"
import { daysInRange, matchingPreset, parseRangeParams, presetRange, rangeLabel, validateRange } from "@/lib/date-range"

const TODAY = "2026-11-02"

describe("presets", () => {
  it("are inclusive and end today", () => {
    expect(presetRange("last-7", TODAY)).toEqual({ from: "2026-10-27", to: TODAY })
    expect(daysInRange(presetRange("last-30", TODAY))).toBe(30)
    expect(presetRange("this-month", TODAY)).toEqual({ from: "2026-11-01", to: TODAY })
  })

  it("last month is the whole previous calendar month", () => {
    expect(presetRange("last-month", TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" })
  })

  it("recognises a hand-typed range that matches a preset", () => {
    expect(matchingPreset({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toBe("last-month")
    expect(rangeLabel({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toBe("Last month · 1 Oct 2026 – 31 Oct 2026")
    expect(rangeLabel({ from: "2026-10-03", to: "2026-10-09" }, TODAY)).toBe("3 Oct 2026 – 9 Oct 2026")
  })
})

describe("validation", () => {
  it("accepts 1–31 October", () => {
    expect(validateRange({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toEqual({})
  })

  it("rejects an end before the start, on the end field", () => {
    expect(validateRange({ from: "2026-10-31", to: "2026-10-01" }, TODAY)).toEqual({
      to: "The end date must be on or after the start date.",
    })
  })

  it("names each missing field separately", () => {
    expect(validateRange({ from: "", to: "" }, TODAY)).toEqual({ from: "Enter a start date.", to: "Enter an end date." })
  })

  it("rejects future end dates and impossible dates", () => {
    expect(validateRange({ from: "2026-10-01", to: "2026-11-03" }, TODAY).to).toMatch(/after today/)
    expect(validateRange({ from: "2026-02-30", to: "2026-10-01" }, TODAY).from).toMatch(/real date/)
  })
})

describe("URL parsing", () => {
  it("uses the URL range when valid", () => {
    expect(parseRangeParams({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toEqual({
      range: { from: "2026-10-01", to: "2026-10-31" },
      fromUrl: true,
      invalidUrl: false,
    })
  })

  it("falls back to the default without a range", () => {
    expect(parseRangeParams({}, TODAY)).toMatchObject({ range: presetRange("last-30", TODAY), invalidUrl: false })
  })

  it("flags a broken range instead of silently showing other dates", () => {
    expect(parseRangeParams({ from: "2026-10-31", to: "2026-10-01" }, TODAY)).toMatchObject({ invalidUrl: true })
    expect(parseRangeParams({ from: "2026-10-01" }, TODAY)).toMatchObject({ invalidUrl: true })
  })
})
