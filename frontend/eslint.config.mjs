import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * Focused lint setup. The priority is the React Rules of Hooks
 * (react-hooks/rules-of-hooks = error) — the class of bug that previously
 * shipped silently because nothing checked for it. Stylistic / pre-existing
 * TypeScript nits (explicit any, unused vars) are warnings so `npm run lint`
 * stays green and the hook errors aren't drowned out.
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/data/**", "**/*.config.*", "*.cjs"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // The thing we actually care about catching.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript owns these — the JS-level versions are noisy/false-positive on TS.
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-redeclare": "off",

      // Keep, but non-blocking on this existing codebase.
      "prefer-const": "warn",
      "no-empty": "warn",
      "no-useless-escape": "warn",
    },
  }
);
