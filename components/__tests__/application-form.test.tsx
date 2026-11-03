import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ApplicationForm } from "@/components/lending/application-form"
import { mockPathname, mockRouter } from "@/test/setup-dom"

function show(clientId?: string) {
  mockPathname.current = "/loans/new"
  return render(<ApplicationForm initialClientId={clientId} />)
}
const sectionNav = () => within(screen.getByRole("navigation", { name: "Application sections" }))

describe("New loan application", () => {
  it("lists every requirement up front and explains why later steps are locked", () => {
    show()
    expect(screen.getByText("A registered client")).toBeTruthy()
    expect(screen.getByText(/Sections 2 to 9 are locked/)).toBeTruthy()
    expect(sectionNav().getByRole("button", { name: /Loan details,\s*Locked/ }).getAttribute("aria-disabled")).toBe("true")
    expect(screen.getByText(/Nothing here is saved/)).toBeTruthy()
  })

  it("starts from the client given by the profile link, and shows Calculation incomplete", () => {
    show("DEMO-CL-03")
    expect(screen.getByRole("heading", { name: "Loan details" })).toBeTruthy()
    expect(screen.getByText("Calculation incomplete")).toBeTruthy()
    expect(screen.getByText("Not entered")).toBeTruthy()
  })

  it("flags different interest and repayment units", async () => {
    show("DEMO-CL-03")
    await userEvent.selectOptions(screen.getByLabelText(/^The rate is per/), "Month")
    await userEvent.selectOptions(screen.getByLabelText(/^Repayment frequency/), "Weekly")
    expect(screen.getByText(/These are different units/)).toBeTruthy()
  })

  it("warns about a client with no ID on file", async () => {
    show()
    await userEvent.selectOptions(screen.getByLabelText(/^Client \(required/), "DEMO-CL-06")
    expect(screen.getByText(/No ID on file/)).toBeTruthy()
    expect(sectionNav().getByRole("button", { name: /Client details,\s*Needs attention/ })).toBeTruthy()
  })

  it("blocks submission with incomplete terms and says nothing was saved", async () => {
    show("DEMO-CL-03")
    await userEvent.click(sectionNav().getByRole("button", { name: /Review and save/ }))
    await userEvent.click(screen.getByRole("button", { name: "Submit for approval" }))
    expect((await screen.findByRole("alert")).textContent).toMatch(/Nothing was saved/)
    expect(screen.getAllByRole("button", { name: /^Go to Loan details/ }).length).toBeGreaterThan(0)
  })

  it("asks before discarding entered details", async () => {
    show("DEMO-CL-03")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(await screen.findByRole("dialog", { name: "Discard this application?" })).toBeTruthy()
    expect(mockRouter.push).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Discard" }))
    expect(mockRouter.push).toHaveBeenCalledWith("/loans")
  })
})
