import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { DateRange } from "@/lib/date-range"
import { mockRouter, mockSearch } from "@/test/setup-dom"

const TODAY = "2026-11-02"
const LAST_30 = { from: "2026-10-04", to: TODAY }

/** Native date inputs: set the value the way the browser's own picker does. */
function setDate(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

function ControlledPicker({ onApply }: { onApply?: (r: DateRange) => void }) {
  const [range, setRange] = useState(LAST_30)
  return (
    <DateRangePicker
      value={range}
      today={TODAY}
      onApply={(r) => {
        setRange(r)
        onApply?.(r)
      }}
    />
  )
}

const trigger = () => screen.getByRole("button", { name: /^Period:/ })

describe("DateRangePicker", () => {
  it("keeps a custom 1–31 October range applied after the picker closes (regression)", async () => {
    const onApply = vi.fn()
    render(<ControlledPicker onApply={onApply} />)
    await userEvent.click(trigger())
    setDate(screen.getByLabelText("From"), "2026-10-01")
    setDate(screen.getByLabelText("To"), "2026-10-31")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-31" })
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull()
    expect(trigger().textContent).toContain("1 Oct 2026 – 31 Oct 2026")

    // Reopening starts from the applied range, not the default.
    await userEvent.click(trigger())
    expect((screen.getByLabelText("From") as HTMLInputElement).value).toBe("2026-10-01")
    expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe("2026-10-31")
  })

  it("applies dates set without React input events, as automation and autofill do (F73)", async () => {
    const onApply = vi.fn()
    render(<ControlledPicker onApply={onApply} />)
    await userEvent.click(trigger())
    // Direct assignment, like the handoff's browser automation: React's onChange never fires.
    const from = screen.getByLabelText("From") as HTMLInputElement
    const to = screen.getByLabelText("To") as HTMLInputElement
    from.value = "2026-10-01"
    from.dispatchEvent(new Event("input", { bubbles: true }))
    to.value = "2026-10-31"
    to.dispatchEvent(new Event("input", { bubbles: true }))
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(onApply).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-31" })
    expect(trigger().textContent).toContain("1 Oct 2026 – 31 Oct 2026")
  })

  it("applies a one-day range", async () => {
    const onApply = vi.fn()
    render(<ControlledPicker onApply={onApply} />)
    await userEvent.click(trigger())
    setDate(screen.getByLabelText("From"), "2026-10-15")
    setDate(screen.getByLabelText("To"), "2026-10-15")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(onApply).toHaveBeenCalledWith({ from: "2026-10-15", to: "2026-10-15" })
  })

  it("changes nothing until Apply, and Cancel restores the prior range", async () => {
    const onApply = vi.fn()
    render(<ControlledPicker onApply={onApply} />)
    await userEvent.click(trigger())
    setDate(screen.getByLabelText("From"), "2026-09-01")
    expect(trigger().textContent).toContain("4 Oct 2026 – 2 Nov 2026")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onApply).not.toHaveBeenCalled()

    await userEvent.click(trigger())
    expect((screen.getByLabelText("From") as HTMLInputElement).value).toBe("2026-10-04")
  })

  it("discards the draft on Escape too", async () => {
    const onApply = vi.fn()
    render(<ControlledPicker onApply={onApply} />)
    await userEvent.click(trigger())
    setDate(screen.getByLabelText("To"), "2026-10-10")
    await userEvent.keyboard("{Escape}")
    expect(onApply).not.toHaveBeenCalled()
    await userEvent.click(trigger())
    expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe(TODAY)
  })

  it("rejects an end before the start with an associated message, keeping the draft", async () => {
    const onApply = vi.fn()
    render(<ControlledPicker onApply={onApply} />)
    await userEvent.click(trigger())
    setDate(screen.getByLabelText("From"), "2026-10-31")
    setDate(screen.getByLabelText("To"), "2026-10-01")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))

    const to = screen.getByLabelText("To")
    expect(onApply).not.toHaveBeenCalled()
    expect(to.getAttribute("aria-invalid")).toBe("true")
    expect(document.getElementById(to.getAttribute("aria-describedby")!)?.textContent).toBe(
      "The end date must be on or after the start date.",
    )
    expect(document.activeElement).toBe(to)
    expect((screen.getByLabelText("From") as HTMLInputElement).value).toBe("2026-10-31")
  })

  it("fills the draft from a preset without applying it", async () => {
    const onApply = vi.fn()
    render(<ControlledPicker onApply={onApply} />)
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole("button", { name: "Last month" }))
    expect(screen.getByRole("button", { name: "Last month" }).getAttribute("aria-pressed")).toBe("true")
    expect(onApply).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(onApply).toHaveBeenCalledWith({ from: "2026-10-01", to: "2026-10-31" })
  })
})

