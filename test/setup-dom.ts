// jsdom lacks a few browser APIs that Radix uses. These stubs only make the calls safe;
// tests assert on behaviour, never on these.
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => cleanup())

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

window.matchMedia ??= (query: string) =>
  ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList

Element.prototype.scrollIntoView ??= function () {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= function () {}
Element.prototype.releasePointerCapture ??= function () {}

// The app reads the URL through Next's router; tests run outside Next.
// Tests set the current path with `mockPathname.current = "/capture"`.
// Query strings with `mockSearch.current = new URLSearchParams("from=…")`; navigation calls on `mockRouter`.
export const mockPathname = { current: "/dashboard" }
export const mockSearch = { current: new URLSearchParams() }
export const mockRouter = { push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname.current,
  useSearchParams: () => mockSearch.current,
}))

afterEach(() => {
  mockSearch.current = new URLSearchParams()
  vi.clearAllMocks()
})
