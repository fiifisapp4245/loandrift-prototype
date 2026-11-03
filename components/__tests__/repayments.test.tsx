import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { RepaymentsView } from "@/components/repayments/repayments-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function show(query = "") {
  mockPathname.current = "/repayments"
  mockSearch.current = new URLSearchParams(query)
  return render(
    <TooltipProvider>
      <RepaymentsView />
    </TooltipProvider>,
  )
}
const rows = async () => (await screen.findAllByRole("row")).slice(1)

describe("Repayments", () => {
  it("says nothing was received today without implying nothing is due, and links to due work", async () => {
    show()
    expect(await screen.findByText("No receipts recorded today (2 Nov 2026)")).toBeTruthy()
    expect(screen.getByText(/not that nothing is due/)).toBeTruthy()
    expect(screen.getByRole("link", { name: /2 installments are due today/ }).getAttribute("href")).toBe("/calendar")
  })

  it("leads history rows with received date, receipt reference and linked loan, and labels the balance historical", async () => {
    show("tab=history")
    const r = await rows()
    expect(r).toHaveLength(10)
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Received",
      "Receipt",
      "Loan",
      "Amount",
      "Balance after this receiptHistorical",
      "Receipt preview",
    ])
    expect(within(r[0]).getByRole("link", { name: "DEMO-LN-005" }).getAttribute("href")).toBe("/loans/DEMO-LN-005/repayment")
    expect(screen.getByText("Page 1 of 2")).toBeTruthy()
  })

  it("shows totals per currency, with no balance total", async () => {
    show("tab=history")
    await rows()
    const totals = screen.getByRole("region", { name: /Totals for every receipt on record/ })
    expect(totals.textContent).toContain("GH₵")
    expect(totals.textContent).toMatch(/GH₵8,060\.00 and USD 1,200\.00/)
    expect(totals.textContent).toContain("No balance is totalled here.")
  })

  it("shows the applied range outside the picker, with a way to reset", async () => {
    show("tab=history&from=2026-10-01&to=2026-10-31")
    expect((await rows())).toHaveLength(4)
    expect(screen.getByRole("button", { name: /^Remove filter Received:/ })).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: /Clear all/ }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/repayments?tab=history", { scroll: false })
  })

  it("explains a filtered-empty result", async () => {
    show("tab=history&q=nothing-like-this")
    expect(await screen.findByText("No receipts match these filters")).toBeTruthy()
  })

  it("previews a receipt, and recovers when the preview fails", async () => {
    show("tab=history&receipt=DEMO-RC-0029")
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("status").textContent).toMatch(/Preparing/)
    expect(await within(dialog).findByRole("article", { name: "Receipt DEMO-RC-0029" })).toBeTruthy()
    expect(within(dialog).getByText("Completed")).toBeTruthy()
  })

  it("shows an error with Retry and a fallback route when the preview fails", async () => {
    show("tab=history&receipt=DEMO-RC-0029&demo=receipt-error")
    const dialog = await screen.findByRole("dialog")
    expect(await within(dialog).findByText("Couldn't show this receipt")).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: /Retry|Try again/ })).toBeTruthy()
    expect(within(dialog).getByRole("link", { name: "Find it in Transactions" }).getAttribute("href")).toBe("/transactions?q=DEMO-RC-0029")
  })
})
