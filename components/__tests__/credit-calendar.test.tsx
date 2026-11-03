import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CalendarView } from "@/components/calendar/calendar-view"
import { CreditScoreView } from "@/components/credit/credit-score-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function show(ui: React.ReactNode, path: string, query = "") {
  mockPathname.current = path
  mockSearch.current = new URLSearchParams(query)
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}
const rows = async () => (await screen.findAllByRole("row")).slice(1)

describe("Credit Score", () => {
  it("leads with the human loan reference and names model, version and scale", async () => {
    show(<CreditScoreView />, "/credit-score")
    const r = await rows()
    expect(r).toHaveLength(8)
    const ln1 = r.find((row) => row.textContent?.includes("DEMO-LN-001"))!
    expect(within(ln1).getByRole("link", { name: "DEMO-LN-001" }).getAttribute("href")).toBe("/loans/DEMO-LN-001")
    expect(ln1.textContent).toContain("712 on 0–900")
    expect(ln1.textContent).toContain("Version 2026.1")
    expect(document.body.textContent).not.toMatch(/sc_01/)
  })

  it("marks Latest and Historical in the full history", async () => {
    show(<CreditScoreView />, "/credit-score", "view=all&q=DEMO-LN-001")
    const r = await rows()
    expect(r.map((row) => within(row).getByText(/^(Latest|Historical)$/).textContent)).toEqual(["Latest", "Historical", "Historical"])
  })

  it("shows an incomplete assessment as Incomplete, never as a number", async () => {
    show(<CreditScoreView />, "/credit-score", "state=incomplete")
    const [row] = await rows()
    expect(within(row).getByText("Incomplete")).toBeTruthy()
    expect(row.textContent).toContain("Financial model")
  })

  it("explains a filtered-empty latest view and offers clearing", async () => {
    show(<CreditScoreView />, "/credit-score", "q=no-such-borrower")
    expect(await screen.findByText("No assessments match these filters")).toBeTruthy()
    expect(screen.getByText(/Try All assessments to include history/)).toBeTruthy()
  })

  it("names every filter control", async () => {
    show(<CreditScoreView />, "/credit-score")
    await rows()
    for (const name of [/^Model/, /^State/, /^Trigger/]) expect(screen.getByRole("combobox", { name })).toBeTruthy()
    expect(screen.getByLabelText("Search assessments")).toBeTruthy()
  })

  it("opens the assessment with the loan's history, and Adjust score stays disabled", async () => {
    show(<CreditScoreView />, "/credit-score", "assessment=sc_01hzg8s4t2")
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Business cash flow")).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: "Adjust score" }).hasAttribute("disabled")).toBe(true)
  })
})

describe("Calendar", () => {
  it("opens on November with 2 November selected: two due, no receipts, and says so", () => {
    show(<CalendarView />, "/calendar")
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeTruthy()
    const day = screen.getByRole("region", { name: /Monday 2 November 2026/ })
    expect(within(day).getByRole("heading", { name: /^Scheduled/ }).textContent).toContain("(2)")
    expect(within(day).getByRole("heading", { name: /^Received/ }).textContent).toContain("(0)")
    expect(within(day).getByText(/2 installments are still due/)).toBeTruthy()
    expect(screen.getByRole("link", { name: /Monday 2 November 2026, today/ }).getAttribute("aria-current")).toBe("date")
  })

  it("shows a past part-paid installment on its due day", () => {
    show(<CalendarView />, "/calendar", "date=2026-10-26")
    const day = screen.getByRole("region", { name: /Monday 26 October 2026/ })
    expect(within(day).getByText("Part paid, past due")).toBeTruthy()
  })

  it("shows a receipt on the day it was received, apart from any installment", () => {
    show(<CalendarView />, "/calendar", "date=2026-10-24")
    const day = screen.getByRole("region", { name: /Saturday 24 October 2026/ })
    expect(within(day).getByRole("heading", { name: /^Scheduled/ }).textContent).toContain("(0)")
    expect(within(day).getByRole("heading", { name: /^Received/ }).textContent).toContain("(1)")
    expect(within(day).getByRole("link", { name: /^DEMO-RC-/ }).getAttribute("href")).toMatch(/^\/transactions\?tx=/)
  })

  it("lists the week as an agenda and remembers the choice", async () => {
    show(<CalendarView />, "/calendar")
    await userEvent.click(screen.getByRole("radio", { name: "Week" }))
    expect(localStorage.getItem("loandrift.calendar.view")).toBe("week")
    expect(mockRouter.replace).toHaveBeenCalledWith("/calendar?view=week", { scroll: false })
    localStorage.clear()
  })

  it("moves to the next month from the first, never skipping one", async () => {
    show(<CalendarView />, "/calendar", "date=2026-10-31")
    await userEvent.click(screen.getByRole("button", { name: "Next month" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/calendar?date=2026-11-01", { scroll: false })
  })
})
