# Contributor Guidelines

These guidelines apply to AI coding assistants and human contributors throughout
this repository. See [README.md](README.md) for the public API and usage examples.

## Design

- Keep this a small TypeScript library for composing native JavaScript regular
  expressions, with no runtime dependencies. Avoid introducing a separate regex
  engine or polyfills for older runtimes.
- Preserve the default factory, named exports, and public types in
  [src/index.ts](src/index.ts). Discuss breaking API changes explicitly.
- Templates are lazy and callable: `toString()` renders pattern text, while
  invoking a template compiles a native `RegExp`. Do not eagerly resolve nested
  templates or variables.
- Plain strings are regex syntax, not literal text. `raw()` escapes literal text
  using `RegExp.escape()`. Do not silently escape other pattern inputs.
- Preserve composition semantics: `tpl()` and `or()` do not add implicit groups;
  optional and quantified patterns use non-capturing groups.
- Preserve embedded `RegExp` flag handling: scope `i`, `m`, and `s` locally;
  require embedded `u` or `v` at compilation; do not inherit `d`, `g`, or `y`.
- Variables belong to a designer instance and resolve at render time. Keep
  missing-variable and circular-dependency detection, including cleanup after
  failed resolution.
- Express mutually exclusive options in public types and retain runtime
  validation for invalid inputs from JavaScript callers.
- Add JSDoc to exported API declarations so documentation is included in the
  generated declaration files.

## Code And Tests

- Use two spaces per indentation level in all files; do not use tabs.
  Keep changes focused rather than reformatting unrelated code.
- Reuse the existing rendering helpers and thin designer methods. Avoid adding
  abstractions or dependencies without a concrete need.
- Declare all dependencies with exact versions in [package.json](package.json),
  including development dependencies. Do not use version ranges (`^`, `~`,
  inequalities, or wildcards) or tags such as `latest`. Use `npm install
  --save-exact` when adding or updating dependencies and update the lockfile.
- Use Node's built-in `node:test` and `node:assert/strict` in the existing
  [test](test/) files. Tests import the built package as `@regex-designer/js`.
- For behavior changes, cover rendered text and compiled matching behavior where
  relevant, including flags, captures, invalid inputs, and lazy resolution.
- Update [README.md](README.md) and
  [test/documentation.test.ts](test/documentation.test.ts) together when public
  API examples or behavior change. Keep examples executable.
- Do not edit generated `dist/` output; rebuild it from TypeScript.

## Validation

- Use Node.js 24 or newer; [mise.toml](mise.toml) pins the development version.
  Install dependencies with `npm ci`.
- `npm run build` emits ESM JavaScript, declarations, and source maps.
- `npm run typecheck` builds the library and type-checks tests.
- For a focused test, build first, then run e.g.
  `node --test test/documentation.test.ts`.
- Validate all changes with `npm run check` before considering them complete:
  it runs ESLint, type checking, and all tests. Fix failures caused by your
  changes and report any checks that could not be run.