import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { CollectionsView } from "@/components/collections/collections-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { resetLoggedContacts } from "@/lib/api/collections"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function show(query = "") {
  mockPathname.current = "/collections"
  mockSearch.current = new URLSearchParams(query)
  return render(
    <TooltipProvider>
      <CollectionsView />
    </TooltipProvider>,
  )
}
const rows = async () => (await screen.findAllByRole("row")).slice(1)
afterEach(() => resetLoggedContacts())

describe("Collections", () => {
  it("lists accounts most overdue first, with past due kept apart from total balance", async () => {
    show()
    const r = await rows()
    expect(r).toHaveLength(2)
    expect(r[0].textContent).toContain("DEMO-LN-002")
    expect(r[1].textContent).toContain("GH₵100.00")
    expect(r[1].textContent).toContain("No contact yet")
    expect(screen.getByRole("heading", { name: "Branch totals" })).toBeTruthy()
  })

  it("says exactly which age band is empty, keeps branch totals, and offers reset (F58)", async () => {
    show("age=31-60")
    expect(await screen.findByText("No accounts 31–60 days overdue")).toBeTruthy()
    expect(screen.getByText(/The branch still has 2 accounts in arrears/)).toBeTruthy()
    const totals = screen.getByRole("region", { name: "Branch totals" })
    expect(within(totals).getByText("2")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Reset days overdue" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/collections", { scroll: false })
  })

  it("shows the history with kept, broken and open promises worked out from receipts", async () => {
    show("account=DEMO-LN-002")
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Contact history (6)")).toBeTruthy()
    expect(within(dialog).getByText("Promise kept")).toBeTruthy()
    expect(within(dialog).getAllByText("Promise broken")).toHaveLength(2)
    expect(within(dialog).getByText("Promise open")).toBeTruthy()
    expect(within(dialog).getByText("What the borrower said, not a recorded payment.")).toBeTruthy()
  })

  it("offers outcomes only after a channel, and only ones that channel can produce (F59)", async () => {
    show("account=DEMO-LN-001")
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("No contact recorded yet.")).toBeTruthy()
    await userEvent.click(within(dialog).getByRole("button", { name: "Log a contact" }))
    const outcome = within(dialog).getByLabelText(/^What happened/) as HTMLSelectElement
    expect(outcome.disabled).toBe(true)
    await userEvent.selectOptions(within(dialog).getByLabelText(/^How you contacted them/), "email")
    const options = [...outcome.options].map((o) => o.textContent)
    expect(options).not.toContain("No answer")
    expect(options).toContain("Sent, no reply yet")
    expect((within(dialog).getByLabelText(/^When the contact happened/) as HTMLInputElement).value).toBe("2026-11-02T09:00")
  })

  it("requires amount and date for a promise, then saves in memory and says so", async () => {
    show("account=DEMO-LN-001")
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Log a contact" }))
    await userEvent.selectOptions(within(dialog).getByLabelText(/^How you contacted them/), "call")
    await userEvent.selectOptions(within(dialog).getByLabelText(/^What happened/), "promised")
    await userEvent.click(within(dialog).getByRole("button", { name: "Save contact" }))
    const summary = await within(dialog).findByRole("alert")
    expect(summary.textContent).toMatch(/2 highlighted fields/)
    // Focus moves to the error summary first, as it would for a screen-reader user.
    await waitFor(() => expect(document.activeElement).toBe(summary))
    expect(within(dialog).getByLabelText(/^Amount promised/).getAttribute("aria-invalid")).toBe("true")
    await userEvent.type(within(dialog).getByLabelText(/^Amount promised/), "100")
    fireEvent.change(within(dialog).getByLabelText(/^Promised to pay by/), { target: { value: "2026-11-06" } })
    await userEvent.click(within(dialog).getByRole("button", { name: "Save contact" }))
    expect((await within(dialog).findByRole("status")).textContent).toMatch(/saved in this demo only/)
    expect(within(dialog).getByText("Promise open")).toBeTruthy()
  })

  it("explains that 'says already paid' records no payment", async () => {
    show("account=DEMO-LN-001")
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Log a contact" }))
    await userEvent.selectOptions(within(dialog).getByLabelText(/^How you contacted them/), "in_person")
    await userEvent.selectOptions(within(dialog).getByLabelText(/^What happened/), "says_paid")
    expect(within(dialog).getByText(/doesn’t record a payment/)).toBeTruthy()
  })

  it("returns focus to Log a contact on cancel", async () => {
    show("account=DEMO-LN-001")
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Log a contact" }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement?.textContent).toBe("Log a contact")
  })
})
