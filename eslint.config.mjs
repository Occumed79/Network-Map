import { createRequire } from "node:module";

// CI supplies typescript-eslint through pnpm dlx and exposes that temporary
// node_modules directory through NODE_PATH. createRequire uses the CommonJS
// resolver (including NODE_PATH), avoiding any dependency/lockfile mutation
// just to execute the lint gate.
const require = createRequire(import.meta.url);
const tseslintModule = require("typescript-eslint");
const tseslint = tseslintModule.default || tseslintModule;

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
    },
    rules: {
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unreachable": "error",
      "no-constant-condition": ["error", { "checkLoops": false }],
      "no-self-assign": "error",
      "no-useless-catch": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error"
    },
  },
);
