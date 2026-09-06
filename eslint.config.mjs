import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Restored static portfolio archive, kept verbatim outside the app source.
    "public/archive/**",
    "next-env.d.ts",
  ]),
  {
    // Jest's config is CommonJS by design; next/jest is a CJS export.
    files: ["jest.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Underscore-prefixed args are deliberately unused (interface stubs).
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
