import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ActivitiesView } from "@/components/activities/activities-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function show(query = "") {
  mockPathname.current = "/activities"
  mockSearch.current = new URLSearchParams(query)
  return render(
    <TooltipProvider>
      <ActivitiesView />
    </TooltipProvider>,
  )
}

const feed = async () => screen.findByRole("list", { name: "Activity, newest first" })

describe("Activities feed", () => {
  it("shows human sentences under date headings, with no raw values", async () => {
    show()
    const list = await feed()
    expect(within(list).getByRole("heading", { name: "Monday, 2 November 2026" })).toBeTruthy()
    expect(within(list).getByText("Branch settings")).toBeTruthy()
    expect(list.textContent).toContain("no fields changed")
    expect(list.textContent).not.toMatch(/None|_[a-z]|\.000000/)
    expect(screen.getByText("Page 1 of 3")).toBeTruthy()
  })

  it("repeats the date at the top of a page that continues a day", async () => {
    show("page=2")
    const list = await feed()
    expect(within(list).getAllByRole("heading")[0]!.textContent).toBe("Friday, 30 October 2026 (continued)")
  })

  it("shows a grouped event once, with its accounting entries counted", async () => {
    show("q=DEMO-LN-009")
    const row = await screen.findByRole("link", { name: /Kwesi Officer recorded a repayment on DEMO-LN-009/ })
    expect(row.textContent).toContain("2 accounting entries")
    expect(row.getAttribute("href")).toBe("/activities?q=DEMO-LN-009&event=DEMO-EV-0117")
  })

  it("says filters matched nothing across all pages, and clears them", async () => {
    show("q=zzz")
    expect(await screen.findByText("No activity matches these filters")).toBeTruthy()
    expect(screen.getByText(/covers every page/)).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/activities", { scroll: false })
  })

  it("goes back to page 1 when a filter changes", async () => {
    show("page=3&module=loans")
    await feed()
    await userEvent.click(screen.getByRole("button", { name: "Remove filter Module: Loans" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/activities", { scroll: false })
  })

  it("discloses the retention window for long ranges", async () => {
    show("from=2026-07-01&to=2026-11-02")
    expect(await screen.findByText("This feed starts on 5 Aug 2026")).toBeTruthy()
    expect(screen.getByRole("link", { name: "open the audit report" })).toBeTruthy()
  })

  it("shows a failed request as an error", async () => {
    show("demo=error")
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load activity")
  })
})

describe("Activity drawer", () => {
  it("shows before and after values in readable form", async () => {
    show("event=DEMO-EV-0110")
    const panel = await screen.findByRole("dialog")
    const row = (field: string) => within(panel).getByRole("rowheader", { name: field }).parentElement!.textContent
    expect(row("Requested amount")).toBe("Requested amountGH₵8,000.00GH₵10,000.00")
    expect(row("Interest rate")).toBe("Interest rate12.5%11%")
    expect(row("Repayment frequency")).toBe("Repayment frequencyWeeklyMonthly")
  })

  it("tells a no-difference save apart from a missing diff", async () => {
    const { unmount } = show("event=DEMO-EV-0124")
    expect(within(await screen.findByRole("dialog")).getByText("Saved with no field changes.")).toBeTruthy()
    unmount()
    show("event=DEMO-EV-0104")
    expect(within(await screen.findByRole("dialog")).getByText(/didn.t record which fields changed/)).toBeTruthy()
  })

  it("lists linked events only when a correlation ID links them", async () => {
    const { unmount } = show("event=DEMO-EV-0117")
    const panel = await screen.findByRole("dialog")
    expect(within(panel).getAllByRole("link", { name: /posted journal DEMO-JRN-2026-10-27/ })).toHaveLength(2)
    unmount()
    show("event=DEMO-EV-0113")
    expect(within(await screen.findByRole("dialog")).getByText(/None recorded. Events are only linked/)).toBeTruthy()
  })

  it("keeps the raw record in technical details and the full reference readable", async () => {
    show("event=DEMO-EV-0116")
    const panel = await screen.findByRole("dialog")
    expect(within(panel).getByText("Technical details")).toBeTruthy()
    expect(panel.querySelector("pre")?.textContent).toContain('"correlation_id": "COR-7f3a"')
    expect(within(panel).getAllByText("DEMO-JRN-2026-10-27-000184").length).toBeGreaterThan(0)
  })

  it("explains an event that isn't available", async () => {
    show("event=DEMO-EV-9999")
    await waitFor(() => expect(screen.getByText("This event isn't available")).toBeTruthy())
  })
})
