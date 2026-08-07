import { createRequire } from "node:module";

// CI supplies lint tooling through pnpm dlx and exposes that temporary
// node_modules directory through NODE_PATH. createRequire uses the CommonJS
// resolver (including NODE_PATH), avoiding dependency/lockfile mutation just
// to execute the quality gate.
const require = createRequire(import.meta.url);
const tseslintModule = require("typescript-eslint");
const tseslint = tseslintModule.default || tseslintModule;
const reactHooksModule = require("eslint-plugin-react-hooks");
const reactHooks = reactHooksModule.default || reactHooksModule;

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/test-results/**", "**/coverage/**"],
  },
  {
    files: ["api-server/src/**/*.{ts,tsx}", "occu-med-map/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
    },
    rules: {
      "no-debugger": "error",
      "no-unreachable": "error",
      "no-constant-condition": ["error", { "checkLoops": false }],
      "no-self-assign": "error",
      "no-useless-catch": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    },
  },
);
