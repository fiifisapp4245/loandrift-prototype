import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CollateralView } from "@/components/collateral/collateral-view"
import { RegisterAssetForm } from "@/components/collateral/register-asset-form"
import { TooltipProvider } from "@/components/ui/tooltip"
import { mockPathname, mockSearch } from "@/test/setup-dom"

function show(ui: React.ReactNode, path: string, query = "") {
  mockPathname.current = path
  mockSearch.current = new URLSearchParams(query)
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}
const rows = async () => (await screen.findAllByRole("row")).slice(1)

describe("Collateral register", () => {
  it("shows currency and basis on every value, and Not recorded for missing forced-sale values (F60)", async () => {
    show(<CollateralView />, "/collateral")
    const r = await rows()
    expect(r).toHaveLength(6)
    const col1 = r.find((x) => x.textContent?.includes("DEMO-COL-01"))!
    expect(col1.textContent).toContain("GH₵3,000.00")
    expect(col1.textContent).toContain("Registration estimate")
    expect(col1.textContent).toContain("Not recorded")
    expect(r.find((x) => x.textContent?.includes("DEMO-COL-06"))!.textContent).toContain("USD 2,000.00")
  })

  it("links each exception to just its assets (F61)", async () => {
    show(<CollateralView />, "/collateral")
    await rows()
    const link = screen.getByRole("link", { name: /^2\s*Pledged with no lien recorded/ })
    expect(link.getAttribute("href")).toBe("/collateral?exception=no_lien")
  })

  it("opens the one asset awaiting verification directly", async () => {
    show(<CollateralView />, "/collateral", "exception=awaiting_verification")
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(2))
    expect(screen.getAllByRole("row")[1].textContent).toContain("DEMO-COL-02")
  })

  it("never offers pre-disbursement removal on a written-off loan, and offers recovery instead (F62)", async () => {
    show(<CollateralView />, "/collateral", "asset=DEMO-COL-03")
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/Not possible: the loan is written off/)).toBeTruthy()
    expect(within(dialog).getByRole("button", { name: "Remove from loan" }).hasAttribute("disabled")).toBe(true)
    expect(within(dialog).getByText(/Allowed for this state, but not available in this prototype/)).toBeTruthy()
    expect(within(dialog).getByText(/Kwesi Fixture \(brother of the borrower\)/)).toBeTruthy()
  })

  it("starts a valuation with no basis chosen, and needs a report for an independent one (F63)", async () => {
    show(<CollateralView />, "/collateral", "asset=DEMO-COL-01")
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Record a valuation" }))
    const radios = within(dialog).getAllByRole("radio") as HTMLInputElement[]
    expect(radios.some((x) => x.checked)).toBe(false)
    await userEvent.click(within(dialog).getByRole("radio", { name: /Independent valuation/ }))
    expect(within(dialog).getByLabelText(/^Valuation report \(required\)/)).toBeTruthy()
    expect(within(dialog).getByLabelText(/^Market value \(GH₵\)/)).toBeTruthy()
    await userEvent.click(within(dialog).getByRole("button", { name: "Check details" }))
    expect((await within(dialog).findByRole("alert")).textContent).toMatch(/Nothing was saved/)
  })

  it("returns focus to the opener on cancel", async () => {
    show(<CollateralView />, "/collateral", "asset=DEMO-COL-01")
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Record a lien" }))
    expect(within(dialog).queryByLabelText(/^Registry/)).toBeNull() // only after choosing Registered
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await new Promise((r) => requestAnimationFrame(r))
    expect(document.activeElement?.textContent).toBe("Record a lien")
  })
})

describe("Register an asset", () => {
  it("shows type-specific and third-party fields only when they apply", async () => {
    show(<RegisterAssetForm />, "/collateral/new")
    expect(screen.queryByLabelText(/^Registration number/)).toBeNull()
    fireEvent.change(screen.getByLabelText(/^Type of asset/), { target: { value: "vehicle" } })
    expect(screen.getByLabelText(/^Registration number \(required\)/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/^Type of asset/), { target: { value: "property" } })
    expect(screen.getByLabelText(/^Title document reference \(required\)/)).toBeTruthy()
    await userEvent.click(screen.getByRole("radio", { name: /Someone else/ }))
    expect(screen.getByLabelText(/^Owner's full name \(required\)/)).toBeTruthy()
    expect(screen.getByText(/signed consent is tracked/)).toBeTruthy()
  })

  it("lists only loans not yet disbursed", () => {
    show(<RegisterAssetForm />, "/collateral/new")
    const options = [...(screen.getByLabelText(/^Loan this asset secures/) as HTMLSelectElement).options].map((o) => o.value).filter(Boolean)
    expect(options).toEqual(["DEMO-LN-004", "DEMO-LN-011", "DEMO-LN-012"])
  })
})
