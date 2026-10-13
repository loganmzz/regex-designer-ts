# Regular Expression Designer

TypeScript libraries for composing regular expressions in a readable, reusable way.

See:

* [`core`](./packages/core/): Common APIs
* [`js`](./packages/js/): native JavaScript implementation

## Development

See [AGENTS.md](AGENTS.md) for design choices and contribution conventions shared
by human contributors and AI coding assistants.

The project relies on Node.js 24.x:

```sh
npm ci
npm run check
```

The build emits ESM JavaScript, TypeScript declarations, and source maps in
`dist/`. Tests are written in TypeScript, type-checked, and executed with the
native Node.js test runner against the built library.
