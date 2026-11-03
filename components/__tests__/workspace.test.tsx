import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ApprovalsView } from "@/components/workspace/approvals-view"
import { NotificationsView } from "@/components/workspace/notifications-view"
import { resetReadState, setNotificationRead } from "@/lib/api/workspace"
import { mockPathname, mockRouter, mockSearch } from "@/test/setup-dom"

function show(ui: React.ReactNode, path: string, query = "") {
  mockPathname.current = path
  mockSearch.current = new URLSearchParams(query)
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

const approvals = (query = "") => show(<ApprovalsView />, "/workspace/approvals", query)
const notifications = (query = "") => show(<NotificationsView />, "/workspace/notifications", query)
const dataRows = () => screen.getAllByRole("row").slice(1)

describe("My Approvals", () => {
  it("explains an empty personal queue next to a busy branch queue", async () => {
    approvals()
    expect(await screen.findByText("Nothing is waiting on you")).toBeTruthy()
    expect(screen.getByText("3 waiting on others in the branch.")).toBeTruthy()
    expect(screen.getByRole("tab", { name: /Waiting on me/ }).textContent).toContain("0")
    await userEvent.click(screen.getByRole("button", { name: "View branch queue" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/workspace/approvals?scope=branch", { scroll: false })
  })

  it("uses one scope for the tab counts and the rows", async () => {
    approvals("scope=branch")
    await waitFor(() => expect(dataRows()).toHaveLength(3))
    expect(screen.getByRole("tab", { name: /^Waiting/ }).textContent).toContain("3")
    expect(screen.getByRole("columnheader", { name: "Next action" })).toBeTruthy()
  })

  it("shows applied filters as removable chips and filters the rows", async () => {
    approvals("scope=branch&kind=Write-off")
    await waitFor(() => expect(dataRows()).toHaveLength(1))
    expect(screen.getByText("matching requests", { exact: false }).textContent).toContain("1")
    await userEvent.click(screen.getByRole("button", { name: "Remove filter Type: Write-off" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/workspace/approvals?scope=branch", { scroll: false })
  })

  it("says a filtered result is empty because of the filters, and clears them", async () => {
    approvals("scope=branch&q=zzz")
    expect(await screen.findByText("No requests match these filters")).toBeTruthy()
    expect(screen.queryByText(/Nothing is waiting/)).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(mockRouter.replace).toHaveBeenCalledWith("/workspace/approvals?scope=branch", { scroll: false })
  })

  it("opens a read-only review panel from the URL, with maker-checker explained", async () => {
    approvals("scope=branch&id=DEMO-AP-03")
    const panel = await screen.findByRole("dialog")
    expect(within(panel).getByRole("heading", { name: "Write-off" })).toBeTruthy()
    expect(within(panel).getByText(/You raised this request/)).toBeTruthy()
    expect((within(panel).getByRole("button", { name: "Approve" }) as HTMLButtonElement).disabled).toBe(true)
    expect((within(panel).getByRole("button", { name: "Reject" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("shows evidence and blockers in the panel", async () => {
    approvals("scope=branch&id=DEMO-AP-01")
    const panel = await screen.findByRole("dialog")
    expect(within(panel).getByText("Guarantor form").parentElement?.textContent).toContain("Missing")
    expect(within(panel).getByText("Guarantor form missing")).toBeTruthy()
    expect(within(panel).getByText("Only the assigned approver can decide at level 1.")).toBeTruthy()
  })

  it("explains a permission limit instead of showing an empty list", async () => {
    approvals("scope=branch&as=officer")
    expect(await screen.findByText(/Branch approvals are limited/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Show my approvals" })).toBeTruthy()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("states the 30-day rule on Completed and links to older history", async () => {
    approvals("scope=branch&tab=completed")
    await waitFor(() => expect(dataRows()).toHaveLength(4))
    expect(screen.getByText(/Last 30 days only/).textContent).toContain("1 older")
    expect(screen.getByRole("link", { name: "Approval history" }).getAttribute("href")).toBe("/reports?report=approval-history")
  })

  it("shows a failed request as an error with Retry", async () => {
    approvals("demo=error")
    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load approvals")
  })
})

describe("Notifications", () => {
  afterEach(() => resetReadState())

  it("labels what each summary counts", async () => {
    notifications()
    const card = (label: string) => screen.getByRole("heading", { name: label }).closest("section")!
    await waitFor(() => expect(card("Unread alerts").textContent).toContain("3"))
    expect(card("Open tasks behind alerts").textContent).toContain("4")
    expect(card("Alerts, last 7 days").textContent).toContain("6")
  })

  it("keeps Mark read and Open record separate, and reading doesn't resolve the task", async () => {
    notifications("q=Kojo")
    const item = (await screen.findByText("Account 79 days overdue")).closest("li")!
    expect(within(item).getByRole("img", { name: "Unread" })).toBeTruthy()
    expect(within(item).getByRole("link", { name: /Open record/ }).getAttribute("href")).toBe("/collections")

    await userEvent.click(within(item).getByRole("button", { name: /^Mark read: / }))
    await waitFor(() => expect(within(item).queryByRole("img", { name: "Unread" })).toBeNull())
    expect(within(item).getByText("Task open")).toBeTruthy()
    expect(screen.getByText(/marked as read/)).toBeTruthy()
  })

  it("never claims work is done when the unread list is empty", async () => {
    await setNotificationRead(["DEMO-NT-01", "DEMO-NT-03", "DEMO-NT-04"], true)
    notifications("show=unread")
    expect(await screen.findByText("No unread notifications")).toBeTruthy()
    expect(screen.getByText("4 tasks are still open behind your alerts.")).toBeTruthy()
  })

  it("says filters matched nothing, without implying anything is settled", async () => {
    notifications("type=document&urgency=high")
    expect(await screen.findByText("No notifications match these filters")).toBeTruthy()
    expect(screen.getByText(/says nothing about whether payments or approvals are settled/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Remove filter Type: Document" })).toBeTruthy()
  })

  it("flags high urgency with text, not colour alone", async () => {
    notifications("urgency=high")
    const item = (await screen.findByText("Account 79 days overdue")).closest("li")!
    expect(within(item).getByText("High urgency")).toBeTruthy()
  })
})
