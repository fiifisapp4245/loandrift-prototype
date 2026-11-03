/**
 * The nine old Loan Features queues. They duplicated All Loans filtered by status, so the sidebar
 * group was removed (user decision, 3 Nov 2026; audit F44). Each old path still works: it redirects
 * to the matching All Loans filter, so bookmarks and shared links keep landing on the same loans.
 *
 * Plain module with no path aliases, because next.config.ts imports it.
 */
export const LEGACY_QUEUE_ROUTES: { path: string; status: string; label: string }[] = [
  { path: "/registration", status: "registered", label: "Registered" },
  { path: "/capture", status: "captured", label: "Captured" },
  { path: "/approval/approved", status: "approved", label: "Approved" },
  { path: "/approval/rejected", status: "rejected", label: "Rejected" },
  { path: "/disbursement", status: "disbursed", label: "Disbursed" },
  { path: "/active", status: "active", label: "Active" },
  { path: "/defaulted", status: "defaulted", label: "Defaulted" },
  { path: "/completed", status: "completed", label: "Completed" },
  { path: "/write-offs", status: "written_off", label: "Written off" },
]
