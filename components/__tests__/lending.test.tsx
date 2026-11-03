import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ClientForm } from "@/components/lending/client-form"
import { ClientProfileView } from "@/components/lending/client-profile-view"
import { ClientsView } from "@/components/lending/clients-view"
import { LoanDetailView } from "@/components/lending/loan-detail-view"
import { LoansView } from "@/components/lending/loans-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function show(ui: React.ReactNode, path: string, query = "") {
  mockPathname.current = path
  mockSearch.current = new URLSearchParams(query)
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}
const rows = () => screen.getAllByRole("row").slice(1)

describe("All Loans", () => {
  it("leads every row with a linked reference and a View loan action", () => {
    show(<LoansView />, "/loans")
    expect(rows()).toHaveLength(8)
    expect(screen.getByText("Page 1 of 2")).toBeTruthy()
    for (const link of screen.getAllByRole("link", { name: /^View loan / })) {
      expect(link.getAttribute("href")).toMatch(/^\/loans\/DEMO-LN-\d{3}$/)
    }
  })

  it("labels repayment progress with amounts, and explains loans with no schedule", () => {
    show(<LoansView />, "/loans", "q=Ama")
    expect(screen.getByText("of GH₵1,200.00 paid", { exact: false })).toBeTruthy()
    expect(screen.getByRole("meter", { name: "Repaid" }).getAttribute("aria-valuetext")).toBe("16.7% repaid")
  })

  it("keeps View loan for written-off and unrecognised loans", () => {
    show(<LoansView />, "/loans", "status=written_off")
    expect(screen.getByRole("link", { name: "View loan DEMO-LN-006" })).toBeTruthy()
    expect(within(screen.getByRole("table")).getByText("Written off")).toBeTruthy()
  })

  it("adds the stage column and description when a stage is filtered", () => {
    show(<LoansView />, "/loans", "status=captured")
    expect(screen.getByRole("columnheader", { name: "Decision readiness" })).toBeTruthy()
    expect(screen.getByText("1 blocker: Guarantor form missing")).toBeTruthy()
    expect(screen.getByText(/Terms captured; awaiting a decision/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Remove filter Status: Captured" })).toBeTruthy()
  })

  it("shows no stage column without a status filter", () => {
    show(<LoansView />, "/loans")
    expect(screen.queryByRole("columnheader", { name: "Decision readiness" })).toBeNull()
  })

  it("shows a filtered-empty state with Clear filters", async () => {
    show(<LoansView />, "/loans", "q=zzz")
    expect(screen.getByText("No loans match these filters")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/loans", { scroll: false })
  })
})

describe("Loan detail", () => {
  it("keeps identity and the financial summary above every tab", () => {
    show(<LoanDetailView reference="DEMO-LN-001" />, "/loans/DEMO-LN-001", "tab=documents")
    expect(screen.getByRole("heading", { level: 1, name: "DEMO-LN-001" })).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Documents", selected: true })).toBeTruthy()
    const term = (t: string) => screen.getByText(t, { selector: "dt" }).parentElement!.textContent
    expect(term("Total balance")).toContain("GH₵1,000.00")
    expect(term("To bring current")).toContain("GH₵400.00")
    expect(term("Next scheduled")).toContain("GH₵300.00")
    expect(screen.getByText("Signed loan agreement")).toBeTruthy()
    expect(screen.getByText(/1\.3 MB/)).toBeTruthy()
  })

  it("lists all seven sections and writes the tab to the URL", async () => {
    show(<LoanDetailView reference="DEMO-LN-001" />, "/loans/DEMO-LN-001")
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual([
      "Overview",
      "Schedule & payments",
      "Client & affordability",
      "Agreement",
      "Collateral",
      "Documents",
      "History",
    ])
    await userEvent.keyboard("{Tab}")
    screen.getByRole("tab", { name: "Schedule & payments" }).focus()
    await userEvent.keyboard("{Enter}")
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Schedule & payments" }))
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/loans/DEMO-LN-001?tab=schedule", { scroll: false }))
  })

  it("shows the schedule with precise states and totals", () => {
    show(<LoanDetailView reference="DEMO-LN-001" />, "/loans/DEMO-LN-001", "tab=schedule")
    const table = screen.getByRole("table", { name: "Repayment schedule for DEMO-LN-001" })
    expect(within(table).getByText("Overdue, part paid")).toBeTruthy()
    expect(within(table).getByText("Due today")).toBeTruthy()
    expect(within(table).getByRole("rowheader", { name: "Total" }).parentElement!.textContent).toContain("GH₵1,000.00")
  })

  it("flags a disbursed loan with an outstanding signature without explaining it away", () => {
    show(<LoanDetailView reference="DEMO-LN-009" />, "/loans/DEMO-LN-009", "tab=agreement")
    expect(screen.getByText("Outstanding")).toBeTruthy()
    expect(screen.getByText(/Check this against the product.s signing rule/)).toBeTruthy()
  })

  it("masks the ID number for a loan officer", () => {
    show(<LoanDetailView reference="DEMO-LN-001" />, "/loans/DEMO-LN-001", "tab=client&as=officer")
    expect(screen.getByText("Ghana Card · •••-••••••001-0")).toBeTruthy()
    expect(screen.getByText(/doesn.t calculate one from income alone/)).toBeTruthy()
  })

  it("explains an unknown reference", () => {
    show(<LoanDetailView reference="DEMO-LN-999" />, "/loans/DEMO-LN-999")
    expect(screen.getByText("This loan isn't in this branch's records")).toBeTruthy()
  })
})

describe("Clients", () => {
  it("shows Not provided for missing data and a View profile action per row", () => {
    show(<ClientsView />, "/clients", "q=Akos")
    const row = rows()[0]!
    expect(within(row).getAllByText("Not provided")).toHaveLength(2)
    expect(within(row).getByRole("link", { name: "View profile Akos Fixture" }).getAttribute("href")).toBe("/clients/DEMO-CL-05")
  })

  it("echoes an unmatched search and offers Clear search before Add", () => {
    show(<ClientsView />, "/clients", "q=ZZZ-no-match")
    const state = screen.getByRole("status")
    expect(state.textContent).toContain("No clients match “ZZZ-no-match”")
    expect(state.textContent).toContain("The branch has 11 clients")
    const buttons = within(state).getAllByRole("button").concat(within(state).getAllByRole("link"))
    expect(buttons[0]!.textContent).toBe("Clear search")
  })

  it("shows separate principal, total payable and paid in client history", () => {
    show(<ClientProfileView id="DEMO-CL-02" />, "/clients/DEMO-CL-02")
    const card = screen.getByRole("link", { name: "DEMO-LN-003" }).closest("li")!
    expect(within(card).getByText("Completed")).toBeTruthy()
    expect(card.textContent).toContain("Approved principalGH₵2,000.00")
    expect(card.textContent).toContain("Total payableGH₵2,060.00")
    expect(screen.getByText("1 of 1 closed loans")).toBeTruthy()
    expect(screen.queryByText(/pending/i)).toBeNull()
  })
})

describe("Add client form", () => {
  it("associates errors with fields and focuses a summary", async () => {
    show(<ClientForm />, "/clients/new")
    await userEvent.click(screen.getByRole("button", { name: "Register client" }))
    const summary = await screen.findByRole("alert")
    await waitFor(() => expect(document.activeElement).toBe(summary))
    const first = screen.getByLabelText(/^First name/)
    expect(first.getAttribute("aria-invalid")).toBe("true")
    expect(document.getElementById(first.getAttribute("aria-describedby")!.split(" ").at(-1)!)?.textContent).toContain("Enter the client's first name.")
    expect(within(summary).getByRole("link", { name: "First name" }).getAttribute("href")).toBe("#field-firstName")
  })

  it("shows the server's duplicate-ID error on the field", async () => {
    show(<ClientForm />, "/clients/new")
    await userEvent.type(screen.getByLabelText(/^First name/), "Test")
    await userEvent.type(screen.getByLabelText(/^Last name/), "Person")
    await userEvent.type(screen.getByLabelText(/^Primary phone/), "020 000 0099")
    await userEvent.selectOptions(screen.getByLabelText(/^ID type/), "Ghana Card")
    await userEvent.type(screen.getByLabelText(/^ID number/), "GHA-000000003-0")
    await userEvent.click(screen.getByRole("button", { name: "Register client" }))
    expect((await screen.findByRole("alert")).textContent).toContain("The server found a problem. Nothing was saved.")
    expect(screen.getAllByText(/already registered to client DEMO-CL-03/).length).toBeGreaterThan(0)
  })

  it("asks before discarding entered details", async () => {
    show(<ClientForm />, "/clients/new")
    await userEvent.type(screen.getByLabelText(/^First name/), "Test")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(await screen.findByRole("dialog", { name: "Discard this client’s details?" })).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Keep editing" }))
    expect((screen.getByLabelText(/^First name/) as HTMLInputElement).value).toBe("Test")
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it("rejects an upload of the wrong type or size", async () => {
    show(<ClientForm />, "/clients/new")
    const input = screen.getByLabelText(/^ID document image/)
    fireEvent.change(input, { target: { files: [new File(["x"], "id.gif", { type: "image/gif" })] } })
    expect(await screen.findByText("Choose a JPG, PNG or PDF file.")).toBeTruthy()
  })
})