const renderDashboard = () =>
  render(
    <TooltipProvider>
      <DashboardView />
    </TooltipProvider>,
  )

const card = (label: string) => screen.getByRole("heading", { name: label, level: 3 }).closest("section")!

describe("DashboardView", () => {
  it("queries the range in the URL and shows that same range", async () => {
    mockSearch.current = new URLSearchParams("from=2026-10-01&to=2026-10-31")
    renderDashboard()
    expect(trigger().textContent).toContain("Last month · 1 Oct 2026 – 31 Oct 2026")
    await waitFor(() => expect(card("Disbursed").textContent).toContain("GH₵5,500.00"))
    expect(card("Disbursed").querySelector("a")?.getAttribute("href")).toBe("/transactions?type=disbursement&from=2026-10-01&to=2026-10-31")
    expect(card("Repayments received").textContent).toContain("GH₵1,000.00")
    expect(card("Collection rate").textContent).toContain("37%")
  })

  it("writes an applied range to the URL, keeping other parameters", async () => {
    mockSearch.current = new URLSearchParams("demo=slow")
    renderDashboard()
    await userEvent.click(trigger())
    setDate(screen.getByLabelText("From"), "2026-10-01")
    setDate(screen.getByLabelText("To"), "2026-10-31")
    await userEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard?demo=slow&from=2026-10-01&to=2026-10-31", { scroll: false })
  })

  it("keeps the portfolio snapshot fixed when the period changes", async () => {
    mockSearch.current = new URLSearchParams("from=2026-10-01&to=2026-10-31")
    const { rerender } = renderDashboard()
    await waitFor(() => expect(card("Principal outstanding").textContent).toContain("GH₵8,583.33"))
    mockSearch.current = new URLSearchParams("from=2026-03-01&to=2026-03-31")
    rerender(
      <TooltipProvider>
        <DashboardView />
      </TooltipProvider>,
    )
    await waitFor(() => expect(card("Disbursed").textContent).toContain("GH₵0.00"))
    expect(card("Principal outstanding").textContent).toContain("GH₵8,583.33")
    expect(card("Collection rate").textContent).toContain("Unavailable")
    expect(screen.getByText("No disbursements, repayments or fees in this period")).toBeTruthy()
  })

  it("shows personal and branch approvals with their scopes, and alerts apart from tasks", async () => {
    renderDashboard()
    const attention = screen.getByRole("region", { name: "Needs attention" })
    await waitFor(() => expect(within(attention).getByText("Nothing is waiting on you; 3 waiting on others.")).toBeTruthy())
    expect(within(attention).getByText("Waiting on you")).toBeTruthy()
    expect(within(attention).getAllByText("Branch-wide")).toHaveLength(3)
    expect(within(attention).getByRole("link", { name: "3 unread alerts" })).toBeTruthy()

    // The explanation is one tap away, not on the page.
    expect(screen.queryByText(/Reading one doesn.t resolve/)).toBeNull()
    await userEvent.click(within(attention).getByRole("button", { name: "About unread alerts" }))
    expect((await screen.findAllByText(/Reading one doesn.t resolve/)).length).toBeGreaterThan(0)
  })

  it("never shows business zeros while loading", () => {
    renderDashboard()
    expect(screen.getByText("Loading Principal outstanding")).toBeTruthy()
    expect(screen.queryByText("GH₵0.00")).toBeNull()
  })

  it("shows a failed request as an error with Retry", async () => {
    mockSearch.current = new URLSearchParams("demo=error")
    renderDashboard()
    const alerts = await screen.findAllByRole("alert")
    expect(alerts.map((a) => a.textContent)).toEqual([
      expect.stringContaining("Couldn't load the portfolio snapshot"),
      expect.stringContaining("Couldn't load activity for this period"),
    ])
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(2)
  })

  it("keeps the last figures and says they may be stale when a refresh fails", async () => {
    mockSearch.current = new URLSearchParams("demo=refresh-error")
    renderDashboard()
    await waitFor(() => expect(card("Principal outstanding").textContent).toContain("GH₵8,583.33"))
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Couldn’t refresh")
    expect(alert.textContent).toContain("may be out of date")
    expect(card("Principal outstanding").textContent).toContain("GH₵8,583.33")
  })

  it("explains an invalid range in the link instead of silently replacing it", () => {
    mockSearch.current = new URLSearchParams("from=2026-10-31&to=2026-10-01")
    renderDashboard()
    expect(screen.getByText("The link’s date range wasn’t valid")).toBeTruthy()
    expect(trigger().textContent).toContain("Last 30 days")
  })
})
