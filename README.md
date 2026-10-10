# Regular Expression Designer

A small TypeScript library for composing JavaScript regular expressions in a readable, reusable way.

## API

The library exposes a default factory and a `RegexDesigner` class. Each builder acts like a lazy regex composer: methods return template objects that render their pattern only when stringified (e.g. `toString()`) or invoked to compile to a native `RegExp`.

```ts
import createDesigner from '@regex-designer/js';

const r$ = createDesigner()
  .set('number', r$.qty([1, Infinity], /[0-9]/));
  .set('identifier', r$.qty([1, Infinity], /[a-z0-9-]/));

const template = r$.named(
  'version',
  r$.var('number'), /\./, r$.var('number'), /\./, r$.var('number'),
  r$.opt('-', r$.named('prerelease', r$.var('identifier'))),
);
const regex = template('i'); // Compile template by using it as a function
regex.test('12.3.4-beta-1'); // true
regex.exec('12.3.4-beta-1')?.groups; // { version: '12.3.4-beta-1', prerelease: 'beta-1' }
```

### tpl(...patterns)

```ts
tpl(...patterns: RegexValue[]): RegexTemplate
```

Concatenates pattern parts as-is, without adding grouping, alternation, or escaping:

```ts
r$.tpl('A', r$.raw('B.C')); // AB\\.C
```

### default

```ts
default function(): RegexDesigner
```

Examples:

```ts
import createDesigner from '@regex-designer/js';

const r$ = createDesigner();
r$.named('user', /[^@]+/, '@', /[a-z]+/); // (?<user>[^@]+@[a-z]+)
```

### or(...patterns)

```ts
or(...patterns: RegexValue[]): RegexTemplate
```

Examples:

```ts
r$.or('A', 'B');                     // A|B
r$.or(/foo/, 'bar', r$.raw('baz'));  // foo|bar|baz
```

### named(name, ...patterns)

```ts
named(name: string, ...patterns: RegexValue[]): RegexTemplate
```

Examples:

```ts
r$.named('value', 'A', 'B');            // (?<value>AB)
r$.named('word', r$.or('cat', 'dog'));  // (?<word>cat|dog)
```

### group(options, ...patterns)

```ts
group(options: GroupOptions, ...patterns: RegexValue[]): RegexTemplate
type GroupOptions = boolean | { name: string } | { capture: boolean };
```

Examples:

```ts
r$.group(false, 'A', 'B');              // (?:AB)
r$.group({ name: 'part' }, 'A', 'B');   // (?<part>AB)
r$.group({ capture: false }, 'A', 'B'); // (?:AB)
```

Options:

- `options` can be a boolean or an object.
- `true` creates a normal capturing group.
- `false` creates a non-capturing group.
- `group({ name: 'x' })` creates a named capturing group.
- `name` and `capture` are mutually exclusive; passing both throws a `TypeError`.

### opt(...patterns)

```ts
opt(...patterns: RegexValue[]): RegexTemplate
```

Examples:

```ts
r$.opt('C');                          // (?:C)?
r$.opt(r$.named('value', 'A', 'B'));  // (?:(?<value>AB))?
```

### qty(quantity, ...patterns)

```ts
qty(quantity: QuantityOptions, ...patterns: RegexValue[]): RegexTemplate
type QuantityOptions = number | [min: number, max?: number] | QuantityNamedOptions;
type QuantityNamedOptions = ({ exact: number } | { min: number; max?: number; }) & { greedy?: boolean };
```

Examples:

```ts
r$.qty(3, 'A', 'B');                                  // (?:AB){3}
r$.qty([1, 3], 'A', 'B');                             // (?:AB){1,3}
r$.qty({ min: 2, max: 5, greedy: false }, 'A', 'B');  // (?:AB){2,5}?
r$.qty({ exact: 2 }, 'A', 'B');                       // (?:AB){2}
```

Options:

- `number` means an exact repetition count.
- `[min, max?]` means a range, with `max` omitted for open-ended repetition.
- `{ exact }` is a shorthand for exact repetition.
- `{ min, max? }` creates a bounded repetition.
- `max` can be `Infinity` for open-ended repetition.
- `{ greedy?: boolean }` for lazy quantifiers.
- Quantifiers are greedy by default.

### raw(...strings)

```ts
raw(...patterns: string[]): RegexTemplate
```

Examples:

```ts
r$.raw('a.b', '*').source;    // a\.b\*
r$.raw('https://example.com') // https://example\.com
```

### ref(reference)

```ts
ref(reference: number | string): RegexTemplate
```

Examples:

```ts
// (B)\1
r$.tpl(
  r$.group(true, 'B'),
  r$.ref(1),
);

// (?<name>B)\k<name>
r$.tpl(
  r$.named('name', 'B'),
  r$.ref('name'),
);
```

### ahead(...patterns) / ahead_pos(...patterns) / ahead_neg(...patterns)

```ts
ahead(positive: boolean, ...patterns: RegexValue[]): RegexTemplate
ahead_pos(...patterns: RegexValue[]): RegexTemplate
ahead_neg(...patterns: RegexValue[]): RegexTemplate
```

Examples:

```ts
r$.ahead_pos('foo');  // (?=foo)
r$.ahead_neg('bar');  // (?!bar)
```

### behind(...patterns) / behind_pos(...patterns) / behind_neg(...patterns)

```ts
behind(positive: boolean, ...patterns: RegexValue[]): RegexTemplate
behind_pos(...patterns: RegexValue[]): RegexTemplate
behind_neg(...patterns: RegexValue[]): RegexTemplate
```

Examples:

```ts
r$.behind_pos('foo'); // (?<=foo)
r$.behind_neg('bar'); // (?<!bar)
```

### set(name, pattern) / var(name)

```ts
set(name: string, patterns: ...RegexValue[]): this
var(name: string): RegexTemplate
```

Examples:

```ts
r$.set('word', r$.or('cat', 'dog'));
r$.var('word'); // cat|dog
```

Options:

- `set()` stores a reusable pattern..
- `var()` resolves that pattern lazily when rendering.
- Variables are scoped to the builder instance, so separate builders can reuse the same names without conflict.
- Rendering an unset variable throws an error.
- Circular dependencies between variables also throw an error.

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
