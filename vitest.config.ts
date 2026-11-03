import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

const exclude = ["node_modules/**", ".next/**"]

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      // Rules and calculations: plain Node, fast.
      { extends: true, test: { name: "unit", environment: "node", include: ["**/*.test.ts"], exclude } },
      // Components: rendered in jsdom and driven like a user would.
      { extends: true, test: { name: "components", environment: "jsdom", include: ["**/*.test.tsx"], exclude, setupFiles: ["./test/setup-dom.ts"] } },
    ],
  },
})
