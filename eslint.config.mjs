import tseslint from "typescript-eslint";

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
