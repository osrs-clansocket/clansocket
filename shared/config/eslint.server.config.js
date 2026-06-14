import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const noDuplication = require("./eslint-rules/no-duplication.cjs");
const noUnusedVars = require("./eslint-rules/no-unused-vars.cjs");
const fileLimits = require("./eslint-rules/file-limits.cjs");
const folderLimits = require("./eslint-rules/folder-limits.cjs");
const namingConventions = require("./eslint-rules/naming-conventions.cjs");
const noRegex = require("./eslint-rules/no-regex.cjs");
const noComments = require("./eslint-rules/no-comments.cjs");
const noConsole = require("./eslint-rules/no-console.cjs");
const noCrossFileDuplication = require("./eslint-rules/no-cross-file-duplication.cjs");
const noTimerHeuristic = require("./eslint-rules/no-timer-heuristic.cjs");
const preferLookupTable = require("./eslint-rules/prefer-lookup-table.cjs");
const noUndefinedSqlColumn = require("./eslint-rules/no-undefined-sql-column.cjs");
const noUnroutedTelemetry = require("./eslint-rules/no-unrouted-telemetry.cjs");
const noBucketFiles = require("./eslint-rules/no-bucket-files.cjs");
const lviMaxParams = require("./eslint-rules/max-params.cjs");
const lviMaxDepth = require("./eslint-rules/max-depth.cjs");
const lviMaxLinesPerFunction = require("./eslint-rules/max-lines-per-function.cjs");
const lviNoEmpty = require("./eslint-rules/no-empty.cjs");
const lviNoMagicNumbers = require("./eslint-rules/no-magic-numbers.cjs");
const lviNoWarningComments = require("./eslint-rules/no-warning-comments.cjs");
const noLeakShape = require("./eslint-rules/no-leak-shape.cjs");
const noEnvFallback = require("./eslint-rules/no-env-fallback.cjs");

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["main/server/src/**/*.ts"],
    plugins: {
      "@stylistic": stylistic,
      "lvi": {
        rules: {
          "no-duplication": noDuplication,
          "no-unused-vars": noUnusedVars,
          "file-limits": fileLimits,
          "folder-limits": folderLimits,
          "naming-conventions": namingConventions,
          "no-regex": noRegex,
          "no-comments": noComments,
          "no-console": noConsole,
          "no-cross-file-duplication": noCrossFileDuplication,
          "no-timer-heuristic": noTimerHeuristic,
          "prefer-lookup-table": preferLookupTable,
          "no-undefined-sql-column": noUndefinedSqlColumn,
          "no-unrouted-telemetry": noUnroutedTelemetry,
          "no-bucket-files": noBucketFiles,
          "max-params": lviMaxParams,
          "max-depth": lviMaxDepth,
          "max-lines-per-function": lviMaxLinesPerFunction,
          "no-empty": lviNoEmpty,
          "no-magic-numbers": lviNoMagicNumbers,
          "no-warning-comments": lviNoWarningComments,
          "no-leak-shape": noLeakShape,
          "no-env-fallback": noEnvFallback,
        },
      },
    },
    rules: {
      "lvi/no-duplication": "error",
      "lvi/no-cross-file-duplication": "error",
      "lvi/no-unused-vars": "error",
      "lvi/file-limits": ["error", { max: 150 }],
      "lvi/folder-limits": ["error", { max: 6 }],
      "lvi/naming-conventions": "error",
      "lvi/no-regex": "error",
      "lvi/no-comments": "error",
      "lvi/no-console": "error",
      "lvi/no-timer-heuristic": "error",
      "lvi/prefer-lookup-table": "error",
      "lvi/no-undefined-sql-column": "error",
      "lvi/no-unrouted-telemetry": "error",
      "lvi/no-bucket-files": "error",
      "lvi/max-params": ["error", { max: 4 }],
      "lvi/max-depth": ["error", { max: 3 }],
      "lvi/max-lines-per-function": ["error", { max: 25, skipBlankLines: true, skipComments: true }],
      "lvi/no-magic-numbers": ["error", { ignore: [-1, 0, 1, 2, 1024, 60_000, 300_000, 1_800_000], ignoreArrayIndexes: true, ignoreDefaultValues: true }],
      "lvi/no-empty": "error",
      "lvi/no-warning-comments": ["error", { terms: ["todo", "fixme", "hack", "workaround", "stopship", "xxx"] }],
      "lvi/no-leak-shape": "error",
      "lvi/no-env-fallback": "error",

      "no-empty": "off",
      "no-trailing-spaces": "off",
      "no-multiple-empty-lines": "off",
      "eol-last": "off",
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],
      "@stylistic/eol-last": "error",

      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // migrations are append-only history (no_retraction / monotonic-growth + invariant 4)
    // sub-feature splits break the runner's numeric ordering, so folder-limits doesn't apply here
    files: ["main/server/src/database/migrations/*/**/*.ts"],
    rules: {
      "lvi/folder-limits": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.*",
    ],
  },
);
