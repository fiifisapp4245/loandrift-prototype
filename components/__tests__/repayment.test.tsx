import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { RecordPayment } from "@/components/repayment/record-payment"
import { RepaymentView } from "@/components/repayment/repayment-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { loanPosition } from "@/lib/domain/loan-position"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function view(ref: string, query = "") {
  mockPathname.current = `/loans/${ref}/repayment`
  mockSearch.current = new URLSearchParams(query)
  return render(
    <TooltipProvider>
      <RepaymentView reference={ref} />
    </TooltipProvider>,
  )
}
function form(ref = "DEMO-LN-001") {
  return render(
    <TooltipProvider>
      <RecordPayment position={loanPosition(ref)!} borrower="Ama Sample" disbursedOn="2026-10-19" onClose={() => {}} />
    </TooltipProvider>,
  )
}
const fact = (label: string) => screen.getByText(label, { selector: "dt" }).parentElement!.textContent

describe("Repayment overview", () => {
  it("shows an unambiguous position with its breakdown", () => {
    view("DEMO-LN-001")
    expect(fact("Total balance")).toContain("GH₵1,000.00")
    expect(fact("To bring current")).toContain("GH₵100.00 past due + GH₵300.00 due today")
    expect(fact("Oldest unpaid")).toContain("26 Oct 2026")
    expect(fact("Oldest unpaid")).toContain("7 days overdue")
    expect(fact("Next scheduled")).toContain("Due 9 Nov 2026")
    expect(fact("Settlement amount")).toContain("Unavailable")
  })

  it("labels the receipt balance as historical", () => {
    view("DEMO-LN-009")
    expect(screen.getByRole("columnheader", { name: /Balance after \(at the time\)/ })).toBeTruthy()
    expect(screen.getAllByRole("row")).toBeTruthy()
  })

  it("separates recording an external payment from automatic collection, and says why collection is off", () => {
    view("DEMO-LN-001")
    expect(screen.getByRole("button", { name: "Record external payment" })).toBeTruthy()
    expect(screen.getByText(/needs a mobile money mandate/)).toBeTruthy()
    expect(screen.getByRole("link", { name: "Set up a mandate from the client profile" }).getAttribute("href")).toBe("/clients/DEMO-CL-01")
  })

  it("blocks recording when sources disagree", () => {
    view("DEMO-LN-005")
    expect(screen.getByRole("alert").textContent).toContain("Sources disagree")
    expect(screen.queryByRole("button", { name: "Record external payment" })).toBeNull()
  })

  it("opens the form from the URL so the step survives a reload", async () => {
    view("DEMO-LN-001")
    await userEvent.click(screen.getByRole("button", { name: "Record external payment" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/loans/DEMO-LN-001/repayment?record=1", { scroll: false })
  })
})

describe("Record external payment", () => {
  it("suggests amounts with their breakdowns", async () => {
    form()
    const chip = screen.getByRole("button", { name: /To bring current/ })
    expect(chip.textContent).toContain("GH₵100.00 past due + GH₵300.00 due today")
    await userEvent.click(chip)
    expect((screen.getByLabelText(/Amount received/) as HTMLInputElement).value).toBe("400.00")
    expect(chip.getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /Total balance/ }).textContent).toContain("Not a settlement quote")
  })

  it("refuses over-payments and missing details, with field errors", async () => {
    form()
    await userEvent.type(screen.getByLabelText(/Amount received/), "1500")
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }))
    const amount = screen.getByLabelText(/Amount received/)
    expect(amount.getAttribute("aria-invalid")).toBe("true")
    expect(document.getElementById(amount.getAttribute("aria-describedby")!)?.textContent).toMatch(/More than the total balance \(GH₵1,000.00\)/)
    expect(screen.getByText("Choose how the money was received.")).toBeTruthy()
  })

  it("explains the effect of backdating", async () => {
    form()
    const date = screen.getByLabelText(/Received on/) as HTMLInputElement
    await userEvent.clear(date)
    await userEvent.type(date, "2026-10-30")
    expect(screen.getByText(/Backdated: the payment counts from 30 Oct 2026/)).toBeTruthy()
  })

  it("reviews allocation and the resulting position before recording, then records nothing", async () => {
    form()
    await userEvent.type(screen.getByLabelText(/Amount received/), "250")
    await userEvent.selectOptions(screen.getByLabelText(/Received by/), "Cash")
    await userEvent.click(screen.getByRole("button", { name: "Review payment" }))

    const table = await screen.findByRole("table", { name: /Allocation of GH₵250.00/ })
    const rows = within(table).getAllByRole("row").slice(1).map((r) => r.textContent)
    expect(rows).toEqual(["#126 Oct 2026Past dueGH₵100.00GH₵0.00", "#22 Nov 2026Due todayGH₵150.00GH₵150.00"])
    expect(screen.getByText("Total balance").parentElement!.textContent).toMatch(/GH₵1,000.00 becomes\s+→ GH₵750.00/)
    expect(screen.getByText("Next scheduled").parentElement!.textContent).toContain("(unchanged)")
    expect(screen.getByText("Currency").parentElement!.textContent).toContain("Ghana cedi (GHS)")
    expect(screen.getByText(/oldest unpaid installment first/)).toBeTruthy()

    await userEvent.click(screen.getByRole("button", { name: "Record GH₵250.00" }))
    await waitFor(() => expect(screen.getByRole("heading", { name: "Checked, not recorded" })).toBeTruthy())
    expect(screen.getByText(/nothing was recorded/)).toBeTruthy()
  })
})
