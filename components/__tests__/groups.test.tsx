import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { GroupDetailView } from "@/components/groups/group-detail-view"
import { GroupForm } from "@/components/groups/group-form"
import { GroupLoanForm } from "@/components/groups/group-loan-form"
import { GroupsView } from "@/components/groups/groups-view"
import { TooltipProvider } from "@/components/ui/tooltip"
import { mockPathname, mockSearch } from "@/test/setup-dom"

function show(ui: React.ReactNode, path: string, query = "") {
  mockPathname.current = path
  mockSearch.current = new URLSearchParams(query)
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe("Groups list (F68)", () => {
  it("shows placeholders, not zeros, while loading", () => {
    show(<GroupsView />, "/groups")
    const totals = screen.getByRole("heading", { name: "Branch totals" }).closest("section")!
    expect(totals.textContent).not.toMatch(/\d/)
    expect(screen.getAllByText("Loading groups").length).toBeGreaterThan(0)
  })

  it("keeps branch totals during a search with no match, and says what to try", async () => {
    show(<GroupsView />, "/groups", "q=zzz")
    expect(await screen.findByText("No group matches")).toBeTruthy()
    expect(screen.getByText(/Try another name or code/)).toBeTruthy()
    const totals = screen.getByRole("heading", { name: "Branch totals" }).closest("section")!
    expect(within(totals).getByText("Active groups").nextSibling?.textContent).toBe("2")
    expect(screen.getByText(/matching groups of\s*3/)).toBeTruthy()
  })

  it("shows Not recorded for a group with no meeting day or frequency", async () => {
    show(<GroupsView />, "/groups")
    const rows = (await screen.findAllByRole("row")).slice(1)
    expect(rows).toHaveLength(3)
    expect(rows.find((r) => r.textContent?.includes("RID-03"))!.textContent).toContain("Day not recorded")
  })
})

describe("Group detail (F64, F67)", () => {
  it("shows the meeting overview without edit mode, with Not recorded for missing fields", () => {
    show(<GroupDetailView id="DEMO-GR-02" />, "/groups/DEMO-GR-02")
    const overview = screen.getByRole("heading", { name: "Overview" }).closest("section")!
    expect(within(overview).getByText("Friday")).toBeTruthy()
    expect(within(overview).getAllByText("Not recorded")).toHaveLength(2)
    expect(within(overview).getByRole("button", { name: "Edit details" }).hasAttribute("disabled")).toBe(true)
  })

  it("adds nobody on search or selection, only on an explicit Add member", async () => {
    show(<GroupDetailView id="DEMO-GR-02" />, "/groups/DEMO-GR-02")
    await userEvent.click(screen.getByRole("button", { name: "Add member" }))
    await userEvent.type(screen.getByLabelText("Find a registered client"), "am")
    expect((screen.getByRole("radio", { name: /Ama Sample/ }) as HTMLInputElement).disabled).toBe(true)
    expect(screen.getAllByText(/Already in Osu Market Traders/)).toHaveLength(2)
    await userEvent.click(screen.getByRole("radio", { name: /Kwame Mock/ }))
    expect(screen.queryByText(/passes the checks/)).toBeNull()
    fireEvent.change(screen.getByLabelText(/^Role in the group/), { target: { value: "treasurer" } })
    expect(screen.getByText(/Ready to add/).textContent).toBe("Ready to add Kwame Mock as treasurer.")
    await userEvent.click(screen.getByRole("button", { name: "Add member" }))
    expect((await screen.findByText(/passes the checks/)).textContent).toMatch(/Kwame Mock.*Nothing was changed/)
  })

  it("reviews a removal, showing what the member still owes", async () => {
    show(<GroupDetailView id="DEMO-GR-02" />, "/groups/DEMO-GR-02")
    await userEvent.click(screen.getByRole("button", { name: "Remove Kojo Example" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/still owes on DEMO-LN-002/)).toBeTruthy()
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep Kojo" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(screen.queryByText(/passes the checks/)).toBeNull()
  })

  it("reports a failed check, saying nothing changed", async () => {
    show(<GroupDetailView id="DEMO-GR-02" />, "/groups/DEMO-GR-02", "demo=member-error")
    await userEvent.click(screen.getByRole("button", { name: "Change role for Kojo Example" }))
    const dialog = await screen.findByRole("dialog")
    expect((within(dialog).getAllByRole("radio") as HTMLInputElement[]).some((r) => r.checked)).toBe(false)
    await userEvent.click(within(dialog).getByRole("radio", { name: "Treasurer" }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Change role" }))
    expect((await screen.findByRole("alert")).textContent).toMatch(/Nothing was changed; try again/)
  })

  it("says plainly when a group has no loans", () => {
    show(<GroupDetailView id="DEMO-GR-02" />, "/groups/DEMO-GR-02")
    expect(screen.getByText("No group loans yet")).toBeTruthy()
  })

  it("shows each member's principal and the total for an existing group loan", () => {
    show(<GroupDetailView id="DEMO-GR-01" />, "/groups/DEMO-GR-01")
    const table = screen.getByRole("table", { name: "Members in DEMO-GL-01" })
    expect(table.textContent).toMatch(/Total principal, 3 members\s*GH₵1,900\.00/)
    expect(screen.getByText("Joint liability")).toBeTruthy()
  })
})

describe("Group loan application (F65, F66)", () => {
  it("offers no actionable application until a member has an amount", async () => {
    show(<GroupLoanForm id="DEMO-GR-02" />, "/groups/DEMO-GR-02/apply")
    const apply = () => screen.getByRole("button", { name: /^Apply/ })
    expect(apply().hasAttribute("disabled")).toBe(true)
    expect(apply().textContent).toBe("Apply")
    expect(screen.getByText("Include at least one member with an amount to apply.")).toBeTruthy()
    await userEvent.click(screen.getByRole("checkbox", { name: /Include Nana Fictional/ }))
    expect(apply().hasAttribute("disabled")).toBe(true)
    await userEvent.type(screen.getByLabelText(/^Principal for Nana/), "700")
    expect(apply().textContent).toBe("Apply for 1 member")
    expect((screen.getByRole("checkbox", { name: /Include Akos Fixture/ }) as HTMLInputElement).disabled).toBe(true)
  })

  it("preselects no liability and names every problem, by member", async () => {
    show(<GroupLoanForm id="DEMO-GR-02" />, "/groups/DEMO-GR-02/apply")
    const radios = screen.getAllByRole("radio") as HTMLInputElement[]
    expect(radios.some((r) => r.checked)).toBe(false)
    await userEvent.click(screen.getByRole("checkbox", { name: /Include Nana Fictional/ }))
    await userEvent.type(screen.getByLabelText(/^Principal for Nana/), "700")
    await userEvent.click(screen.getByRole("checkbox", { name: /Include Kojo Example/ }))
    await userEvent.type(screen.getByLabelText(/^Principal for Kojo/), "0")
    expect(screen.getByText("1 of 2 included members still needs a valid amount.")).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Apply for 1 member" }))
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toMatch(/Kojo Example: Enter an amount above zero/)
    expect(alert.textContent).toMatch(/Choose who is responsible for repayment/)
    expect(alert.textContent).toMatch(/Nothing was saved/)
  })

  it("labels the four term units separately and shows the duration", async () => {
    show(<GroupLoanForm id="DEMO-GR-02" />, "/groups/DEMO-GR-02/apply")
    expect(screen.getByLabelText(/^Interest charge period/)).toBeTruthy()
    expect(screen.getByLabelText(/^Repayment frequency/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/^Repayment frequency/), { target: { value: "Monthly" } })
    await userEvent.type(screen.getByLabelText(/^Number of installments/), "6")
    expect(screen.getByText("Duration: 6 months.")).toBeTruthy()
  })
})

describe("Form a group (F67)", () => {
  it("captures the meeting fields the overview shows, leaving them optional", async () => {
    show(<GroupForm />, "/groups/new")
    expect(screen.getByLabelText(/^Meeting day \(optional\)/)).toBeTruthy()
    expect(screen.getByLabelText(/^Meeting place \(optional\)/)).toBeTruthy()
    await userEvent.click(screen.getByRole("button", { name: "Form group" }))
    expect((await screen.findByRole("alert")).textContent).toMatch(/Check the 3 highlighted fields/)
  })
})
