import pluginNext from "@next/eslint-plugin-next";
import parser from "@typescript-eslint/parser";
import * as importX from "eslint-plugin-import-x";

export default [
  {
    ignores: [
      "*.config.js",
      "node_modules/**",
      "dist/**",
      ".next/**",
      "public/**",
      "**/components/ui/**",
    ],
  },
  {
    name: "ESLint Config - nextjs",
    plugins: {
      "@next/next": pluginNext,
      "import-x": importX,
    },
    languageOptions: {
      parser: parser,
    },
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      "no-unused-vars": "warn",
      "import-x/no-duplicates": "error",
      "import-x/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "object",
            "type",
            "index",
          ],
          "newlines-between": "never",
          pathGroups: [
            {
              pattern: "react",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "react-**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/components/**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "@/components/ui/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "**/*.css",
              group: "index",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["react", "next"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },
];
