# Contributor Guidelines

These guidelines apply to AI coding assistants and human contributors throughout
this repository. See [README.md](README.md) for the public API and usage examples.

## Design

- Keep this a small TypeScript library for composing native JavaScript regular
  expressions, with no external runtime dependencies. Internal workspace
  packages are acceptable. Avoid introducing a separate regex engine or
  polyfills for older runtimes.
- Discuss breaking API changes explicitly.
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
  test files. Tests import the tested package by its full package name, not by
  path.
- For behavior changes, cover rendered text and compiled matching behavior where
  relevant, including flags, captures, invalid inputs, and lazy resolution.
- Include only public declarations tagged with `@readme` in README API sections;
  leave untagged exports such as `isRegexTemplate` out. For a new user-facing API,
  add `@readme <section heading>` to its JSDoc. Use the same heading to group
  related declarations (for example, `@readme start / end / whole`).
  Keep shared tags in core and implementation-specific tags in the implementation.
  Order groups by their first tagged declaration, with implementation-specific
  groups before shared groups. Manually update sections and ToCs when tags change;
  tags do not generate documentation or change exports.
- Document selected API additions and changes in [packages/core/README.md](packages/core/README.md)
  and applicable implementation READMEs. Keep core examples simple, without imports,
  designer creation, or expected output. In each implementation README, include
  the package import and designer creation in the first global API example; make
  method examples concrete with expected output, without repeating that setup.
  Write expected output as an unquoted trailing comment on the template
  expression, without calling `toString()`.
- Put a table of contents listing API methods immediately after the `## API`
  heading in each API README.
- Use template method names in API headings and ToCs, separating grouped methods
  with `/` (for example, `start / end / whole`) instead of category labels.
- Document each template method with a method-name heading, a code block of
  signatures, a brief description, and a code block of examples. For a section
  grouping multiple methods, summarize their combined usage instead of
  concatenating their JSDoc descriptions. For a single-method section, match the
  description to its JSDoc. For union-typed options, show each accepted
  method-signature variant and include examples covering the available variants.
  Omit `never` properties from documented signature variants.
- Update all README files and documentation tests together when public API
  examples or behavior change. Examples may assume an existing `r$` builder;
  keep implementation examples executable in that context.
- Keep the module-level JSDoc at the top of each `index.ts` synchronized verbatim
  with the introductory text paragraph in the corresponding README's `## API`
  section.
- Do not edit generated `dist/` output; rebuild it from TypeScript.

## Git

- Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages: `type(scope)!: description`. The scope and `!` are optional.
- Use `feat` for user-facing features and `fix` for bug fixes. Other useful types include `docs`, `test`, `refactor`, `build`, `ci`, and `chore`.
- Mark breaking changes with `!` after the type or scope, and describe the change in the commit body. A `BREAKING CHANGE:` footer may be used when more detail is needed.
- Keep the description concise and imperative; do not end it with a period.

## Validation

- Use Node.js 24 or newer; [mise.toml](mise.toml) pins the development version.
  Install dependencies with `npm ci`.
- `npm run build` emits ESM JavaScript, declarations, and source maps.
- For a focused test, build first, then run e.g.
  `node --test packages/js/test/documentation.test.ts`.
- Validate all changes with `npm run check` before considering them complete:
  it runs ESLint, type checking, and all tests. Fix failures caused by your
  changes and report any checks that could not be run.
- Before completing a task, check the resulting work against all applicable
  instructions in this file. Report any unmet requirements or non-compliance.
- For compliance reviews, assess the current repository and applicable commit
  history against these instructions. Report each issue with severity and
  location, distinguish existing issues from changes under review, and summarize
  the checks performed.
