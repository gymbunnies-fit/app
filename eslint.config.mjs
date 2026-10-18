// Code checker: catches misspelled or unused names before they ship.
// Run: npx eslint js tools tests sw.js
import globals from "globals";
export default [
  { files: ["js/**/*.js", "sw.js"], languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser, ...globals.serviceworker, Chart: "readonly" } } },
  { files: ["tools/**/*.mjs", "tests/**/*.mjs"], languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node } } },
  { rules: { "no-undef": "error", "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }], "no-dupe-keys": "error", "no-unreachable": "error", "no-redeclare": "error", "no-self-assign": "error", "no-const-assign": "error", "no-import-assign": "error", "no-dupe-else-if": "error", "no-duplicate-case": "error" } },
];
