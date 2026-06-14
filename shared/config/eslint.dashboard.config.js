import js from "@eslint/js";
import tseslint from "typescript-eslint";
import css from "@eslint/css";
import stylistic from "@stylistic/eslint-plugin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const noDuplication = require("./eslint-rules/no-duplication.cjs");
const noMixedCssScopes = require("./eslint-rules/no-mixed-css-scopes.cjs");
const noSingleVarAlias = require("./eslint-rules/no-single-var-alias.cjs");
const noUnusedVars = require("./eslint-rules/no-unused-vars.cjs");
const fileLimits = require("./eslint-rules/file-limits.cjs");
const folderLimits = require("./eslint-rules/folder-limits.cjs");
const namingConventions = require("./eslint-rules/naming-conventions.cjs");
const noRegex = require("./eslint-rules/no-regex.cjs");
const noComments = require("./eslint-rules/no-comments.cjs");
const noConsole = require("./eslint-rules/no-console.cjs");
const requireDeepLink = require("./eslint-rules/require-deep-link.cjs");
const noCrossFileDuplication = require("./eslint-rules/no-cross-file-duplication.cjs");
const noRawDom = require("./eslint-rules/no-raw-dom.cjs");
const noRawAttrs = require("./eslint-rules/no-raw-attrs.cjs");
const requireComponent = require("./eslint-rules/require-component.cjs");
const requireAriaLabel = require("./eslint-rules/require-aria-label.cjs");
const requireStyleClass = require("./eslint-rules/require-style-class.cjs");
const preferLookupTable = require("./eslint-rules/prefer-lookup-table.cjs");
const noRawHandler = require("./eslint-rules/no-raw-handler.cjs");
const noRawEffect = require("./eslint-rules/no-raw-effect.cjs");
const noRawReactive = require("./eslint-rules/no-raw-reactive.cjs");
const noRawAnimation = require("./eslint-rules/no-raw-animation.cjs");
const noImperativeRoute = require("./eslint-rules/no-imperative-route.cjs");
const requireRsnTag = require("./eslint-rules/require-rsn-tag.cjs");
const noRawSizes = require("./eslint-rules/no-raw-sizes.cjs");
const noWhereSelector = require("./eslint-rules/no-where-selector.cjs");
const noUndefinedToken = require("./eslint-rules/no-undefined-token.cjs");
const noPixelatedImageRendering = require("./eslint-rules/no-pixelated-image-rendering.cjs");
const noRawRead = require("./eslint-rules/no-raw-read.cjs");
const noUndefinedColumn = require("./eslint-rules/no-undefined-column.cjs");
const requireContextMeta = require("./eslint-rules/require-context-meta.cjs");
const mirrorPages = require("./eslint-rules/mirror-pages.cjs");
const persistedSignalKeyLiteral = require("./eslint-rules/persisted-signal-key-literal.cjs");
const persistedSignalKeyShape = require("./eslint-rules/persisted-signal-key-shape.cjs");
const noDirectLocalstorage = require("./eslint-rules/no-direct-localstorage.cjs");
const noEffectRebuild = require("./eslint-rules/no-effect-rebuild.cjs");
const pagesMustRender = require("./eslint-rules/pages-must-render.cjs");
const stateNoRender = require("./eslint-rules/state-no-render.cjs");
const noInlineClasses = require("./eslint-rules/no-inline-classes.cjs");
const noBucketFiles = require("./eslint-rules/no-bucket-files.cjs");
const lviMaxParams = require("./eslint-rules/max-params.cjs");
const lviMaxDepth = require("./eslint-rules/max-depth.cjs");
const lviMaxLinesPerFunction = require("./eslint-rules/max-lines-per-function.cjs");
const lviNoEmpty = require("./eslint-rules/no-empty.cjs");
const lviNoMagicNumbers = require("./eslint-rules/no-magic-numbers.cjs");
const lviNoWarningComments = require("./eslint-rules/no-warning-comments.cjs");
const routeCssImport = require("./eslint-rules/route-css-import.cjs");
const noLeakShape = require("./eslint-rules/no-leak-shape.cjs");
const noEnvFallback = require("./eslint-rules/no-env-fallback.cjs");

export default tseslint.config(
  { files: ["**/*.{ts,tsx,js,mjs,cjs}"], ...js.configs.recommended },
  ...tseslint.configs.recommended.map((c) => ({
    ...c,
    files: c.files || ["**/*.{ts,tsx}"],
  })),
  {
    files: ["main/dashboard/src/**/*.ts"],
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
          "require-deep-link": requireDeepLink,
          "no-cross-file-duplication": noCrossFileDuplication,
          "no-raw-dom": noRawDom,
          "no-raw-attrs": noRawAttrs,
          "require-component": requireComponent,
          "require-aria-label": requireAriaLabel,
          "require-style-class": requireStyleClass,
          "prefer-lookup-table": preferLookupTable,
          "no-raw-handler": noRawHandler,
          "no-raw-effect": noRawEffect,
          "no-raw-reactive": noRawReactive,
          "no-raw-animation": noRawAnimation,
          "no-imperative-route": noImperativeRoute,
          "require-rsn-tag": requireRsnTag,
          "no-raw-read": noRawRead,
          "no-undefined-column": noUndefinedColumn,
          "require-context-meta": requireContextMeta,
          "mirror-pages": mirrorPages,
          "persisted-signal-key-literal": persistedSignalKeyLiteral,
          "persisted-signal-key-shape": persistedSignalKeyShape,
          "no-direct-localstorage": noDirectLocalstorage,
          "no-effect-rebuild": noEffectRebuild,
          "pages-must-render": pagesMustRender,
          "state-no-render": stateNoRender,
          "no-inline-classes": noInlineClasses,
          "no-bucket-files": noBucketFiles,
          "max-params": lviMaxParams,
          "max-depth": lviMaxDepth,
          "max-lines-per-function": lviMaxLinesPerFunction,
          "no-empty": lviNoEmpty,
          "no-magic-numbers": lviNoMagicNumbers,
          "no-warning-comments": lviNoWarningComments,
          "route-css-import": routeCssImport,
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
      "lvi/require-deep-link": "error",
      "lvi/no-raw-dom": "error",
      "lvi/no-raw-attrs": "error",
      "lvi/require-component": "error",
      "lvi/require-aria-label": "error",
      "lvi/require-style-class": "error",
      "lvi/prefer-lookup-table": "error",
      "lvi/no-raw-handler": "error",
      "lvi/no-raw-effect": "error",
      "lvi/no-raw-reactive": "error",
      "lvi/no-raw-animation": "error",
      "lvi/no-imperative-route": "error",
      "lvi/require-rsn-tag": "error",
      "lvi/no-raw-read": "error",
      "lvi/no-undefined-column": "error",
      "lvi/require-context-meta": "error",
      "lvi/mirror-pages": "error",
      "lvi/persisted-signal-key-literal": "error",
      "lvi/persisted-signal-key-shape": "error",
      "lvi/no-direct-localstorage": "error",
      "lvi/no-effect-rebuild": "error",
      "lvi/pages-must-render": "error",
      "lvi/state-no-render": "error",
      "lvi/no-inline-classes": "error",
      "lvi/no-bucket-files": "error",
      "lvi/max-params": ["error", { max: 4 }],
      "lvi/max-depth": ["error", { max: 3 }],
      "lvi/max-lines-per-function": ["error", { max: 25, skipBlankLines: true, skipComments: true }],
      "lvi/no-magic-numbers": ["error", { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true, ignoreDefaultValues: true }],
      "lvi/no-empty": "error",
      "lvi/no-warning-comments": ["error", { terms: ["todo", "fixme", "hack", "workaround", "stopship", "xxx"] }],
      "lvi/route-css-import": "error",
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
    files: ["main/dashboard/src/styles/**/*.css"],
    language: "css/css",
    plugins: {
      css,
      "lvi": {
        rules: {
          "no-mixed-css-scopes": noMixedCssScopes,
          "no-raw-sizes": noRawSizes,
          "no-single-var-alias": noSingleVarAlias,
          "no-where-selector": noWhereSelector,
          "no-undefined-token": noUndefinedToken,
          "no-pixelated-image-rendering": noPixelatedImageRendering,
          "mirror-pages": mirrorPages,
        },
      },
    },
    rules: {
      "lvi/mirror-pages": "error",
      "lvi/no-mixed-css-scopes": "error",
      "lvi/no-raw-sizes": "error",
      "lvi/no-single-var-alias": "error",
      "lvi/no-where-selector": "error",
      "lvi/no-undefined-token": "error",
      "lvi/no-pixelated-image-rendering": "error",

      "css/font-family-fallbacks": "error",
      "css/no-duplicate-imports": "error",
      "css/no-duplicate-keyframe-selectors": "error",
      "css/no-empty-blocks": "error",
      "css/no-important": "error",
      "css/no-invalid-at-rule-placement": "error",
      "css/no-invalid-at-rules": "error",
      "css/no-invalid-named-grid-areas": "error",
      "css/no-invalid-properties": ["error", { allowUnknownVariables: true }],
      "css/no-unmatchable-selectors": "error",
      "css/prefer-logical-properties": "error",
      "css/relative-font-units": ["error", { allowUnits: ["rem", "em", "%"] }],
      "css/use-baseline": "off",
      "css/use-layers": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.*",
      "main/dashboard/src/vite-env.d.ts",
      "main/dashboard/src/styles/auto-gen/**",
    ],
  },
);
